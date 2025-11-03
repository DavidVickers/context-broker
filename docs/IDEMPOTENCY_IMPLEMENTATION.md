# Idempotency Implementation

## Overview

The broker now implements idempotency on form submissions to prevent duplicate record creation when users double-click submit buttons, network retries occur, or browser navigation triggers resubmission.

## How It Works

### 1. Idempotency Key Generation

Each form submission generates a unique idempotency key based on:
- **Context ID**: `formId:sessionId` (unique session identifier)
- **Form Data**: All submitted form fields (deterministically hashed)

Formula: `SHA256(contextId + sortedFormData)`

### 2. Duplicate Detection

When a submission arrives:
1. Generate idempotency key from request
2. Check if key exists in idempotency store
3. **If exists**: Return original response (HTTP 200) without creating duplicate records
4. **If not exists**: Process submission normally and store response with key

### 3. Response Storage

Successful submissions store:
- Idempotency key (SHA256 hash)
- Full response (recordId, businessRecordIds, relationshipIds, etc.)
- Submission timestamp
- Expiration (24 hours, matches session TTL)

### 4. Cleanup

Expired keys are automatically removed every hour to prevent unbounded memory growth.

## Usage

### Client-Side (Frontend)

#### Option 1: Auto-generated Key (Recommended)

The broker automatically generates idempotency keys from `contextId + formData`:

```typescript
// No special headers needed - broker generates key automatically
const response = await submitForm(formId, formData, contextId);
```

#### Option 2: Custom Idempotency Key

Clients can provide custom keys via `Idempotency-Key` header:

```typescript
const idempotencyKey = generateCustomKey(); // e.g., UUID or timestamp-based

await fetch(`/api/forms/${formId}/submit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey, // Custom key
  },
  body: JSON.stringify({ contextId, formData }),
});
```

### Response Handling

#### First Submission (Success)
```json
{
  "success": true,
  "recordId": "a0B...",
  "businessRecordIds": [{"id": "00Q...", "objectType": "Lead"}],
  "relationshipIds": ["a0C..."],
  "contextId": "test-form:550e8400-...",
  "message": "Form submitted successfully"
}
```

#### Duplicate Submission (Idempotent)
```json
{
  "success": true,
  "recordId": "a0B...",
  "businessRecordIds": [{"id": "00Q...", "objectType": "Lead"}],
  "relationshipIds": ["a0C..."],
  "contextId": "test-form:550e8400-...",
  "message": "This submission was already processed. Returning original response.",
  "idempotent": true,
  "originalSubmittedAt": "2025-11-03T18:30:00.000Z"
}
```

**Key differences**:
- `idempotent: true` flag indicates duplicate submission
- `originalSubmittedAt` timestamp shows when first submission occurred
- Same `recordId` and `businessRecordIds` (no duplicates created)
- HTTP 200 status (not 409 Conflict)

## Benefits

### 1. Prevents Duplicate Records
- **Problem**: User clicks submit twice → 2 Leads created in Salesforce
- **Solution**: Second submission returns original response → 1 Lead created

### 2. Safe Retries
- **Problem**: Network timeout → retry creates duplicate record
- **Solution**: Retry with same key → returns original response

### 3. Browser Navigation
- **Problem**: Back button + re-submit → duplicate submission
- **Solution**: Browser resubmits with same data → idempotency check prevents duplicate

## Configuration

### Storage

**Current**: In-memory Map  
**Production**: Should migrate to Redis for:
- Horizontal scaling (multiple broker instances)
- Persistence across broker restarts
- Distributed idempotency checking

### Expiration

- **Default**: 24 hours (matches session TTL)
- **Cleanup**: Every 1 hour
- **Rationale**: Users unlikely to resubmit after 24 hours

## Testing Idempotency

### Test 1: Duplicate Submission (Same Data)

```bash
# First submission
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-form:550e8400-e29b-41d4-a716-446655440000",
    "formData": {"name": "John Doe", "email": "john@example.com"}
  }'

# Second submission (same data) - should return idempotent response
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-form:550e8400-e29b-41d4-a716-446655440000",
    "formData": {"name": "John Doe", "email": "john@example.com"}
  }'
```

**Expected**: Second response has `"idempotent": true` and same `recordId`.

### Test 2: Different Submission (Different Data)

```bash
# Third submission (different email) - should create new record
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-form:550e8400-e29b-41d4-a716-446655440000",
    "formData": {"name": "John Doe", "email": "john2@example.com"}
  }'
```

**Expected**: New submission processed, different `recordId` returned.

### Test 3: Custom Idempotency Key

```bash
# First submission with custom key
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-custom-key-12345" \
  -d '{
    "contextId": "test-form:550e8400-e29b-41d4-a716-446655440000",
    "formData": {"name": "Jane Doe", "email": "jane@example.com"}
  }'

# Second submission with same key - should be idempotent
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-custom-key-12345" \
  -d '{
    "contextId": "test-form:550e8400-e29b-41d4-a716-446655440000",
    "formData": {"name": "DIFFERENT NAME", "email": "different@example.com"}
  }'
```

**Expected**: Second submission returns original response (Jane Doe), even though data is different.

## Production Considerations

### 1. Migrate to Redis

Replace in-memory Map with Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getIdempotentResponse(key: string): Promise<IdempotentResponse | null> {
  const stored = await redis.get(`idempotency:${key}`);
  return stored ? JSON.parse(stored) : null;
}

export async function storeIdempotentResponse(key: string, response: any): Promise<void> {
  const data = {
    idempotencyKey: key,
    response,
    submittedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  await redis.setex(`idempotency:${key}`, 24 * 60 * 60, JSON.stringify(data));
}
```

### 2. Monitor Key Distribution

Track idempotency hit rate:
- **High hit rate** (>10%): Possible UI issues (users clicking multiple times)
- **Low hit rate** (<1%): Normal behavior

### 3. Key Collision Risk

SHA256 provides sufficient entropy:
- **Collision probability**: ~1 in 2^256 (negligible)
- **Real risk**: Same user submitting exact same data twice (intended behavior)

## Troubleshooting

### Issue: Legitimate resubmissions marked as duplicates

**Symptom**: User corrects data and resubmits, but gets original response

**Cause**: Same contextId + similar form data generates same key

**Solution**:
1. Create new session (new contextId) for resubmissions
2. Use custom idempotency key with timestamp
3. Wait 24 hours for key to expire

### Issue: Duplicates still created

**Symptom**: Multiple records created despite idempotency

**Possible causes**:
1. Different `contextId` for each submission
2. Form data changes slightly (whitespace, field order)
3. Broker restarted (in-memory store cleared)

**Solution**:
1. Ensure same `contextId` used for session
2. Normalize form data before submission
3. Migrate to Redis for persistence

## Monitoring

### Metrics to Track

1. **Idempotency Hit Rate**: `(idempotent responses / total submissions) * 100%`
2. **Store Size**: Number of keys in idempotency store
3. **Key Age Distribution**: Time between submission and duplicate attempt

### Logs

Idempotent submissions log:
```
🔄 Duplicate submission detected - returning stored response for idempotency key: 3f2a4b5c...
   Original submission time: 2025-11-03T18:30:00.000Z
```

## Related Files

- **Implementation**: `broker/src/services/idempotency.ts`
- **Integration**: `broker/src/routes/forms.ts` (lines 358-377, 1113-1115)
- **Tests**: (TODO: Add unit tests)

