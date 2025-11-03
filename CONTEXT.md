# Critical Architecture Context - Keep in Cursor Memory

**⚠️ This file contains the most essential architectural decisions. Update this when architecture changes.**

## Core Architecture Principles

### 1. Three-Domain System
```
Frontend (Website) ←→ Broker API ←→ Salesforce
   GitHub Pages        Heroku          Salesforce Org
```

### 2. Form Identification (CRITICAL)
- **Form ID**: Static identifier from `Form_Definition__c.Form_Id__c` (e.g., `contact-form-v1`)
- **Session ID**: UUID v4 generated per user session
- **Context ID**: `{formId}:{sessionId}` format (e.g., `contact-form:550e8400-...`)
- **ALWAYS** include contextId in form submissions
- **ALWAYS** parse contextId to extract formId and sessionId
- **ALWAYS** validate contextId format before processing

### 3. Session Management
- Sessions: 24-hour expiry, auto-cleanup
- Storage: Frontend (localStorage) + Broker (in-memory → should be Redis)
- Context preservation: Form data, agent conversations, UI state

### 4. UI Agent System
- **Data attributes**: `data-assist-route`, `data-assist-view`, `data-assist-modal`, `data-assist-panel`
- **Instance IDs**: Auto-generated (`ri_`, `vi_`, `mi_`, `pi_` prefixes)
- **Focus priority**: Modal > View > Route
- **Commands**: navigate, focus, click, type, scroll, modal.open/close

### 5. Authentication Pattern (New)
- **Agent-triggered**: Salesforce agent initiates auth → Broker → Frontend modal
- **Context preservation**: Maintain contextId through OAuth flow
- **Token storage**: Encrypted, server-side only
- **Flow**: `/api/agent/auth/initiate` → OAuth → `/api/auth/callback`

## Critical Patterns

### Form Submission Pattern
```typescript
POST /api/forms/:formId/submit
{
  contextId: "formId:sessionId",  // REQUIRED
  formData: { ... }
}

Broker:
1. Parse contextId → { formId, sessionId }
2. Validate session exists
3. Validate Form_Definition__c exists
4. Create Form_Submission__c with Context_ID__c and Session_ID__c
```

### Agent Communication Pattern
```typescript
POST /api/forms/:formId/agent/query
{
  contextId: "formId:sessionId",  // REQUIRED
  query: "...",
  fieldName?: "..."
}
```

### UI Agent Command Pattern
```typescript
POST /api/agent/ui/command
{
  ctx_ref: "...",
  cmd: "modal.open" | "focus" | "navigate" | ...,
  rid: "req_123",
  params: { ... }
}
```

## Domain Responsibilities

### Frontend (Website)
- ✅ Form rendering (dynamic from schema)
- ✅ Session management (localStorage)
- ✅ UI agent integration (modal control, focus)
- ✅ Agent-triggered auth modals
- ❌ NO direct Salesforce calls
- ❌ NO business logic

### Broker (API Layer)
- ✅ Session management (temporary store)
- ✅ Form definition retrieval
- ✅ Context ID validation and parsing
- ✅ Salesforce API proxying
- ✅ Agent command routing
- ✅ OAuth flow orchestration
- ✅ Token management (encrypted)
- ❌ NO business rules

### Salesforce
- ✅ Form definitions (`Form_Definition__c`)
- ✅ Form submissions (`Form_Submission__c`)
- ✅ Business logic (Flows, Apex)
- ✅ Agent conversation handling
- ✅ Authentication triggers (Apex)
- ❌ NO UI rendering
- ❌ NO session management (broker handles)

## Data Flow Rules

### Context ID Flow
```
1. Frontend generates Session ID (UUID)
2. Frontend creates Context ID: {formId}:{sessionId}
3. Frontend sends Context ID with all requests
4. Broker parses and validates Context ID
5. Broker stores Context ID in Salesforce
```

### Session Flow
```
1. Frontend: localStorage (persistent)
2. Broker: In-memory Map (should be Redis)
3. Salesforce: Form_Submission__c (Context_ID__c, Session_ID__c)
```

### Authentication Flow
```
1. Agent detects need → POST /api/agent/auth/initiate
2. Broker generates OAuth URL → cmd.auth.initiate to frontend
3. Frontend opens modal → OAuth redirect
4. Callback → Token exchange → Link user to contextId
```

## Security Critical Rules

1. **NEVER** trust client-provided contextId without validation
2. **ALWAYS** validate contextId format: `{formId}:{uuid}`
3. **ALWAYS** check session exists on broker before processing
4. **NEVER** store tokens in localStorage (encrypt, server-side)
5. **ALWAYS** validate state parameter in OAuth callback
6. **ALWAYS** parse contextId server-side (broker), not client

## Deployment Rules

- **Frontend**: `./scripts/deploy-github.sh` → GitHub Pages
- **Broker**: `./scripts/deploy-heroku.sh` → Heroku
- **Salesforce**: `./scripts/deploy-salesforce.sh [org]` → Salesforce CLI
- **NEVER** deploy entire repo - selective deployment only

## Code Organization Rules

### Files Structure
```
frontend/src/
  services/  → API calls (api.ts, auth.ts)
  utils/     → Session management (sessionManager.ts)
  hooks/     → React hooks (useAssistId.ts, useModal.ts)
  components/→ UI components (FormRenderer.tsx, AuthModal.tsx)
  services/  → Agent UI service (agentUI.ts)

broker/src/
  routes/    → API endpoints (forms.ts, sessions.ts, auth.ts, agentUI.ts)
  services/  → Business logic (salesforce.ts, session.ts, auth.ts)

salesforce/force-app/main/default/
  classes/   → Apex classes (FormSubmissionHandler.cls, AuthTriggerService.cls)
  objects/   → Custom Objects (Form_Definition__c, Form_Submission__c)
```

### Naming Conventions
- **Form IDs**: kebab-case with version (`contact-form-v1`)
- **Context IDs**: `{formId}:{uuid}` format
- **Instance IDs**: Prefix + random (`ri_abc123`, `vi_def456`)
- **Type IDs**: Colon-separated (`route:forms`, `view:cart`)

## Critical Dependencies

- `contextId` MUST be present in form submissions
- Session MUST exist before form submission
- Form definition MUST exist before rendering
- UI agent service MUST be initialized on app load

## Error Handling Rules

1. **Context ID invalid** → Return 400 with clear error
2. **Session expired** → Return 404, client creates new session
3. **Form not found** → Return 404 with formId
4. **Auth failed** → Log, return 401, preserve context
5. **Salesforce error** → Log, return 500, don't expose internals

## Testing Requirements

- ✅ Unit tests: Context ID parsing, validation
- ✅ Integration tests: End-to-end form submission
- ✅ E2E tests: Agent → Auth → Form submission
- ❌ Mock Salesforce for integration tests
- ❌ Use test Form IDs in development

## Environment Variables (Critical)

### Broker
```
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
SALESFORCE_USERNAME=...
SALESFORCE_SECURITY_TOKEN=...
SALESFORCE_LOGIN_URL=https://login.salesforce.com
FRONTEND_URL=https://your-site.github.io
TOKEN_ENCRYPTION_KEY=...  (for auth)
```

### Frontend
```
REACT_APP_BROKER_API_URL=https://your-broker.herokuapp.com
```

## Quick Reference: API Endpoints

```
# Forms
GET    /api/forms/:formId              # Get form definition
POST   /api/forms/:formId/submit       # Submit form (requires contextId)

# Sessions
POST   /api/sessions                   # Create session
GET    /api/sessions/:sessionId        # Get session
PUT    /api/sessions/:sessionId        # Update session

# Agent
POST   /api/forms/:formId/agent/query # Query agent (requires contextId)

# UI Agent
POST   /api/agent/ui/event             # UI events from frontend
POST   /api/agent/ui/command           # Commands to frontend
POST   /api/agent/ui/state             # Get UI state

# Authentication
POST   /api/agent/auth/initiate        # Initiate auth (requires contextId)
GET    /api/auth/callback              # OAuth callback
GET    /api/auth/status?contextId=...  # Check auth status
```

## Common Pitfalls to Avoid

❌ **Don't**: Generate sessionId on broker (client generates)
❌ **Don't**: Trust contextId from client without validation
❌ **Don't**: Store tokens in localStorage (XSS risk)
❌ **Don't**: Skip state validation in OAuth
❌ **Don't**: Hardcode Form IDs in code
❌ **Don't**: Make direct Salesforce calls from frontend
❌ **Don't**: Expose Salesforce credentials
❌ **Don't**: Return raw Salesforce errors to client

✅ **Do**: Validate all inputs (contextId, formId, sessionId)
✅ **Do**: Encrypt sensitive data (tokens, credentials)
✅ **Do**: Use environment variables for config
✅ **Do**: Log errors with context (contextId, sessionId)
✅ **Do**: Preserve context through async operations
✅ **Do**: Handle session expiration gracefully

---

**Last Updated**: When architecture changes
**Maintainer**: Update when adding new patterns or principles






