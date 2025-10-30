# Available Salesforce Objects - Local Metadata Reference

This document lists all Salesforce object metadata files available locally in the repository.

## Custom Objects (Project-Specific)

### 1. Form_Definition__c
**Path**: `salesforce/force-app/main/default/objects/Form_Definition__c/Form_Definition__c.object-meta.xml`

**Fields**:
- `Form_Id__c` (Text, 255, Required, Unique) - Form identifier
- `Fields_JSON__c` (LongTextArea, 131072) - Form field definitions in JSON
- `Mapping_Rules__c` (LongTextArea, 131072) - Field mapping rules in JSON
- `Active__c` (Checkbox, Default: true) - Whether form is active
- `Agent_Config__c` (LongTextArea, 131072) - Agent configuration in JSON

**Used for**: Form definitions, field schemas, mapping rules

---

### 2. Form_Submission__c
**Path**: `salesforce/force-app/main/default/objects/Form_Submission__c/Form_Submission__c.object-meta.xml`

**Fields**:
- `Form_Definition__c` (MasterDetail, Reference: Form_Definition__c) - Links to form definition
- `Form_Id__c` (Text, 255) - Form identifier (for querying)
- `Submission_Data__c` (LongTextArea, 131072) - Full form submission data in JSON
- `Status__c` (Picklist: Submitted, Processed, Error) - Submission status
- `Submitted_At__c` (DateTime) - When form was submitted
- `Session_ID__c` (Text, 255) - Session identifier (UUID)
- `Context_ID__c` (Text, 255, Unique, External ID, Case Sensitive) - Context identifier `{formId}:{sessionId}`
- `Related_Record_Id__c` (Text, 18) - ID of related business record (Lead, Case, etc.)
- `Related_Object_Type__c` (Text, 50) - Type of related record (Lead, Case, etc.)
- `Adjunct_Data__c` (LongTextArea, 131072) - Optional metadata/JSON
- `Processed_At__c` (DateTime) - When submission was processed

**Used for**: Form submission tracking, linking to business objects

---

### 3. Form_Submission_Relationship__c
**Path**: `salesforce/force-app/main/default/objects/Form_Submission_Relationship__c/Form_Submission_Relationship__c.object-meta.xml`

**Fields**:
- `Form_Submission__c` (MasterDetail, Reference: Form_Submission__c) - Links to form submission
- `Related_Record_Id__c` (Text, 18) - ID of related business record
- `Related_Object_Type__c` (Text, 50) - Type of related record

**Used for**: Junction object linking form submissions to business objects (Leads, Cases, Contacts, etc.)

---

## Standard Objects (With Custom Fields)

### 4. Account
**Path**: `salesforce/force-app/main/default/objects/Account/Account.object-meta.xml`

**Custom Fields Available**: Many custom fields including:
- `AccountManager__c`
- `AnnualSpend__c`
- `CompanySize__c`
- `CreditLimit__c`
- `FleetSize__c`
- `LoyaltyTier__c`
- `PaymentTerms__c`
- And many more...

**Used for**: Business accounts, companies, organizations

---

### 5. Lead
**Path**: `salesforce/force-app/main/default/objects/Lead/Lead.object-meta.xml`

**Custom Fields Available**: 29 custom fields (see fields directory)

**Used for**: Lead management (primary use case for form submissions)

---

### 6. Contact
**Path**: `salesforce/force-app/main/default/objects/Contact/Contact.object-meta.xml`

**Custom Fields Available**: 42 custom fields (see fields directory)

**Used for**: Contact management, relationships

---

### 7. Case
**Path**: `salesforce/force-app/main/default/objects/Case/Case.object-meta.xml`

**Custom Fields Available**: 41 custom fields (see fields directory)

**Used for**: Case management, support tickets

---

## Quick Reference for Code

### Common Field Names Used in Code:
- **Form_Submission__c**: `Form_Definition__c`, `Form_Id__c`, `Submission_Data__c`, `Status__c`, `Submitted_At__c`, `Session_ID__c`, `Context_ID__c`
- **Form_Submission_Relationship__c**: `Form_Submission__c`, `Related_Record_Id__c`, `Related_Object_Type__c`
- **Form_Definition__c**: `Form_Id__c`, `Fields_JSON__c`, `Mapping_Rules__c`, `Active__c`, `Agent_Config__c`

### Standard Object Fields (Lead):
- `FirstName`, `LastName`, `Email`, `Phone`, `Company` (required for Leads)

---

## Notes

- All custom objects use `__c` suffix
- MasterDetail relationships require the parent object to exist
- Always check local metadata before assuming fields exist in Salesforce
- Metadata files are in: `salesforce/force-app/main/default/objects/{ObjectName}/`
