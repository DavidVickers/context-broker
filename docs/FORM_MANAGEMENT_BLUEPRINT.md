# Form Management Blueprint

## Overview

This blueprint defines how forms are identified, managed, and how they communicate with the Forms-Aware Agent using session-based context.

## Core Concepts

### 1. Form Identification Strategy

**Form ID (Static)**: Uniquely identifies the form type/definition
- Stored in `Form_Definition__c.Form_Id__c`
- Examples: `contact-form`, `application-form`, `support-request`
- Used to retrieve form schema and configuration

**Session ID (Dynamic)**: Uniquely identifies a user's interaction session
- Generated on first form load
- Persisted across multiple form interactions
- Allows agent to maintain context within a session
- Format: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

**Context ID (Composite)**: Form ID + Session ID = Unique Context
- Format: `{formId}:{sessionId}`
- Example: `contact-form:550e8400-e29b-41d4-a716-446655440000`
- Enables:
  - Multi-user support (same form, different sessions)
  - Agent context tracking
  - Session-specific data storage
  - Progressive form filling across pages

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                     Web Form                             │
│  Form ID: contact-form                                   │
│  Session ID: 550e8400-... (generated on load)            │
│  Context ID: contact-form:550e8400-...                   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                    Broker API                            │
│  • Validates Form ID                                     │
│  • Manages Session lifecycle                            │
│  • Routes to Agent/Salesforce                           │
│  • Stores session context                                │
└───────────────────┬─────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌─────────────────┐    ┌──────────────────┐
│  Salesforce     │    │  Agent Context   │
│  • Form Schema  │    │  • Session Data  │
│  • Submissions  │    │  • User Context  │
│  • Mappings     │    │  • Conversations  │
└─────────────────┘    └──────────────────┘
```

## Form Identification Flow

### Step 1: Form Initialization
```
1. User visits form page with Form ID in URL or config
2. Frontend generates/retrieves Session ID
3. Frontend creates Context ID: {formId}:{sessionId}
4. Frontend requests form definition using Form ID
5. Broker validates Form ID and returns schema
6. Frontend renders form with Context ID embedded
```

### Step 2: Form Interaction
```
1. User interacts with form fields
2. Frontend sends updates with Context ID
3. Broker stores session state (optional auto-save)
4. Agent can query session context
5. Form validation can use agent suggestions
```

### Step 3: Form Submission
```
1. User submits form
2. Frontend sends: Context ID + Form Data
3. Broker:
   - Extracts Form ID and Session ID from Context ID
   - Validates against Form_Definition__c
   - Creates Form_Submission__c with Context ID
   - Triggers agent processing (if configured)
4. Response includes submission ID and agent feedback
```

## Best Practices for Web Forms

### 1. Form ID Naming Convention

**Format**: `{domain}-{purpose}-{version}`

Examples:
- `support-contact-form-v1`
- `partner-application-form-v2`
- `customer-feedback-form-v1`

**Rules**:
- Use kebab-case (lowercase, hyphens)
- Be descriptive
- Include version for breaking changes
- Keep consistent across organization

### 2. Session Management

**Session Lifecycle**:
- **Creation**: On first form load (or form reset)
- **Persistence**: Store in localStorage/sessionStorage
- **Expiration**: 24 hours of inactivity (configurable)
- **Renewal**: Can extend on activity
- **Cleanup**: Server-side cleanup of expired sessions

**Session Storage Strategy**:
```
Browser (Frontend):
  localStorage: sessionId = {uuid}
  sessionStorage: contextData = {formId, partialFormData}

Broker (Temporary):
  Memory/Redis: sessionData = {
    sessionId: uuid,
    formId: string,
    startTime: timestamp,
    lastActivity: timestamp,
    formData: object,
    agentContext: object
  }

Salesforce (Permanent):
  Form_Submission__c: {
    Context_ID__c: "formId:sessionId",
    Session_ID__c: sessionId,
    Form_Id__c: formId
  }
```

### 3. Form URL Patterns

**Option 1: Query Parameter**
```
https://your-site.com/form?formId=contact-form
→ Frontend extracts formId, generates sessionId
```

**Option 2: Path Parameter**
```
https://your-site.com/forms/contact-form
→ Routing extracts formId, generates sessionId
```

**Option 3: Hash-based**
```
https://your-site.com/#/form/contact-form
→ Frontend routing extracts formId
```

**Recommended**: Path Parameter (cleaner URLs, SEO-friendly)

### 4. Form Schema Structure

```json
{
  "formId": "contact-form-v1",
  "name": "Contact Form",
  "version": "1.0.0",
  "fields": [
    {
      "name": "firstName",
      "label": "First Name",
      "type": "text",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 50,
        "pattern": "^[a-zA-Z\\s]+$"
      },
      "agentAware": true,
      "autocomplete": {
        "source": "agent",
        "field": "contact.firstName"
      }
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "validation": {
        "pattern": "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$"
      },
      "agentAware": true
    },
    {
      "name": "message",
      "label": "Message",
      "type": "textarea",
      "required": true,
      "agentAware": true,
      "agentSuggestions": true
    }
  ],
  "mappings": {
    "salesforceObject": "Contact",
    "fieldMappings": {
      "firstName": "FirstName",
      "lastName": "LastName",
      "email": "Email"
    }
  },
  "agentConfig": {
    "enabled": true,
    "features": [
      "autocomplete",
      "validation",
      "suggestions"
    ]
  }
}
```

### 5. Agent Communication Pattern

#### Agent API Endpoints

**Get Form Definition**
```
GET /api/forms/{formId}
Response: { formId, name, fields, mappings, agentConfig }
```

**Initialize Session**
```
POST /api/sessions
Body: { formId }
Response: { sessionId, contextId, expiresAt }
```

**Get Session Context**
```
GET /api/sessions/{sessionId}
Response: { sessionId, formId, formData, agentContext }
```

**Update Session Context**
```
PUT /api/sessions/{sessionId}
Body: { formData, agentContext }
Response: { success, sessionId }
```

**Agent Query**
```
POST /api/forms/{formId}/agent/query
Body: { 
  contextId, 
  query: "What information do I need?",
  fieldName?: "email" 
}
Response: { 
  response: "You need to provide...",
  suggestions?: [...],
  validation?: {...}
}
```

**Submit Form with Agent**
```
POST /api/forms/{formId}/submit
Body: { 
  contextId,
  formData: {...}
}
Response: { 
  success: true,
  submissionId: "...",
  agentFeedback: "Thank you for submitting..."
}
```

## Implementation Components

### Frontend Requirements

1. **Session Manager**
   - Generate/retrieve Session ID
   - Build Context ID
   - Persist to localStorage
   - Handle session expiration

2. **Form Loader**
   - Extract Form ID from URL/config
   - Initialize session
   - Load form definition
   - Render form with Context ID

3. **Agent Integration**
   - Send agent queries
   - Receive agent suggestions
   - Display agent feedback
   - Auto-save form state

### Broker Requirements

1. **Session Service**
   - Validate Form ID
   - Generate Session ID
   - Store session data
   - Cleanup expired sessions

2. **Context Manager**
   - Parse Context ID
   - Retrieve session context
   - Update session state
   - Link to Salesforce records

3. **Agent Proxy**
   - Route agent queries
   - Maintain agent context
   - Return agent responses

### Salesforce Requirements

1. **Custom Fields**
   - `Form_Submission__c.Context_ID__c` (Text, 255)
   - `Form_Submission__c.Session_ID__c` (Text, 255)
   - `Form_Definition__c.Agent_Config__c` (LongTextArea)

2. **Agent Integration Objects** (optional)
   - `Agent_Context__c` - Store agent conversation history
   - `Session_Tracking__c` - Track session analytics

## Security Considerations

1. **Session Validation**
   - Validate session ownership
   - Check session expiration
   - Prevent session hijacking

2. **Form ID Validation**
   - Verify Form ID exists
   - Check form is active
   - Validate user permissions

3. **Context ID Parsing**
   - Strict format validation
   - Prevent injection attacks
   - Sanitize inputs

4. **Rate Limiting**
   - Limit session creation
   - Throttle agent queries
   - Prevent abuse

## Example Usage Flow

### Complete Flow: Contact Form Submission

```
1. User navigates to: /forms/contact-form

2. Frontend:
   - Extracts formId: "contact-form"
   - Checks localStorage for sessionId → Not found
   - Generates new sessionId: "550e8400-e29b-41d4-a716-446655440000"
   - Creates contextId: "contact-form:550e8400-e29b-41d4-a716-446655440000"
   - Stores sessionId in localStorage
   - Requests: GET /api/forms/contact-form

3. Broker:
   - Validates formId exists
   - Returns form definition with schema

4. Frontend:
   - Renders form fields
   - Embeds contextId in form metadata

5. User starts typing in "email" field

6. Frontend:
   - Auto-saves to session
   - Optionally queries agent: POST /api/forms/contact-form/agent/query
   - Body: { contextId, query: "validate email", fieldName: "email" }

7. Agent:
   - Validates email format
   - Returns: { valid: true, suggestion: "Looks good!" }

8. User fills form and submits

9. Frontend:
   - Sends: POST /api/forms/contact-form/submit
   - Body: { contextId, formData: {...} }

10. Broker:
    - Parses contextId → formId + sessionId
    - Validates form definition
    - Creates Form_Submission__c with Context_ID__c
    - Processes mappings
    - Triggers agent final processing
    - Returns: { success: true, submissionId, agentFeedback }

11. Frontend:
    - Displays success message with agent feedback
    - Optionally clears session or keeps for follow-up
```

## Best Practices Summary

✅ **DO**:
- Use descriptive Form IDs with version numbers
- Generate unique Session IDs (UUID v4)
- Store Context ID in form metadata
- Validate Context ID format before processing
- Clean up expired sessions regularly
- Use localStorage for session persistence
- Include agent feedback in form responses

❌ **DON'T**:
- Reuse Session IDs across different users
- Expose sensitive data in Context ID
- Trust client-provided Context ID without validation
- Store session data in form submission payloads
- Hardcode Form IDs in application code
- Allow unlimited session creation

## Monitoring and Analytics

Track:
- Form loads by Form ID
- Session creation rate
- Average session duration
- Agent query frequency
- Submission success rate
- Context ID format errors

Metrics to collect:
- `forms.{formId}.loads`
- `forms.{formId}.sessions.created`
- `forms.{formId}.submissions.success`
- `forms.{formId}.agent.queries`
- `sessions.expired`






