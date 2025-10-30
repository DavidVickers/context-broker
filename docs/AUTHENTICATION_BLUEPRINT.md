# Authentication Blueprint - Agent-Initiated User Authentication

## Overview

This blueprint defines how user authentication integrates with the Forms-Aware Agent system, enabling agent-triggered authentication flows where a Salesforce agent can initiate user login from a conversation context.

## Core Use Case

**Example Flow**:
```
Agent: "Do you already have an account with us?"
User: "Yes, my username is JohnDoe541@email.com"
Agent: "Let me get you logged in"
→ Modal opens in website for OpenID Connect authentication
→ User completes OAuth flow
→ Agent conversation continues with authenticated user context
```

## Architecture Integration

### Current State

✅ **What Exists**:
- Session management (contextId, sessionId)
- UI agent system (modal control, focus management)
- Broker layer for communication
- Form submission with context tracking

❌ **What's Missing**:
- User authentication layer
- OAuth/OpenID Connect flow
- Agent-triggered auth initiation
- User identity linking to sessions

### Integration Points

```
┌─────────────────────────────────────────────────────────┐
│              Salesforce Agent                            │
│  • Detects need for authentication                      │
│  • Sends auth request with contextId                    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Broker API                                  │
│  • Receives auth trigger                                 │
│  • Validates contextId                                   │
│  • Initiates OAuth flow                                  │
│  • Sends command to frontend                             │
└───────────────────┬─────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌─────────────────┐    ┌──────────────────┐
│  Frontend       │    │  OAuth Provider  │
│  • Opens modal  │    │  (Salesforce/    │
│  • OAuth flow   │    │   External)      │
│  • Token store  │    │                  │
└─────────────────┘    └──────────────────┘
```

## Authentication Flow Design

### Flow 1: Agent-Initiated Authentication

```
Step 1: Agent Conversation
┌─────────────────────────────────┐
│ Agent (Salesforce):             │
│ "Do you have an account?"        │
│ User: "Yes, JohnDoe541@email"    │
│ Agent: "Let me log you in"       │
└─────────────────────────────────┘
         │
         ▼
Step 2: Agent Triggers Auth
┌─────────────────────────────────┐
│ POST /api/agent/auth/initiate   │
│ {                               │
│   contextId: "form:sess",       │
│   email: "john@email.com",      │
│   provider: "salesforce"        │
│ }                               │
└─────────────────────────────────┘
         │
         ▼
Step 3: Broker Validates & Initiates
┌─────────────────────────────────┐
│ • Validate contextId            │
│ • Create auth session            │
│ • Generate state + nonce         │
│ • Build OAuth URL                │
│ • Send UI command                │
└─────────────────────────────────┘
         │
         ▼
Step 4: Frontend Opens Modal
┌─────────────────────────────────┐
│ cmd.modal.open                  │
│ {                               │
│   modalId: "modal:auth",       │
│   authUrl: "https://..."        │
│ }                               │
└─────────────────────────────────┘
         │
         ▼
Step 5: OAuth Flow in Modal
┌─────────────────────────────────┐
│ User → OAuth Provider           │
│   (Login, consent)              │
│ OAuth Provider → Callback       │
│   (code + state)                │
└─────────────────────────────────┘
         │
         ▼
Step 6: Token Exchange
┌─────────────────────────────────┐
│ POST /api/auth/callback         │
│ {                               │
│   code: "...",                  │
│   state: "..."                  │
│ }                               │
│ → Exchange code for tokens      │
│ → Link user to contextId        │
└─────────────────────────────────┘
         │
         ▼
Step 7: Authentication Complete
┌─────────────────────────────────┐
│ • Store tokens (encrypted)      │
│ • Update session with userId     │
│ • Close auth modal               │
│ • Notify agent of success        │
│ • Continue conversation          │
└─────────────────────────────────┘
```

## Technical Design

### 1. Authentication Session Model

```typescript
interface AuthSession {
  authSessionId: string;        // Unique auth flow session
  contextId: string;            // Original context (formId:sessionId)
  provider: 'salesforce' | 'google' | 'okta' | 'azure';
  state: string;                // OAuth state parameter
  nonce: string;                // CSRF protection
  redirectUri: string;          // OAuth callback URL
  expiresAt: Date;              // Auth session expiry (10 min)
  email?: string;               // Pre-filled email (if provided)
  status: 'pending' | 'completed' | 'failed' | 'expired';
  userId?: string;              // Set after successful auth
  tokens?: {
    accessToken: string;        // Encrypted
    refreshToken: string;       // Encrypted
    idToken?: string;           // Encrypted (for OpenID)
    expiresAt: Date;
  };
}
```

### 2. Broker API Endpoints

#### Initiate Authentication
```
POST /api/agent/auth/initiate
Body: {
  contextId: string;           // Required: formId:sessionId
  provider: string;             // 'salesforce', 'google', etc.
  email?: string;               // Optional: pre-fill email
  scopes?: string[];            // Optional: OAuth scopes
}
Response: {
  authSessionId: string;
  authUrl: string;              // OAuth authorization URL
  expiresAt: string;            // ISO timestamp
}
```

#### OAuth Callback
```
GET /api/auth/callback
Query: {
  code: string;                 // OAuth authorization code
  state: string;                // OAuth state (validates authSessionId)
}
Response: {
  success: boolean;
  contextId: string;            // Original context preserved
  userId: string;
  userInfo: {
    email: string;
    name: string;
    id: string;
  };
}
```

#### Check Authentication Status
```
GET /api/auth/status?contextId={contextId}
Response: {
  authenticated: boolean;
  userId?: string;
  userInfo?: {
    email: string;
    name: string;
  };
  provider?: string;
}
```

#### Refresh Tokens
```
POST /api/auth/refresh
Body: {
  contextId: string;
  refreshToken: string;
}
Response: {
  accessToken: string;
  expiresAt: string;
}
```

#### Logout
```
POST /api/auth/logout
Body: {
  contextId: string;
}
Response: {
  success: boolean;
}
```

### 3. Frontend Integration

#### Auth Modal Component
```tsx
// frontend/src/components/AuthModal.tsx
import { useModal } from '../hooks/useModal';

interface AuthModalProps {
  authUrl: string;
  provider: string;
  onSuccess: (userInfo: UserInfo) => void;
  onCancel: () => void;
}

export function AuthModal({ authUrl, provider, onSuccess, onCancel }: AuthModalProps) {
  const { isOpen, close, modalRef } = useModal({
    modalId: 'modal:auth',
    autoFocus: true
  });

  // OAuth flow handled in iframe or redirect
  // ...

  return (
    <div ref={modalRef} hidden={!isOpen} role="dialog" aria-modal="true">
      <h2>Sign In</h2>
      {/* OAuth provider UI */}
    </div>
  );
}
```

#### Auth Service
```typescript
// frontend/src/services/auth.ts
export interface AuthConfig {
  provider: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface UserInfo {
  userId: string;
  email: string;
  name: string;
  provider: string;
}

export const initiateAuth = async (
  contextId: string,
  provider: string,
  email?: string
): Promise<{ authUrl: string; authSessionId: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/agent/auth/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextId, provider, email }),
  });
  return response.json();
};

export const checkAuthStatus = async (contextId: string): Promise<AuthStatus> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/status?contextId=${contextId}`);
  return response.json();
};
```

### 4. Agent Integration (Salesforce)

#### Apex Class: AuthTriggerService
```apex
public class AuthTriggerService {
    /**
     * Trigger authentication flow from agent
     * @param contextId The context ID from form session
     * @param email Optional: user's email address
     * @param provider OAuth provider (default: 'salesforce')
     * @return Auth session ID for tracking
     */
    @AuraEnabled
    public static String triggerAuthentication(
        String contextId,
        String email,
        String provider
    ) {
        // Call broker API to initiate auth
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://your-broker.herokuapp.com/api/agent/auth/initiate');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(new Map<String, Object>{
            'contextId' => contextId,
            'email' => email,
            'provider' => provider != null ? provider : 'salesforce'
        }));
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            return (String) result.get('authSessionId');
        }
        
        throw new AuthException('Failed to initiate authentication');
    }
    
    /**
     * Check if user is authenticated for a context
     */
    @AuraEnabled
    public static Boolean isAuthenticated(String contextId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://your-broker.herokuapp.com/api/auth/status?contextId=' + contextId);
        req.setMethod('GET');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            return (Boolean) result.get('authenticated');
        }
        
        return false;
    }
    
    public class AuthException extends Exception {}
}
```

#### Flow Integration
```yaml
# Salesforce Flow: Agent Authentication Trigger
Entry Criteria:
  - Agent message contains: "log in" OR "authenticate" OR "sign in"
  - OR User provides email address

Actions:
  1. Extract contextId from conversation context
  2. Extract email from user message (if provided)
  3. Call AuthTriggerService.triggerAuthentication()
  4. Store authSessionId in conversation context
  5. Agent: "Opening login window for you..."
  6. Wait for authentication completion (poll API)
  7. On success: Continue conversation with user context
```

### 5. OAuth Provider Configuration

#### Salesforce as OAuth Provider

**Connected App Setup**:
1. Setup → App Manager → New Connected App
2. OAuth Settings:
   - Callback URL: `https://your-broker.herokuapp.com/api/auth/callback`
   - OAuth Scopes:
     - `Access the identity URL service (id, profile, email, address, phone)`
     - `Access your basic information (id, profile, email, address, phone)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - Enable for Device Flow (optional, for mobile)

**OAuth URL Generation**:
```typescript
const generateOAuthUrl = (config: AuthConfig, state: string, nonce: string): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: state,
    nonce: nonce,
    prompt: 'login',  // Force login even if already authenticated
  });
  
  return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
};
```

### 6. Token Management

#### Token Storage
```typescript
// Store encrypted tokens in broker (not frontend)
interface TokenStore {
  contextId: string;
  userId: string;
  provider: string;
  accessToken: string;      // Encrypted with AES-256
  refreshToken: string;     // Encrypted
  idToken?: string;         // Encrypted (OpenID)
  expiresAt: Date;
  createdAt: Date;
}

// Use Redis or encrypted database
// Never expose tokens to frontend except via secure HTTP-only cookies
```

#### Token Refresh Flow
```typescript
// Automatic refresh before expiration
const refreshTokenIfNeeded = async (contextId: string): Promise<void> => {
  const tokenStore = await getTokenStore(contextId);
  
  if (!tokenStore) {
    throw new Error('No tokens found');
  }
  
  // Check if token expires in next 5 minutes
  const expiresIn = tokenStore.expiresAt.getTime() - Date.now();
  if (expiresIn > 300000) { // > 5 minutes
    return; // Still valid
  }
  
  // Refresh token
  const response = await fetch(`${OAUTH_ENDPOINT}/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decrypt(tokenStore.refreshToken),
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    }),
  });
  
  const newTokens = await response.json();
  await updateTokenStore(contextId, {
    accessToken: encrypt(newTokens.access_token),
    expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
  });
};
```

## Context Preservation Through Auth

### Challenge
User starts form, agent triggers auth, user completes auth - must maintain:
- Original form context (formId, sessionId)
- Form data (if auto-saved)
- Agent conversation history

### Solution

**Step 1: Pre-Auth State Capture**
```typescript
// Before opening auth modal
const authContext = {
  contextId: session.contextId,
  formId: session.formId,
  formData: session.formData,        // Auto-saved data
  agentContext: session.agentContext, // Conversation history
  url: window.location.href,         // Current page
};

// Store in broker with authSessionId
await broker.storeAuthContext(authSessionId, authContext);
```

**Step 2: Post-Auth Restoration**
```typescript
// After successful auth
const restoredContext = await broker.getAuthContext(authSessionId);

// Restore:
// - Original contextId (linked to userId now)
// - Form data
// - Agent conversation
// - UI state
```

**Step 3: Context Linking**
```typescript
// Link authenticated user to original context
await broker.linkUserToContext({
  contextId: originalContextId,
  userId: authenticatedUserId,
  provider: 'salesforce',
  linkedAt: new Date(),
});
```

## Security Considerations

### 1. State & Nonce Validation
```typescript
// Generate cryptographically random state + nonce
const state = crypto.randomUUID();
const nonce = crypto.randomBytes(32).toString('base64');

// Store with authSessionId
await storeAuthSession({
  authSessionId,
  state,
  nonce,
  contextId,
});

// Validate on callback
if (receivedState !== storedState) {
  throw new Error('Invalid state parameter');
}
```

### 2. Token Encryption
```typescript
// Encrypt tokens before storage
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32-byte key
const ALGORITHM = 'aes-256-gcm';

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### 3. Session Hijacking Prevention
```typescript
// Include session fingerprint in state
const fingerprint = generateFingerprint(); // Browser + IP + User-Agent hash
const state = crypto.randomUUID();

await storeAuthSession({
  authSessionId,
  state: `${state}:${fingerprint}`,  // State includes fingerprint
  contextId,
});

// Validate fingerprint on callback
const [statePart, fingerprint] = receivedState.split(':');
if (fingerprint !== expectedFingerprint) {
  throw new Error('Session fingerprint mismatch');
}
```

### 4. CSRF Protection
- Use nonce in OAuth flow
- Validate state parameter
- Same-site cookies
- Origin validation

### 5. Token Exposure Prevention
- Never store tokens in localStorage (XSS risk)
- Use HTTP-only cookies for tokens (if possible)
- Broker-only token storage
- Token rotation

## UI/UX Considerations

### 1. Modal Design

**Requirements**:
- Clearly shows which provider (Salesforce, Google, etc.)
- Shows email if pre-filled
- Progress indication during OAuth flow
- Error handling (user cancellation, network errors)
- Accessibility (ARIA labels, keyboard navigation)

**Example Modal**:
```tsx
<div role="dialog" aria-labelledby="auth-title" aria-modal="true">
  <h2 id="auth-title">Sign In to Continue</h2>
  <p>You need to sign in to complete this action.</p>
  
  {email && (
    <p className="email-hint">Signing in as: {email}</p>
  )}
  
  <div className="auth-provider">
    <button onClick={startOAuth}>
      Sign in with {providerName}
    </button>
  </div>
  
  <button onClick={onCancel}>Cancel</button>
</div>
```

### 2. OAuth Flow Options

**Option A: Redirect Flow (Recommended for Desktop)**
- Redirect entire page to OAuth provider
- Redirect back to callback URL
- Restore state after callback

**Option B: Popup Flow**
- Open OAuth in popup window
- Monitor popup for completion
- Close popup, update parent window

**Option C: Iframe Flow** (if CORS allows)
- Embed OAuth in iframe
- PostMessage for communication
- Less secure (XSS risk)

### 3. Error Handling

```typescript
// Handle user cancellation
if (error === 'access_denied') {
  showMessage('Sign in was cancelled. You can continue as a guest.');
  closeModal();
  return;
}

// Handle network errors
if (error === 'network_error') {
  showMessage('Network error. Please try again.');
  retryAuth();
  return;
}

// Handle expired session
if (error === 'session_expired') {
  showMessage('Session expired. Please start again.');
  clearSession();
  return;
}
```

## Integration with Existing Systems

### 1. Session Manager Integration

```typescript
// Extend session with auth info
interface EnhancedSession {
  // Existing fields
  sessionId: string;
  formId: string;
  contextId: string;
  
  // New auth fields
  authenticated: boolean;
  userId?: string;
  userInfo?: UserInfo;
  authProvider?: string;
}
```

### 2. UI Agent Integration

```typescript
// Agent command to trigger auth
{
  "rid": "req_auth_1",
  "cmd": "auth.initiate",
  "params": {
    "contextId": "form:sess",
    "provider": "salesforce",
    "email": "user@example.com"
  }
}

// Modal opens automatically via UI agent system
// Auth flow completes
// Agent receives notification
// Conversation continues
```

### 3. Form Submission Integration

```typescript
// Check auth before submission (if required)
const requiresAuth = formDefinition.requiresAuth || false;

if (requiresAuth && !session.authenticated) {
  // Trigger auth flow
  await initiateAuth(contextId, 'salesforce');
  // Wait for auth
  // Then proceed with submission
}

// Include user info in submission
const submission = {
  contextId,
  formData,
  userId: session.userId,  // Link to authenticated user
  userEmail: session.userInfo?.email,
};
```

## Implementation Phases

### Phase 1: Basic OAuth Flow (Week 1-2)
- [ ] OAuth URL generation
- [ ] Callback endpoint
- [ ] Token exchange
- [ ] Token storage (in-memory for now)

### Phase 2: Agent Integration (Week 3)
- [ ] Auth initiation endpoint
- [ ] Salesforce Apex integration
- [ ] Flow to trigger auth
- [ ] Status checking

### Phase 3: Frontend Integration (Week 4)
- [ ] Auth modal component
- [ ] OAuth redirect/popup flow
- [ ] Context preservation
- [ ] Error handling

### Phase 4: Security Hardening (Week 5)
- [ ] Token encryption
- [ ] State/nonce validation
- [ ] Session fingerprinting
- [ ] Security testing

### Phase 5: Production Ready (Week 6)
- [ ] Redis token storage
- [ ] Token refresh automation
- [ ] Monitoring & logging
- [ ] Documentation

## Testing Strategy

### Unit Tests
- Token encryption/decryption
- State validation
- URL generation
- Error handling

### Integration Tests
- Complete OAuth flow (mock provider)
- Agent trigger → auth → completion
- Context preservation
- Token refresh

### E2E Tests
- User completes form
- Agent asks for login
- User authenticates
- Form submission continues with auth

## Configuration

### Environment Variables

**Broker (.env)**:
```
# OAuth Provider - Salesforce
SALESFORCE_OAUTH_CLIENT_ID=your_client_id
SALESFORCE_OAUTH_CLIENT_SECRET=your_client_secret
SALESFORCE_OAUTH_REDIRECT_URI=https://your-broker.herokuapp.com/api/auth/callback

# Token Encryption
TOKEN_ENCRYPTION_KEY=32_byte_hex_key_here

# OAuth Provider - Google (optional)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...

# Session
AUTH_SESSION_TTL=600  # 10 minutes
TOKEN_REFRESH_THRESHOLD=300  # 5 minutes before expiry
```

### Salesforce Connected App
- Configure OAuth settings
- Set callback URLs (dev, staging, prod)
- Configure OAuth scopes
- Enable for agent flows

## Security Checklist

- [ ] State parameter validation
- [ ] Nonce validation (OpenID)
- [ ] Token encryption at rest
- [ ] Secure token storage (not localStorage)
- [ ] HTTPS only (no HTTP)
- [ ] Same-site cookies
- [ ] Origin validation
- [ ] Rate limiting on auth endpoints
- [ ] Session fingerprinting
- [ ] Token expiration handling
- [ ] Refresh token rotation
- [ ] Audit logging
- [ ] Error message sanitization

## Best Practices

### ✅ DO
- Use OpenID Connect (not just OAuth 2.0) for identity
- Encrypt all tokens before storage
- Validate state parameter on callback
- Use nonce for OpenID Connect
- Store tokens server-side only
- Implement token refresh
- Preserve context through auth flow
- Show clear progress indicators
- Handle user cancellation gracefully

### ❌ DON'T
- Store tokens in localStorage
- Expose tokens to frontend
- Skip state validation
- Trust client-provided state
- Return tokens in URL parameters
- Skip token encryption
- Allow unlimited auth attempts
- Log sensitive token data

## Example: Complete Flow

### 1. User Fills Form
```
User → Frontend: Loads form "contact-form"
Frontend → Broker: Creates session
Context ID: "contact-form:550e8400-..."
```

### 2. Agent Conversation
```
Agent: "Do you have an account?"
User: "Yes, my email is john@example.com"
Agent: "Let me get you logged in"
```

### 3. Agent Triggers Auth
```
Salesforce Agent → Broker: POST /api/agent/auth/initiate
{
  contextId: "contact-form:550e8400-...",
  email: "john@example.com",
  provider: "salesforce"
}
```

### 4. Broker Initiates
```
Broker:
- Validates contextId
- Creates authSessionId: "auth_abc123"
- Generates state + nonce
- Builds OAuth URL
- Stores auth context (form data, agent conversation)
```

### 5. Frontend Opens Modal
```
Broker → Frontend: cmd.modal.open
{
  modalId: "modal:auth",
  authUrl: "https://login.salesforce.com/oauth2/authorize?..."
}
Frontend: Opens auth modal, redirects to OAuth
```

### 6. User Authenticates
```
User → Salesforce: Login, consent
Salesforce → Broker: GET /api/auth/callback?code=...&state=...
Broker: Exchanges code for tokens
```

### 7. Completion
```
Broker:
- Validates state
- Stores encrypted tokens
- Links userId to contextId
- Restores form context
- Notifies agent: "User authenticated"

Frontend:
- Receives auth success
- Closes modal
- Updates session with user info
- Continues form
```

### 8. Form Submission
```
User submits form
Frontend → Broker: POST /api/forms/submit
{
  contextId: "contact-form:550e8400-...",
  formData: {...},
  userId: "005xxx",  // Now included
  userEmail: "john@example.com"
}
```

## Compatibility with Current Architecture

### ✅ Fully Compatible With:
- Session management (contextId preserved)
- UI agent system (modal control works)
- Form submission (enhanced with user info)
- Agent communication (triggered from Salesforce)

### 🔧 Requires Integration:
- Session storage (add auth fields)
- UI agent commands (add auth.initiate command)
- Broker routes (add auth endpoints)
- Frontend components (add auth modal)

## Questions & Answers

**Q: Can user skip authentication?**
A: Yes, if form doesn't require auth. Form can have `requiresAuth: false`. Agent can ask but user can decline.

**Q: What if user cancels auth?**
A: Auth session marked as cancelled. Agent receives notification. User can continue as guest or retry.

**Q: Can multiple users authenticate per context?**
A: No. Context ID is tied to browser session. One user per context. Multiple contexts can exist simultaneously.

**Q: What happens to form data during auth?**
A: Form data is auto-saved in session. After auth, data is restored. User doesn't lose progress.

**Q: Can agent retry auth if it fails?**
A: Yes. Agent can detect auth failure and trigger new auth flow with different provider or email.

**Q: How are tokens refreshed?**
A: Automatically by broker before expiration. Frontend doesn't need to handle refresh. Transparent to user.

---

## Next Steps

1. **Implement OAuth Provider Setup** (Salesforce Connected App)
2. **Create Broker Auth Endpoints** (`/api/agent/auth/initiate`, `/api/auth/callback`)
3. **Build Frontend Auth Modal** (React component)
4. **Integrate with UI Agent System** (add auth.initiate command)
5. **Add Salesforce Apex Integration** (AuthTriggerService)
6. **Test End-to-End Flow** (agent → auth → form submission)
7. **Security Hardening** (encryption, validation, testing)
8. **Production Deployment** (Redis tokens, monitoring)

---

**Last Updated**: 2024
**Status**: Blueprint - Ready for Implementation
**Priority**: P0 (Critical for production readiness)


