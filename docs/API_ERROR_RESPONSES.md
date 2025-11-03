# API Error Response Documentation

**Version**: 1.0  
**Last Updated**: 2025-01-XX

## Overview

All API endpoints return standardized error responses with consistent structure, error types, and actionable troubleshooting guidance.

## Standard Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "type": "ERROR_TYPE",
    "code": "ERROR_TYPE",
    "message": "Human-readable error message",
    "details": "Detailed error description (optional)",
    "context": {
      "formId": "contact-form-v1",
      "sessionId": "550e8400-...",
      "contextId": "contact-form-v1:550e8400-...",
      "objectType": "Lead",
      "field": "Email",
      "salesforceErrorCode": "INVALID_FIELD",
      "salesforceStatusCode": 400,
      "[key]": "any additional context"
    },
    "guidance": "Actionable guidance for resolving the error",
    "troubleshooting": [
      "Step 1: Check...",
      "Step 2: Verify...",
      "Step 3: Ensure..."
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

## Error Types

### Validation Errors (400 Bad Request)

#### `VALIDATION_ERROR`
**HTTP Status**: 400  
**When**: Generic validation failure  
**Example**:
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for email: Invalid email format",
    "details": "Invalid email format",
    "context": {
      "field": "email",
      "value": "invalid-email"
    },
    "guidance": "Provide a valid value for email that meets the validation requirements.",
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `INVALID_CONTEXT_ID`
**HTTP Status**: 400  
**When**: Context ID format is invalid  
**Example**:
```json
{
  "error": {
    "type": "INVALID_CONTEXT_ID",
    "code": "INVALID_CONTEXT_ID",
    "message": "Invalid Context ID format: contact-form-v1:invalid-uuid",
    "details": "Context ID must be in format 'formId:sessionId' where sessionId is a valid UUID v4",
    "context": {
      "contextId": "contact-form-v1:invalid-uuid",
      "reason": "Invalid format - must be formId:sessionId"
    },
    "guidance": "Generate a new Context ID with format {formId}:{uuid}",
    "troubleshooting": [
      "Context ID format: {formId}:{uuid}",
      "Example: \"contact-form:550e8400-e29b-41d4-a716-446655440000\"",
      "Ensure sessionId is a valid UUID v4",
      "Check formId matches the form you are submitting to"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `INVALID_FORM_ID`
**HTTP Status**: 400  
**When**: Form ID format or value is invalid

#### `INVALID_SESSION_ID`
**HTTP Status**: 400  
**When**: Session ID format or value is invalid

---

### Not Found Errors (404 Not Found)

#### `FORM_NOT_FOUND`
**HTTP Status**: 404  
**When**: Form definition not found in Salesforce  
**Example**:
```json
{
  "error": {
    "type": "FORM_NOT_FOUND",
    "code": "FORM_NOT_FOUND",
    "message": "Form definition not found: contact-form-v1",
    "details": "No Form_Definition__c record found with Form_Id__c = 'contact-form-v1' or Name = 'contact-form-v1'",
    "context": {
      "formId": "contact-form-v1",
      "queryType": "unauthenticated"
    },
    "guidance": "Create a Form_Definition__c record in Salesforce with the specified Form_Id__c, or check the formId for typos.",
    "troubleshooting": [
      "Verify Form_Definition__c record exists with Form_Id__c = 'contact-form-v1'",
      "Check Form_Definition__c.Active__c = true",
      "Ensure Form_Id__c matches exactly (case-sensitive)",
      "Verify service account has Read access to Form_Definition__c object",
      "Check broker logs for Salesforce query errors"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

**Common Causes**:
- Form_Definition__c record doesn't exist
- Form_Id__c typo (case-sensitive)
- Form_Definition__c.Active__c = false
- Service account lacks Read permission
- Salesforce API connectivity issue

#### `SESSION_NOT_FOUND`
**HTTP Status**: 404  
**When**: Session not found or expired  
**Example**:
```json
{
  "error": {
    "type": "SESSION_NOT_FOUND",
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found or expired: 550e8400-e29b-41d4-a716-446655440000",
    "details": "Session may have expired (24-hour TTL) or was never created",
    "context": {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "contextId": "contact-form-v1:550e8400-e29b-41d4-a716-446655440000"
    },
    "guidance": "Create a new session by calling POST /api/sessions with your formId",
    "troubleshooting": [
      "Sessions expire after 24 hours of inactivity",
      "Create a new session if the existing one expired",
      "Verify sessionId was generated correctly on form load",
      "Check broker session storage (should use Redis in production)"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

### Salesforce API Errors (502 Bad Gateway, 503 Service Unavailable)

#### `SALESFORCE_CONNECTION_ERROR`
**HTTP Status**: 503  
**When**: Cannot connect to Salesforce API  
**Example**:
```json
{
  "error": {
    "type": "SALESFORCE_CONNECTION_ERROR",
    "code": "SALESFORCE_CONNECTION_ERROR",
    "message": "Salesforce connection unavailable for submit form",
    "details": "No valid Salesforce connection could be established",
    "context": {
      "formId": "contact-form-v1",
      "contextId": "contact-form-v1:550e8400-...",
      "operation": "form submission"
    },
    "guidance": "Ensure Salesforce credentials are configured and service account is authenticated.",
    "troubleshooting": [
      "Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env",
      "Complete OAuth flow: /oauth/authorize?contextId=service_account",
      "Check broker logs for authentication errors",
      "Verify service account has valid refresh token stored",
      "Try re-initializing Salesforce connection"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

**Common Causes**:
- Missing Salesforce credentials in .env
- OAuth flow not completed
- Network connectivity issues
- Salesforce instance down
- Firewall/proxy blocking connections

#### `SALESFORCE_AUTH_ERROR`
**HTTP Status**: 401  
**When**: Salesforce authentication failed  
**Example**:
```json
{
  "error": {
    "type": "SALESFORCE_AUTH_ERROR",
    "code": "SALESFORCE_AUTH_ERROR",
    "message": "Salesforce authentication failed",
    "details": "Invalid credentials or expired token",
    "context": {
      "formId": "contact-form-v1",
      "salesforceErrorCode": "INVALID_LOGIN",
      "salesforceStatusCode": 401
    },
    "guidance": "Salesforce authentication failed. Check broker credentials and OAuth configuration.",
    "troubleshooting": [
      "Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env",
      "Check OAuth Connected App settings in Salesforce",
      "Ensure service account has valid refresh token",
      "Try re-authenticating: /oauth/authorize?contextId=service_account"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `SALESFORCE_QUERY_ERROR`
**HTTP Status**: 502  
**When**: Salesforce query failed  
**Example**:
```json
{
  "error": {
    "type": "SALESFORCE_QUERY_ERROR",
    "code": "SALESFORCE_QUERY_ERROR",
    "message": "Salesforce query failed: query Form_Definition__c",
    "details": "MALFORMED_QUERY: Unexpected token: FROM",
    "context": {
      "formId": "contact-form-v1",
      "salesforceErrorCode": "MALFORMED_QUERY",
      "salesforceStatusCode": 400
    },
    "guidance": "Salesforce query failed: MALFORMED_QUERY: Unexpected token: FROM",
    "troubleshooting": [
      "Verify object and field names exist in Salesforce",
      "Check SOQL syntax for errors",
      "Ensure service account has Read access to queried objects"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `SALESFORCE_CREATE_ERROR`
**HTTP Status**: 502  
**When**: Salesforce record creation failed  
**Example**:
```json
{
  "error": {
    "type": "SALESFORCE_CREATE_ERROR",
    "code": "SALESFORCE_CREATE_ERROR",
    "message": "Failed to create record in Salesforce: Lead creation failed",
    "details": "REQUIRED_FIELD_MISSING: Required fields are missing: [LastName]",
    "context": {
      "formId": "contact-form-v1",
      "objectType": "Lead",
      "salesforceErrorCode": "REQUIRED_FIELD_MISSING",
      "salesforceStatusCode": 400
    },
    "guidance": "Failed to create record in Salesforce: REQUIRED_FIELD_MISSING: Required fields are missing: [LastName]",
    "troubleshooting": [
      "Check Mapping_Rules__c field mappings are correct",
      "Verify required fields are included in fieldMappings",
      "Ensure mapped fields exist and are accessible",
      "Verify Lead object exists and service account has Create permission"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `SALESFORCE_PERMISSION_ERROR`
**HTTP Status**: 403  
**When**: Insufficient permissions in Salesforce  
**Example**:
```json
{
  "error": {
    "type": "SALESFORCE_PERMISSION_ERROR",
    "code": "SALESFORCE_PERMISSION_ERROR",
    "message": "Insufficient permissions to create Lead in Salesforce.",
    "details": "INSUFFICIENT_ACCESS: You do not have permission to create Lead records",
    "context": {
      "formId": "contact-form-v1",
      "objectType": "Lead",
      "salesforceErrorCode": "INSUFFICIENT_ACCESS",
      "salesforceStatusCode": 403
    },
    "guidance": "Insufficient permissions to create Lead in Salesforce.",
    "troubleshooting": [
      "Verify service account profile has required object/field permissions",
      "Check Field-Level Security (FLS) settings for referenced fields",
      "Ensure service account has Read/Edit access to Form_Definition__c",
      "Verify service account has Create/Edit access to Lead"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

### Configuration Errors (400 Bad Request)

#### `PARSING_ERROR`
**HTTP Status**: 400  
**When**: Failed to parse JSON configuration  
**Example**:
```json
{
  "error": {
    "type": "PARSING_ERROR",
    "code": "PARSING_ERROR",
    "message": "Failed to parse Mapping_Rules__c for form: contact-form-v1",
    "details": "Unexpected token } in JSON at position 42",
    "context": {
      "formId": "contact-form-v1",
      "recordId": "a0RW4000003XuMfMAK",
      "field": "Mapping_Rules__c",
      "parseError": "Unexpected token } in JSON at position 42"
    },
    "guidance": "Fix the JSON syntax in Form_Definition__c.Mapping_Rules__c field",
    "troubleshooting": [
      "Verify Mapping_Rules__c is valid JSON",
      "Check for missing quotes, brackets, or commas",
      "Ensure fieldMappings object structure is correct",
      "Validate conditionalMappings format if used",
      "Test JSON with a JSON validator tool"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

#### `CONFIGURATION_ERROR`
**HTTP Status**: 400  
**When**: Configuration is invalid or missing  
**Example**:
```json
{
  "error": {
    "type": "CONFIGURATION_ERROR",
    "code": "CONFIGURATION_ERROR",
    "message": "Missing field mappings for form: contact-form-v1",
    "details": "Form fields [phone, address] have no mapping to Lead fields",
    "context": {
      "formId": "contact-form-v1",
      "targetObject": "Lead",
      "unmappedFields": ["phone", "address"]
    },
    "guidance": "Add field mappings to Form_Definition__c.Mapping_Rules__c.fieldMappings for the unmapped fields",
    "troubleshooting": [
      "Update Mapping_Rules__c with mappings for: phone, address",
      "Verify Lead has corresponding fields",
      "Check Field-Level Security allows service account to write to mapped fields",
      "Ensure field API names are correct (case-sensitive)"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

### Internal Errors (500 Internal Server Error)

#### `INTERNAL_ERROR`
**HTTP Status**: 500  
**When**: Generic internal server error  
**Example**:
```json
{
  "error": {
    "type": "INTERNAL_ERROR",
    "code": "INTERNAL_ERROR",
    "message": "Failed to submit form: contact-form-v1",
    "details": "Cannot read property 'id' of undefined",
    "context": {
      "formId": "contact-form-v1",
      "contextId": "contact-form-v1:550e8400-..."
    },
    "guidance": "Check broker logs for detailed error information",
    "troubleshooting": [
      "Verify form definition exists in Salesforce",
      "Check Mapping_Rules__c configuration",
      "Verify Salesforce connection is available",
      "Review broker logs for detailed error stack trace"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

## Error Response by Endpoint

### `GET /api/forms/:formId`

**Possible Errors**:
- `FORM_NOT_FOUND` (404) - Form definition doesn't exist
- `SALESFORCE_CONNECTION_ERROR` (503) - Cannot connect to Salesforce
- `SALESFORCE_AUTH_ERROR` (401) - Authentication failed
- `SALESFORCE_QUERY_ERROR` (502) - Query syntax error or object doesn't exist
- `PARSING_ERROR` (400) - Invalid JSON in Fields_JSON__c, Mapping_Rules__c, or Agent_Config__c
- `INTERNAL_ERROR` (500) - Unexpected error

**Example - Form Not Found**:
```bash
curl -X GET "http://localhost:3001/api/forms/contact-form-v1"
```

```json
{
  "error": {
    "type": "FORM_NOT_FOUND",
    "code": "FORM_NOT_FOUND",
    "message": "Form definition not found: contact-form-v1",
    "context": {
      "formId": "contact-form-v1",
      "queryType": "unauthenticated"
    },
    "troubleshooting": [
      "Verify Form_Definition__c record exists with Form_Id__c = 'contact-form-v1'",
      "Check Form_Definition__c.Active__c = true",
      "Ensure Form_Id__c matches exactly (case-sensitive)"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

**Example - Salesforce Connection Error**:
```json
{
  "error": {
    "type": "SALESFORCE_CONNECTION_ERROR",
    "code": "SALESFORCE_CONNECTION_ERROR",
    "message": "Salesforce connection unavailable for fetch form definition",
    "context": {
      "formId": "contact-form-v1"
    },
    "troubleshooting": [
      "Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env",
      "Complete OAuth flow: /oauth/authorize?contextId=service_account",
      "Check broker logs for authentication errors"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

### `POST /api/forms/:formId/submit`

**Possible Errors**:
- `INVALID_CONTEXT_ID` (400) - Context ID format invalid
- `SESSION_NOT_FOUND` (404) - Session expired or doesn't exist
- `VALIDATION_ERROR` (400) - Form ID mismatch between URL and contextId
- `FORM_NOT_FOUND` (404) - Form definition doesn't exist
- `PARSING_ERROR` (400) - Invalid Mapping_Rules__c JSON
- `CONFIGURATION_ERROR` (400) - Missing field mappings
- `SALESFORCE_CONNECTION_ERROR` (503) - Cannot connect to Salesforce
- `SALESFORCE_AUTH_ERROR` (401) - Authentication failed
- `SALESFORCE_CREATE_ERROR` (502) - Record creation failed
- `SALESFORCE_PERMISSION_ERROR` (403) - Insufficient permissions
- `INTERNAL_ERROR` (500) - Unexpected error

**Example - Invalid Context ID**:
```bash
curl -X POST "http://localhost:3001/api/forms/contact-form-v1/submit" \
  -H "Content-Type: application/json" \
  -d '{"contextId": "invalid-context-id", "formData": {"email": "test@example.com"}}'
```

```json
{
  "error": {
    "type": "INVALID_CONTEXT_ID",
    "code": "INVALID_CONTEXT_ID",
    "message": "Invalid Context ID format: invalid-context-id",
    "context": {
      "contextId": "invalid-context-id",
      "reason": "Invalid format - must be formId:sessionId"
    },
    "troubleshooting": [
      "Context ID format: {formId}:{uuid}",
      "Example: \"contact-form:550e8400-e29b-41d4-a716-446655440000\"",
      "Ensure sessionId is a valid UUID v4"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

**Example - Missing Field Mappings**:
```json
{
  "error": {
    "type": "CONFIGURATION_ERROR",
    "code": "CONFIGURATION_ERROR",
    "message": "Missing field mappings for form: contact-form-v1",
    "details": "Form fields [phone, address] have no mapping to Lead fields",
    "context": {
      "formId": "contact-form-v1",
      "targetObject": "Lead",
      "unmappedFields": ["phone", "address"]
    },
    "troubleshooting": [
      "Update Mapping_Rules__c with mappings for: phone, address",
      "Verify Lead has corresponding fields",
      "Check Field-Level Security allows service account to write to mapped fields"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

**Example - Salesforce Permission Error**:
```json
{
  "error": {
    "type": "SALESFORCE_PERMISSION_ERROR",
    "code": "SALESFORCE_PERMISSION_ERROR",
    "message": "Insufficient permissions to create Lead in Salesforce.",
    "context": {
      "formId": "contact-form-v1",
      "objectType": "Lead",
      "salesforceErrorCode": "INSUFFICIENT_ACCESS",
      "salesforceStatusCode": 403
    },
    "troubleshooting": [
      "Verify service account profile has required object/field permissions",
      "Check Field-Level Security (FLS) settings for referenced fields",
      "Ensure service account has Create/Edit access to Lead"
    ],
    "timestamp": "2025-01-XXT12:00:00.000Z"
  }
}
```

---

### `POST /api/sessions`

**Possible Errors**:
- `VALIDATION_ERROR` (400) - Form ID is required or invalid
- `INTERNAL_ERROR` (500) - Unexpected error

---

### `GET /api/sessions/:sessionId`

**Possible Errors**:
- `SESSION_NOT_FOUND` (404) - Session expired or doesn't exist
- `INTERNAL_ERROR` (500) - Unexpected error

---

### `POST /api/forms/:formId/agent/query`

**Possible Errors**:
- `VALIDATION_ERROR` (400) - Context ID is required
- `INVALID_CONTEXT_ID` (400) - Context ID format invalid
- `SESSION_NOT_FOUND` (404) - Session expired or doesn't exist
- `INTERNAL_ERROR` (500) - Unexpected error

---

## Error Handling Best Practices

### Client-Side Error Handling

```typescript
try {
  const response = await fetch('/api/forms/contact-form-v1/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextId, formData })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    
    // Handle specific error types
    switch (errorData.error.type) {
      case 'FORM_NOT_FOUND':
        console.error('Form not found:', errorData.error.context.formId);
        // Show user-friendly message
        break;
      
      case 'SALESFORCE_CONNECTION_ERROR':
        console.error('Salesforce connection error');
        // Retry after delay or show connection error message
        break;
      
      case 'VALIDATION_ERROR':
        console.error('Validation error:', errorData.error.context.field);
        // Show field-specific error to user
        break;
      
      default:
        console.error('Unexpected error:', errorData.error);
    }
    
    // Display troubleshooting steps to user
    if (errorData.error.troubleshooting) {
      console.log('Troubleshooting steps:', errorData.error.troubleshooting);
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### Server-Side Error Logging

All errors are automatically logged with:
- Error type and code
- Full context (formId, contextId, sessionId, etc.)
- Salesforce error codes (if applicable)
- Stack traces (for internal errors)

Check broker logs for detailed error information:
```bash
# Heroku logs
heroku logs --tail -a your-app-name

# Local logs
tail -f broker/logs/api.log
```

---

## Common Error Scenarios

### Scenario 1: Form Definition Not Found

**Error**: `FORM_NOT_FOUND`  
**Cause**: Form_Definition__c record doesn't exist in Salesforce  
**Solution**:
1. Verify Form_Definition__c record exists with correct Form_Id__c
2. Check Form_Definition__c.Active__c = true
3. Ensure service account has Read permission

### Scenario 2: Salesforce Connection Error

**Error**: `SALESFORCE_CONNECTION_ERROR`  
**Cause**: Cannot connect to Salesforce API  
**Solution**:
1. Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env
2. Complete OAuth flow: `/oauth/authorize?contextId=service_account`
3. Check network connectivity to Salesforce

### Scenario 3: Permission Error

**Error**: `SALESFORCE_PERMISSION_ERROR`  
**Cause**: Service account lacks required permissions  
**Solution**:
1. Check service account profile permissions
2. Verify Field-Level Security (FLS) settings
3. Ensure service account has Read/Edit/Create access to required objects

### Scenario 4: Parsing Error

**Error**: `PARSING_ERROR`  
**Cause**: Invalid JSON in Form_Definition__c fields  
**Solution**:
1. Validate JSON syntax in Fields_JSON__c, Mapping_Rules__c, Agent_Config__c
2. Check for missing quotes, brackets, commas
3. Use JSON validator tool

### Scenario 5: Missing Field Mappings

**Error**: `CONFIGURATION_ERROR`  
**Cause**: Form fields not mapped to Salesforce fields  
**Solution**:
1. Update Mapping_Rules__c.fieldMappings
2. Verify Salesforce fields exist
3. Check Field-Level Security allows writes

---

## Error Response Status Codes

| Error Type | HTTP Status | When to Use |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input format or value |
| `INVALID_CONTEXT_ID` | 400 | Context ID format invalid |
| `INVALID_FORM_ID` | 400 | Form ID format invalid |
| `INVALID_SESSION_ID` | 400 | Session ID format invalid |
| `PARSING_ERROR` | 400 | JSON parsing failed |
| `CONFIGURATION_ERROR` | 400 | Configuration invalid or missing |
| `FORM_NOT_FOUND` | 404 | Form definition doesn't exist |
| `SESSION_NOT_FOUND` | 404 | Session expired or doesn't exist |
| `RECORD_NOT_FOUND` | 404 | Salesforce record doesn't exist |
| `SALESFORCE_AUTH_ERROR` | 401 | Authentication failed |
| `SALESFORCE_PERMISSION_ERROR` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SALESFORCE_CONNECTION_ERROR` | 503 | Cannot connect to Salesforce |
| `SALESFORCE_QUERY_ERROR` | 502 | Query failed |
| `SALESFORCE_CREATE_ERROR` | 502 | Record creation failed |
| `SALESFORCE_UPDATE_ERROR` | 502 | Record update failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Troubleshooting Workflow

When you receive an error:

1. **Identify Error Type**: Check `error.type` field
2. **Read Guidance**: Review `error.guidance` for actionable steps
3. **Check Context**: Review `error.context` for specific details (formId, objectType, etc.)
4. **Follow Troubleshooting Steps**: Execute steps in `error.troubleshooting` array
5. **Check Broker Logs**: Review detailed logs for stack traces and additional context
6. **Verify Configuration**: Check Salesforce metadata and broker .env settings
7. **Test Fix**: Verify error is resolved with test request

---

## Migration from Old Error Format

Old error responses (without standardized format) are being migrated. Old format:
```json
{
  "error": "Form not found",
  "message": "No form definition found"
}
```

New standardized format (current):
```json
{
  "error": {
    "type": "FORM_NOT_FOUND",
    "code": "FORM_NOT_FOUND",
    "message": "Form definition not found: contact-form-v1",
    "context": { "formId": "contact-form-v1" },
    "troubleshooting": [...]
  }
}
```

All endpoints now return standardized error responses.


