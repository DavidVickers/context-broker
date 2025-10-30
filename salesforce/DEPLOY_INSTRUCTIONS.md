# Picklist Admin REST Service — End-to-End Implementation Guide

This document describes how to fully implement, configure, secure, deploy, and operate an Apex REST service that adds or removes picklist values by modifying metadata. It supports:

- Custom fields (local value sets and Global Value Sets) via Apex Metadata API
- Standard fields via a hybrid approach using a Named Credential and callouts to the Metadata/Tooling API

Follow all steps in order.

---

## 1. Overview

We will implement an Apex REST class `PicklistAdminRest` exposing:

- POST /services/apexrest/PicklistAdmin
  - Add a picklist value (supports optional placement and default flag)
- DELETE /services/apexrest/PicklistAdmin
  - Remove a picklist value
- GET /services/apexrest/PicklistAdmin?deploymentId=XYZ
  - Check status of async Apex Metadata deployments (custom fields and global value sets)

Behavior:

- Custom Field — Local Value Set: Uses Apex Metadata API to read/modify `CustomField.valueSet.valueSetDefinition.value`.
- Custom Field — Global Value Set: Uses Apex Metadata API to modify `GlobalValueSet.customValue`.
- Standard Field: Uses a Named Credential callout to invoke the Metadata/Tooling API to update Standard Value Sets (or other standard picklist metadata).

Notes and constraints:

- Apex Metadata API cannot directly modify standard fields. Hence the Named Credential hybrid approach.
- Synchronous REST calls enqueue an async metadata deployment. The client should poll with GET for status.
- Multi-Select Picklists are supported for custom fields (local/global value sets). Standard multi-select behavior depends on the standard value set capabilities.

---

## 2. Prerequisites

- Salesforce CLI installed (use `sf`, not `sfdx`).
- A Dev Hub and scratch org or a sandbox/production org for deployment.
- Profile/Permission Set for the running integration user:
  - “Modify All Data”
  - “Author Apex”
  - “Customize Application”
  - API Enabled
- Ensure Apex Metadata API is available (GA) in your org’s API version.
- The integration user must have permission to invoke Metadata API via the external method (Named Credential path).

---

## 3. Source Files to Add

Create the following files in your Salesforce DX project:

- force-app/main/default/classes/PicklistAdminRest.cls
- force-app/main/default/classes/PicklistAdminRest.cls-meta.xml
- force-app/main/default/classes/PicklistAdminRestTest.cls
- force-app/main/default/classes/PicklistAdminRestTest.cls-meta.xml

Content overview:

- PicklistAdminRest.cls
  - @RestResource(urlMapping='/PicklistAdmin/\*')
  - DTOs: ModifyRequest, ModifyResponse, StatusResponse
  - Methods: @HttpPost, @HttpDelete, @HttpGet (status)
  - Logic:
    - Validate request
    - Describe object/field, ensure picklist or multi-select
    - Detect custom vs standard by API name suffix (\_\_c)
    - For custom fields:
      - Read CustomField metadata to determine local vs global value set
      - Build Metadata.DeployContainer and enqueue changes
      - Return deploymentId
    - For standard fields:
      - Validate Named Credential provided
      - Callout to external endpoint (Named Credential) that performs a Metadata API deploy for StandardValueSet changes
- PicklistAdminRest.cls-meta.xml
  - Set apiVersion (e.g., 61.0+) and isExposed=true
- PicklistAdminRestTest.cls
  - Test happy paths for:
    - Custom field local value set ADD/REMOVE (mock Metadata.Operations)
    - Custom field global value set ADD/REMOVE (mock Metadata.Operations)
    - Standard field request returns appropriate error without Named Credential integration mocked
  - Negative tests (invalid inputs)
- PicklistAdminRestTest.cls-meta.xml

Tip: If you prefer, you can stage these files in a feature branch.

---

## 4. Named Credential (for Standard Fields)

Standard field picklists must be updated via Metadata/Tooling API using an authenticated integration. Recommended approach:

A. Create a Named Credential (OAuth 2.0)

- Setup > Named Credentials > New
- Type: Named Principal
- Authentication Protocol: OAuth 2.0
- Scope: full refresh_token offline_access
- Token Endpoint: Your Salesforce login URL, e.g., https://login.salesforce.com/services/oauth2/token (or My Domain)
- URL: Base URL for the target org REST API, e.g., https://mydomain.my.salesforce.com
- Generate/authorize with an admin integration user.

B. External Endpoint Contract
You have two options for the remote action:

1. A companion Apex REST in the target org that accepts an instruction payload to add/remove standard picklist values and performs a Metadata API deploy server-side; or
2. Directly call the Salesforce Metadata REST API / SOAP from Apex via callout (more complex to implement entirely in Apex due to ZIP packaging and SOAP envelope construction).

Recommended: Implement a lightweight Apex REST “StandardValueSetAdmin” in the target org that:

- Accepts payload:
  - operation: ADD | REMOVE
  - value
  - standardValueSetName (e.g., CaseOrigin, LeadStatus, etc.)
  - position (FIRST/LAST/BEFORE:X/AFTER:X)
  - isDefault
- Performs:
  - Read existing StandardValueSet via Metadata API
  - Build and deploy ZIP (StandardValueSet metadata)
  - Returns an async deployment Id and endpoint to poll for status (or returns final result if synchronous is possible)
- Security: Restrict via a Permission Set and assign only to the integration user used by the Named Credential.

C. Store Named Credential Name

- The client request should include “namedCredential”: “My_SF_Metadata_NC”.
- The Apex service will use HttpRequest.setEndpoint('callout:My_SF_Metadata_NC/...') to invoke the remote.

---

## 5. Request/Response Schemas

POST /services/apexrest/PicklistAdmin

- Body JSON:
  {
  "objectApiName": "Form_Submission**c",
  "fieldApiName": "Status**c",
  "value": "New Value",
  "operation": "ADD",
  "isDefault": false,
  "position": "LAST", // or "FIRST", "BEFORE:Existing", "AFTER:Existing"
  "namedCredential": "My_SF_Metadata_NC" // Required if standard field
  }

DELETE /services/apexrest/PicklistAdmin

- Body JSON:
  {
  "objectApiName": "Form_Submission**c",
  "fieldApiName": "Status**c",
  "value": "Old Value",
  "operation": "REMOVE",
  "namedCredential": "My_SF_Metadata_NC" // Required if standard field
  }

GET /services/apexrest/PicklistAdmin?deploymentId=XYZ

- Response for deployments initiated by Apex Metadata:
  {
  "status": "SUCCEEDED|FAILED|IN_PROGRESS|ERROR",
  "message": "State=...",
  "stateDetail": "...",
  "errorText": "Message if available"
  }

Response (POST/DELETE):

- On custom field:
  {
  "status": "ACCEPTED",
  "message": "Custom field local/global value set update enqueued",
  "deploymentId": "0Af...XYZ",
  "path": "CUSTOM_LOCAL|CUSTOM_GLOBAL"
  }
- On standard field:
  - If remote endpoint implemented:
    {
    "status": "ACCEPTED",
    "message": "Standard field update requested",
    "deploymentId": "Returned-by-remote",
    "path": "STANDARD"
    }
  - If remote endpoint not implemented:
    {
    "status": "ERROR",
    "message": "Standard field picklist changes require external Metadata API via Named Credential..."
    }

---

## 6. Permissions and Security

- Create a Permission Set “Picklist_Admin_API”:
  - Apex Class Access: PicklistAdminRest
  - Custom Permission (optional): MANAGE_PICKLISTS_VIA_API
- Assign the Permission Set to the integration user.
- Optionally enforce a custom permission check in the Apex service.
- IP Restrictions: Consider restricting profile login IPs and/or Named Credential “Enforce TLS cert” settings.
- Named Credential should be visible only to admins/integration profile.

---

## 7. Implementation Notes (Apex Metadata Path)

- Use `Metadata.Operations.readMetadata` to read current `CustomField` and `GlobalValueSet` metadata.
- For local value sets:
  - Modify `CustomField.valueSet.valueSetDefinition.value` (List<Metadata.CustomValue>)
- For global value sets:
  - Modify `GlobalValueSet.customValue` (List<Metadata.CustomValue>)
- Enqueue deployment with `Metadata.Operations.enqueueDeployment(container, request)`.
- Poll with GET to check status (no blocking long polls inside POST/DELETE).
- Preserve existing values and their order unless changed by “position”.
- Ensure uniqueness of `fullName` (the picklist API name for each value).

---

## 8. Implementation Notes (Standard Fields via Named Credential)

- Determine value set used by the standard field:
  - Many standard fields map to a StandardValueSet (e.g., CaseOrigin, CaseReason, LeadSource, OpportunityStage, etc.).
  - Some are object-specific metadata; consult Metadata Coverage.
- Build an instruction to your remote handler:
  - Inputs: standardValueSetName, operation, value, isDefault, position
  - The remote handler:
    - Reads existing StandardValueSet metadata
    - Applies add/remove with ordering
    - Deploys via Metadata API (creates a .zip with a `standardValueSets/StandardValueSetName.standardValueSet` file and `package.xml`)
    - Returns async id to poll (and a status endpoint)
- Your Apex service should:
  - Validate `namedCredential` is provided for standard field requests
  - POST to `callout:{NC}/services/apexrest/StandardValueSetAdmin` (or your chosen endpoint)
  - Relay the returned deployment id and message

Security reminder:

- Do not echo raw error details to clients; log internally (e.g., Platform Events or debug logs) and return sanitized messages.

---

## 9. Error Handling

- Input validation errors return status=ERROR with message.
- Unsupported combination (e.g., missing Named Credential for standard field) returns status=ERROR.
- For deployments, store and return `deploymentId` for client-side polling.
- Include aggregated `componentFailures` messages in GET status response when possible.

---

## 10. Tests

- Create meaningful unit tests that:
  - Mock Metadata.Operations (use fakes/stubs to simulate readMetadata and enqueueDeployment)
  - Validate add/remove on local value set
  - Validate add/remove on global value set
  - Validate handling of invalid inputs (blank fields, wrong operation)
  - Validate standard field path without Named Credential returns a clear error
- Aim for >85% coverage for the REST class.

---

## 11. Deployment Steps

Use Salesforce CLI (sf):

1. Authorize org

- Scratch: `sf org create scratch -d -f config/project-scratch-def.json -a picklist-admin`
- Sandbox/Prod: `sf org login web -a myTargetOrg`

2. Push/Deploy metadata

- Scratch: `sf project deploy start -o picklist-admin`
- Sandbox/Prod: `sf project deploy start -o myTargetOrg`

3. Assign permission set (if created)

- `sf org assign permset -n Picklist_Admin_API -o myTargetOrg`

4. Create/Authorize Named Credential in target org UI (cannot deploy OAuth tokens):

- Setup > Named Credentials > New
- Name it: My_SF_Metadata_NC
- Complete OAuth flow

5. If using a remote handler org, deploy its handler too and authorize its Named Credential.

---

## 12. Operational Runbook

- To add a value (custom/local):

  - POST body:
    {
    "objectApiName": "MyObject**c",
    "fieldApiName": "MyPicklist**c",
    "value": "New Option",
    "operation": "ADD",
    "isDefault": false,
    "position": "LAST"
    }
  - Response includes deploymentId; poll GET with deploymentId until SUCCEEDED.

- To remove a value:

  - DELETE body:
    {
    "objectApiName": "MyObject**c",
    "fieldApiName": "MyPicklist**c",
    "value": "Old Option",
    "operation": "REMOVE"
    }

- For standard fields:

  - Include "namedCredential": "My_SF_Metadata_NC"
  - Ensure the remote handler is deployed and accessible.

- After success:
  - Consider cache impacts: describe metadata may take a short time to reflect.
  - User profiles/record types may require value visibility updates if applicable (not covered here).

---

## 13. Security and Compliance

- Restrict access to the REST resource via Profiles/Permission Sets.
- Consider an allowlist of objects/fields inside Apex to prevent arbitrary metadata edits.
- Audit:
  - Log requests and results using Platform Events or Custom Object for traceability.
  - Include who invoked the API and the operation performed.

---

## 14. Extensibility

- Add support to set value colors (if Salesforce supports in your API version for certain value sets).
- Add endpoint to list current picklist values and where used (record types dependencies not covered here).
- Add dependency handling for controlling fields and record types.
- Add rate limiting / governor safety checks (batch operations).

---

## 15. Troubleshooting

- Error: “Field is not a picklist” — Confirm field type.
- Error: “Standard field requires Named Credential” — Provide the Named Credential name and ensure remote handler exists.
- Deploy failures:
  - Check GET status for componentFailures.
  - Validate user permissions and API version.
- Global Value Set name mismatches:
  - Confirm the field actually references a GVS; otherwise update local.

---

## 16. Appendix

A. Example Package.xml for a StandardValueSet deploy

- Types:
  - name: StandardValueSet
  - members: CaseOrigin (example)
- version: your org API version

B. Example StandardValueSet metadata file path

- standardValueSets/CaseOrigin.standardValueSet

C. Common StandardValueSet names

- CaseOrigin, CaseReason, CaseStatus, LeadSource, LeadStatus, OpportunityStage, TaskPriority, TaskStatus, etc.
- Verify latest list in Salesforce Metadata Coverage.

---

By following the steps above, you will have a secure, maintainable REST service to manage picklist values across custom and standard fields with appropriate governance and auditability.
