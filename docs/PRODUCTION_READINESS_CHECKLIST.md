# Production Readiness Checklist

**Based on Architecture Review - Priority Mitigations**

This checklist addresses critical gaps identified in the architecture review to make the Context Broker production-grade.

---

## Critical (Must Have Before Production)

### Security & Policy Guardrails
- [ ] **Per-form Agent Policy Allowlists**
  - Define `AgentPolicy` custom object in Salesforce
  - Fields: `allowedCommands[]`, `selectorAllowlist[]`, `rateLimitPerMinute`, `concurrencyLimit`
  - Broker validates all UI commands against policy before execution
  
- [ ] **Capability Allowlists**
  - Broker checks `ctx_ref` capabilities before executing commands
  - Blocked commands return clear error messages
  - Log all blocked commands for audit

- [ ] **Rate & Concurrency Limits**
  - Token bucket rate limiting: max commands per minute per `ctx_ref`
  - Concurrency cap: max 2 in-flight commands per tab
  - Return 429 with retry-after header when limits exceeded

- [ ] **Replay Protection**
  - Add nonce/expiry to all UI commands
  - Store executed command IDs in Redis with 24h TTL
  - Reject duplicate command IDs

### Idempotency & Duplication Prevention
- [ ] **Idempotency-Key on Form Submissions**
  - Add `Idempotency-Key` header to `POST /api/forms/:formId/submit`
  - Generate key from: `sha256(contextId + formData + timestamp)`
  - Store submission hash in Redis with 24h TTL
  - Return original response for duplicate keys (don't create duplicate records)

- [ ] **Submission Deduplication**
  - Check Redis before creating Salesforce records
  - Link duplicate attempts to original `Form_Submission__c`
  - Return 409 Conflict with original submission ID

### Version Pinning
- [ ] **Form Definition Versioning**
  - Add `Version__c` field to `Form_Definition__c`
  - Increment version on each publish/update
  - Attach `Form-Version` to session on first load
  - Store version in session data

- [ ] **Version Validation**
  - Broker checks `Form-Version` on every request
  - Warn if session version < latest (suggest refresh)
  - Block submit if version mismatch (return 409 with force-refresh)

- [ ] **Immutable Form Definitions**
  - Never serve "latest" mid-session
  - Cache form definition with version at session creation
  - Query by `Form_Id__c + Version__c` for consistency

### Secure Token & Session Storage
- [ ] **KMS-Backed Encryption**
  - Use AWS KMS / Azure Key Vault / GCP KMS for key management
  - Generate encryption keys per environment
  - Rotate keys every 90 days

- [ ] **App-Level Encryption**
  - Encrypt refresh tokens with AES-GCM before storing in Redis
  - Never store plain-text tokens in memory or logs
  - Encrypt access tokens in transit and at rest

- [ ] **Token Rotation & TTL**
  - Short-lived access tokens (15-30 minutes)
  - Refresh tokens rotate every 30 days
  - Store rotation history for audit

- [ ] **Session Encryption**
  - Encrypt session data containing PII before Redis storage
  - Use separate keys for session data vs tokens
  - Enable Redis encryption in transit (TLS)

---

## High Priority (Needed for Reliability)

### Degraded Mode & Resilience
- [ ] **Cached Form Definitions**
  - Redis cache with 1-hour TTL for `Form_Definition__c`
  - Fallback to cache when Salesforce query fails
  - Cache invalidation on form updates

- [ ] **Persistent Outbox Pattern**
  - Queue form submissions to outbox table/queue when Salesforce unavailable
  - Store: `contextId`, `formData`, `attempts`, `status`, `lastRetry`
  - Background worker retries with exponential backoff
  - Max retries: 3 attempts over 1 hour

- [ ] **Degraded Mode UX**
  - Return 503 with `Retry-After` header when Salesforce unavailable
  - Clear user messaging: "Service temporarily unavailable, please try again"
  - Auto-retry logic in frontend with user feedback

- [ ] **Health Check Endpoints**
  - `/api/health/salesforce` - Check Salesforce connection
  - `/api/health/redis` - Check Redis connection
  - Return degraded status when dependencies unavailable

### Delivery Guarantees
- [ ] **Command Delivery Receipts**
  - Add `deliveryStatus` to UI commands: `queued | applied | failed | timeout`
  - Frontend sends receipt after executing command
  - Broker tracks delivery status in Redis

- [ ] **Resume Tokens for WebSockets**
  - Generate resume token for each WebSocket connection
  - Store last-delivered command ID per `ctx_ref`
  - Resume from last command on reconnection

- [ ] **Retry Logic with Backoff**
  - Exponential backoff for failed command delivery
  - Max retries: 3 attempts
  - Dead letter queue for permanently failed commands

---

## Medium Priority (Improves Operability)

### Observability & Tracing
- [ ] **Distributed Tracing**
  - Generate `X-Trace-Id` at frontend request
  - Propagate trace ID through broker → Salesforce
  - Correlate logs across all services
  - Use OpenTelemetry or similar

- [ ] **Service Level Objectives (SLOs)**
  - Define SLOs:
    - p95 form load: < 500ms
    - p95 form submit: < 1s
    - p95 command apply: < 200ms
  - Monitor and alert on SLO violations

- [ ] **Masked Logging**
  - No PII in logs (email, phone, names)
  - Mask sensitive data: `email: j***@example.com`
  - Separate audit logs for PII (access-controlled)

### Governance & Compliance
- [ ] **Data Classification**
  - Classify all fields in `Form_Definition__c` (Public, Internal, Confidential, Restricted)
  - Apply retention policies based on classification
  - Different encryption standards per classification

- [ ] **Retention & Erasure Flows**
  - Retention policy: `Form_Submission__c` records retained for X years
  - Erasure flow: Cascade delete `Form_Submission__c` → `Form_Submission_Relationship__c` → Business Objects
  - Data Cloud: Handle erasure in unified customer profiles
  - Scheduled job to purge expired data

- [ ] **Audit Trail**
  - Log all agent-triggered UI changes (who, what, when)
  - Store in `Agent_Action__c` custom object
  - Include: `contextId`, `command`, `result`, `timestamp`, `userId`

- [ ] **Field-Level Security (FLS)**
  - Ensure integration user has Read/Edit on all fields used in broker
  - Regular audit of FLS settings
  - Document required permissions in setup guide

---

## Lower Priority (Nice to Have)

### Development & Testing
- [ ] **CI for Metadata**
  - JSON Schema validation for `Fields_JSON__c` and `Mapping_Rules__c`
  - Test fixtures for common form configurations
  - Block Salesforce deployment on validation failure
  - Automated testing of transformation rules

- [ ] **Integration Tests**
  - End-to-end tests covering full submission flow
  - Tests for degraded mode behavior
  - Load tests for rate limiting and concurrency

- [ ] **Documentation**
  - API documentation with examples
  - Runbook for common operational tasks
  - Troubleshooting guide for SREs

---

## Implementation Priority

### Phase 1: Security Foundation (Weeks 1-2)
1. Policy guardrails (allowlists, rate limits)
2. Idempotency keys on submissions
3. Version pinning for form definitions

### Phase 2: Reliability (Weeks 3-4)
4. Degraded mode (cached form defs, outbox pattern)
5. Secure token storage (KMS, encryption)
6. Delivery guarantees (receipts, retry logic)

### Phase 3: Observability (Weeks 5-6)
7. Distributed tracing
8. SLOs and alerting
9. Masked logging

### Phase 4: Governance (Weeks 7-8)
10. Data classification and retention
11. Erasure flows
12. Audit trail

---

## Architecture Review Scores

| Category | Current | With Mitigations | Target |
|----------|---------|------------------|--------|
| Fit for Salesforce agent use-cases | 5/5 | 5/5 | ✅ |
| Security | 2-3/5 | 4/5 | ✅ |
| Reliability & UX under SFDC hiccups | 3.5/5 | 4.5/5 | ✅ |
| Operability/observability | 4/5 | 4.5/5 | ✅ |
| Change velocity (business-led) | 5/5 | 5/5 | ✅ |
| Total cost/complexity | 3/5 | 3/5 | ⚠️ |

---

## Next Steps

1. Review this checklist with the team
2. Prioritize items based on business needs
3. Create implementation tickets for Phase 1 items
4. Schedule architecture review after Phase 1 completion
5. Update documentation as mitigations are implemented

---

**Last Updated**: 2024  
**Based on**: Architecture Review  
**Status**: In Progress

