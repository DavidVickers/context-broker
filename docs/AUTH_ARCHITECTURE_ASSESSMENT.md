# Authentication Architecture Assessment

## Question

**Can a user's actions inside a Salesforce agent trigger authentication flows in the website?**

**Example**: 
- Agent: "Do you already have an account with us?"
- User: "Yes, my username is JohnDoe541@email.com"
- Agent: "Let me get you logged in"
- → Modal opens in website to complete OpenID auth

## Answer: ✅ **YES, with Modifications**

The current architecture **CAN support** this flow, but requires **additions** to fully implement it.

## Current Architecture Support

### ✅ What Already Works

1. **UI Agent System**
   - ✅ Modal control (`cmd.modal.open`)
   - ✅ Focus management
   - ✅ State tracking (contextId)
   - ✅ Command execution from broker

2. **Session Management**
   - ✅ Context ID tracking (`formId:sessionId`)
   - ✅ Session persistence
   - ✅ Context preservation

3. **Broker Communication**
   - ✅ Agent endpoints (`/api/forms/:formId/agent/query`)
   - ✅ UI command system (`/api/agent/ui/command`)
   - ✅ Event system (`/api/agent/ui/event`)

4. **Frontend Integration**
   - ✅ React hooks (`useModal`)
   - ✅ Agent UI service (observes and executes commands)
   - ✅ API service layer

### ❌ What's Missing

1. **Authentication Endpoints**
   - ❌ No `/api/agent/auth/initiate` endpoint
   - ❌ No `/api/auth/callback` endpoint
   - ❌ No token storage/management

2. **OAuth Flow**
   - ❌ No OAuth URL generation
   - ❌ No token exchange logic
   - ❌ No provider configuration

3. **Salesforce Integration**
   - ❌ No Apex class to trigger auth from agent
   - ❌ No Flow integration for auth detection

4. **Frontend Components**
   - ❌ No AuthModal component
   - ❌ No OAuth redirect handling
   - ❌ No token management

## How It Would Work

### Flow with Current Architecture

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Agent Conversation (Salesforce)             │
│ Agent: "Do you have an account?"                    │
│ User: "Yes, john@email.com"                         │
│ Agent: "Let me log you in"                         │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 2: Agent → Broker                             │
│ NEW: POST /api/agent/auth/initiate                 │
│ {                                                   │
│   contextId: "form:sess",                          │
│   email: "john@email.com",                         │
│   provider: "salesforce"                            │
│ }                                                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 3: Broker → Frontend                           │
│ EXISTING: POST /api/agent/ui/command                │
│ {                                                   │
│   cmd: "auth.initiate",  ← NEW command type        │
│   params: {                                         │
│     modalId: "modal:auth",                         │
│     authUrl: "https://login.salesforce.com/..."    │
│   }                                                 │
│ }                                                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 4: Frontend Opens Modal                       │
│ EXISTING: useModal hook + Agent UI Service         │
│ Opens modal:auth                                    │
│ Redirects to OAuth URL                             │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 5: OAuth Flow                                  │
│ User → Salesforce → Callback → Broker              │
│ NEW: /api/auth/callback endpoint                   │
│ Token exchange, storage, linking                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 6: Complete                                    │
│ Broker updates session with userId                  │
│ Frontend closes modal                               │
│ Agent notified of success                           │
│ Form continues with authenticated user              │
└─────────────────────────────────────────────────────┘
```

## Required Modifications

### 1. Broker Layer (3 endpoints)

```typescript
// NEW: broker/src/routes/auth.ts
POST /api/agent/auth/initiate  // Initiate auth flow
GET  /api/auth/callback         // OAuth callback
GET  /api/auth/status           // Check auth status
```

### 2. Broker Service (1 service)

```typescript
// NEW: broker/src/services/auth.ts
- OAuth URL generation
- Token exchange
- Token encryption/storage
- State/nonce validation
```

### 3. UI Agent Command (1 command type)

```typescript
// MODIFY: broker/src/services/agentUI.ts
// Add: cmd.auth.initiate command handler
```

### 4. Frontend Component (1 component)

```tsx
// NEW: frontend/src/components/AuthModal.tsx
- OAuth redirect/popup handling
- Error handling
- Success callback
```

### 5. Frontend Service (1 service)

```typescript
// NEW: frontend/src/services/auth.ts
- initiateAuth()
- handleCallback()
- checkAuthStatus()
```

### 6. Salesforce Apex (1 class)

```apex
// NEW: salesforce/.../AuthTriggerService.cls
- triggerAuthentication()
- isAuthenticated()
```

## Complexity Assessment

| Component | Complexity | Effort | Existing Support |
|-----------|-----------|--------|------------------|
| Broker Auth Endpoints | Medium | 2-3 days | ✅ Routes pattern exists |
| OAuth Flow Logic | Medium | 3-4 days | ⚠️ Need OAuth library |
| Token Management | Medium | 2-3 days | ❌ Need encryption |
| Frontend Auth Modal | Low | 1-2 days | ✅ Modal system exists |
| UI Agent Integration | Low | 1 day | ✅ Command system exists |
| Salesforce Apex | Low | 1 day | ✅ API call pattern exists |
| **Total** | **Medium** | **10-14 days** | **60% already supported** |

## Implementation Path

### Phase 1: Minimal Viable (3 days)
1. ✅ Basic OAuth endpoint (`/api/agent/auth/initiate`)
2. ✅ Callback endpoint (`/api/auth/callback`)
3. ✅ Simple token storage (in-memory, unencrypted for MVP)
4. ✅ Frontend modal with redirect flow
5. ✅ Salesforce Apex trigger

### Phase 2: Production Ready (7 days)
1. ✅ Token encryption
2. ✅ State/nonce validation
3. ✅ Token refresh
4. ✅ Error handling
5. ✅ Security hardening

### Phase 3: Enhanced (4 days)
1. ✅ Multiple OAuth providers
2. ✅ Popup flow option
3. ✅ Context preservation testing
4. ✅ Comprehensive error handling

## Risks & Considerations

### ⚠️ Security Risks
- Token storage (must encrypt)
- State validation (prevent CSRF)
- Token exposure (server-side only)

### ⚠️ UX Risks
- Context loss during redirect
- Modal timing issues
- Error handling

### ⚠️ Technical Risks
- OAuth provider compatibility
- Browser popup blockers
- CORS issues

## Conclusion

**The architecture CAN support agent-triggered authentication**, but requires:

1. ✅ **New Auth Endpoints** (3 broker endpoints)
2. ✅ **OAuth Integration** (OAuth library + flow logic)
3. ✅ **Frontend Auth Modal** (React component)
4. ✅ **Salesforce Integration** (Apex class)
5. ⚠️ **Token Management** (encryption + storage)

**Estimated Effort**: 10-14 days for production-ready implementation

**Architecture Suitability**: 🟢 **GOOD** - 60% of infrastructure already exists

**Recommendation**: ✅ **Proceed** - Architecture is well-suited for this feature

---

See [AUTHENTICATION_BLUEPRINT.md](./AUTHENTICATION_BLUEPRINT.md) for complete implementation details.


