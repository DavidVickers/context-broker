# Form Versioning Architecture (ContentDocument Pattern)

## Problem Statement

**Current Issue**: When admins update form definitions in Salesforce while users have forms loaded:
1. User loads form (Fields: A, B, C)
2. Admin updates form in Salesforce (Fields: A, B, D - removes C, adds D)
3. User submits → **mapping fails** because field C no longer exists

**Impact**: Form submissions fail, user data lost, poor UX

## Proposed Solution: ContentDocument/ContentVersion Pattern

Model after Salesforce's native versioning system used for files and documents.

### Salesforce ContentDocument Pattern

**ContentDocument** (Parent):
- Permanent ID that never changes
- `LatestPublishedVersionId` → points to current version
- Title and metadata

**ContentVersion** (Version):
- Multiple versions per document
- `IsFeatured` flag → marks current/published version
- `VersionNumber` → incremental (1, 2, 3...)
- Actual content/data stored here

### Our Form Versioning Model

```
Form_Master__c (Parent - like ContentDocument)
├── Form_Version__c (Version 1 - old)
├── Form_Version__c (Version 2 - old)
└── Form_Version__c (Version 3 - current) ← Current__c = true
```

## Data Model

### 1. Form_Master__c (Parent Object)

**Purpose**: Permanent identifier for a form across all versions

**Fields**:
```
- Id (Salesforce ID) - permanent form identifier
- Form_Id__c (Text, External ID, Unique) - "test-drive-form" (business key)
- Name (Text) - "Test Drive Form"
- Active__c (Checkbox) - Is form accepting submissions?
- Latest_Published_Version__c (Lookup → Form_Version__c) - Current version
- Created_Date (DateTime)
- Last_Modified_Date (DateTime)
- Description__c (Long Text Area) - Form description
```

**Key Concept**: This ID NEVER changes. It's the permanent identifier.

### 2. Form_Version__c (Version Object)

**Purpose**: Store version-specific form definitions

**Fields**:
```
- Id (Salesforce ID) - unique version identifier
- Name (Auto-number) - "FV-00001"
- Form_Master__c (Master-Detail → Form_Master__c) - Parent form
- Version_Number__c (Number, Unique per Form_Master) - 1, 2, 3...
- Current__c (Checkbox, Formula) - Is this the current/published version?
- Fields_JSON__c (Long Text Area) - Form structure (sections, fields)
- Mapping_Rules__c (Long Text Area) - Field mappings + transformations
- Agent_Config__c (Long Text Area) - Agent settings
- Published_Date__c (DateTime) - When this version was published
- Created_By_User__c (Lookup → User) - Who created this version
- Change_Notes__c (Long Text Area) - What changed in this version
- Status__c (Picklist) - Draft | Published | Archived
```

**Formula for Current__c**:
```apex
Form_Master__r.Latest_Published_Version__c = Id
```

### 3. Form_Submission__c (Updated)

**Add Fields**:
```
- Form_Master__c (Lookup → Form_Master__c) - Which form (parent)
- Form_Version__c (Lookup → Form_Version__c) - Which version was used
- Version_Number__c (Number) - Snapshot of version used (for reporting)
```

**Why Both?**
- `Form_Master__c` → Group all submissions by form (regardless of version)
- `Form_Version__c` → Know exact version used for each submission
- `Version_Number__c` → Reporting/analytics without joining

## API Changes

### Current Behavior (Single Version)
```
GET /api/forms/test-drive-form
→ Returns latest form definition
```

### New Behavior (Multi-Version)

#### 1. Get Latest Version (Default)
```
GET /api/forms/test-drive-form
→ Returns latest published version
```

**Query**:
```sql
SELECT Id, Latest_Published_Version__c 
FROM Form_Master__c 
WHERE Form_Id__c = 'test-drive-form'

-- Then get version:
SELECT Fields_JSON__c, Mapping_Rules__c, Version_Number__c
FROM Form_Version__c
WHERE Id = :latestPublishedVersionId
```

**Response**:
```json
{
  "formId": "test-drive-form",
  "formMasterId": "a0B...",
  "versionId": "a0C...",
  "versionNumber": 3,
  "fields": [...],
  "mappings": {...},
  "agentConfig": {...}
}
```

#### 2. Get Specific Version (Pinned)
```
GET /api/forms/test-drive-form?version=2
→ Returns version 2 (supports old sessions)
```

**Query**:
```sql
SELECT Id FROM Form_Master__c WHERE Form_Id__c = 'test-drive-form'

-- Then get specific version:
SELECT Fields_JSON__c, Mapping_Rules__c, Version_Number__c
FROM Form_Version__c
WHERE Form_Master__c = :formMasterId
  AND Version_Number__c = 2
```

#### 3. Submit with Version Pinning
```
POST /api/forms/test-drive-form/submit
{
  "contextId": "test-drive-form:uuid",
  "versionNumber": 2,  ← Pin to version loaded
  "formData": {...}
}
```

**Validation**:
1. Check if `versionNumber` matches session's stored version
2. If mismatch → return 409 Conflict
3. If version doesn't exist → return 404 Not Found

## Session Management Changes

### Current Session Data
```typescript
interface SessionData {
  sessionId: string;
  formId: string;
  contextId: string;
  startTime: Date;
  formData?: Record<string, any>;
}
```

### New Session Data (With Versioning)
```typescript
interface SessionData {
  sessionId: string;
  formId: string;  // Business key (e.g., "test-drive-form")
  formMasterId: string;  // Salesforce Form_Master__c.Id
  versionId: string;  // Salesforce Form_Version__c.Id
  versionNumber: number;  // Version number (1, 2, 3...)
  contextId: string;
  startTime: Date;
  formData?: Record<string, any>;
  versionLoadedAt: Date;  // When this version was loaded
}
```

**Version Pinning Flow**:
1. User requests form → broker fetches latest version
2. Broker stores `versionNumber` in session
3. User submits → broker validates submission uses same `versionNumber`
4. If version mismatch → reject with 409

## Version Lifecycle

### 1. Create New Version (Draft)

**Trigger**: Admin clicks "Edit Form" in Salesforce

**Process**:
1. Create new `Form_Version__c` record
2. Copy fields from current version (or start fresh)
3. Set `Status__c = 'Draft'`
4. Increment `Version_Number__c`
5. Do NOT update `Latest_Published_Version__c` yet

**State**: New version exists but not published (users still see old version)

### 2. Publish Version (Make Current)

**Trigger**: Admin clicks "Publish" in Salesforce

**Process**:
1. Update `Form_Version__c.Status__c = 'Published'`
2. Set `Published_Date__c = NOW()`
3. Update `Form_Master__c.Latest_Published_Version__c = new version ID`
4. **Critical**: Old version remains accessible (status → Archived)

**State**: New users see new version, old sessions continue with old version

### 3. Archive Old Version

**Trigger**: Automatic after publish (or manual)

**Process**:
1. Update old `Form_Version__c.Status__c = 'Archived'`
2. Keep record in database (don't delete)
3. Continue supporting submissions with old version

**State**: Old version read-only, still accessible via version number

### 4. Deprecate Version (Optional)

**Trigger**: Admin sets deprecation date

**Process**:
1. Set `Deprecated_Date__c` on old version
2. After X days, start returning warnings to old sessions
3. After Y days, reject submissions with 410 Gone

**State**: Force users to refresh to new version

## Migration Strategy

### Phase 1: Add New Objects (Non-Breaking)

1. Create `Form_Master__c` object
2. Create `Form_Version__c` object
3. Migrate existing `Form_Definition__c` records:
   ```apex
   for (Form_Definition__c oldForm : existingForms) {
     // Create master
     Form_Master__c master = new Form_Master__c(
       Form_Id__c = oldForm.Form_Id__c,
       Name = oldForm.Name,
       Active__c = oldForm.Active__c
     );
     insert master;
     
     // Create version 1
     Form_Version__c version = new Form_Version__c(
       Form_Master__c = master.Id,
       Version_Number__c = 1,
       Fields_JSON__c = oldForm.Fields_JSON__c,
       Mapping_Rules__c = oldForm.Mapping_Rules__c,
       Agent_Config__c = oldForm.Agent_Config__c,
       Status__c = 'Published',
       Published_Date__c = oldForm.CreatedDate
     );
     insert version;
     
     // Link master to version
     master.Latest_Published_Version__c = version.Id;
     update master;
   }
   ```

### Phase 2: Update Broker (Backward Compatible)

1. Update queries to check both `Form_Definition__c` (old) and `Form_Master__c` (new)
2. Store `versionNumber` in sessions
3. Add version validation on submission (warn but don't reject)

### Phase 3: Enforce Version Pinning

1. Reject submissions with version mismatch (409 Conflict)
2. Remove `Form_Definition__c` fallback queries
3. Require `versionNumber` in all submissions

### Phase 4: Deprecate Old Object

1. Mark `Form_Definition__c` as deprecated
2. Remove from broker code
3. Delete old object (after all data migrated)

## Edge Cases & Solutions

### Edge Case 1: User Loads Form, Admin Publishes New Version, User Submits

**Scenario**:
- T0: User loads form (version 2)
- T1: Admin publishes version 3
- T2: User submits with version 2

**Solution**:
- Submission succeeds (version 2 still supported)
- Response includes warning: `"formVersionOutdated": true`
- Frontend shows banner: "A new version is available. Refresh to see latest fields."

### Edge Case 2: Version Deleted/Archived During Session

**Scenario**:
- User loads form (version 2)
- Admin deletes version 2
- User submits

**Solution**:
- Return 410 Gone with message: "Form version no longer supported. Please refresh."
- Frontend forces page refresh to load current version

### Edge Case 3: Session Spans Multiple Days, Version Deprecated

**Scenario**:
- User loads form Monday (version 2)
- Session persists 3 days (24h TTL extended)
- Version 2 deprecated Wednesday
- User submits Thursday

**Solution**:
- Set deprecation grace period (e.g., 7 days)
- After grace period, return 409 with `mustRefresh: true`
- Frontend redirects to form URL (loads current version)

### Edge Case 4: Parallel Edits (Two Admins)

**Scenario**:
- Admin A creates version 3 (draft)
- Admin B creates version 3 (draft)
- Both try to publish

**Solution**:
- Use `Version_Number__c` as unique constraint per `Form_Master__c`
- Second publish fails with duplicate error
- Require B to create version 4 instead

### Edge Case 5: Submit to Draft Version (Security)

**Scenario**:
- Attacker discovers draft version ID
- Attempts to submit to unpublished version

**Solution**:
- Broker validates `Status__c = 'Published'` before accepting submission
- Return 403 Forbidden: "Cannot submit to draft version"
- Log attempt for security audit

## Benefits of This Approach

### 1. **Zero Downtime Deployments**
- Publish new version without breaking in-flight sessions
- Users complete forms with version they loaded
- No "form suddenly changed" errors

### 2. **Audit Trail**
- Every submission linked to exact version used
- Track which version had highest conversion rate
- Debug issues by replaying submission with original version

### 3. **A/B Testing Support**
- Deploy version 3 to 10% of users (via API logic)
- Compare conversion rates between version 2 and 3
- Promote winner to 100%

### 4. **Rollback Capability**
- If version 3 has bugs, revert `Latest_Published_Version__c` to version 2
- Instant rollback without data loss
- Fix version 3, republish when ready

### 5. **Compliance & Data Integrity**
- Know exact form questions user saw at submission time
- Reconstruct submission experience for legal/audit
- Map old field names to new field names via version history

## Implementation Complexity

### Low Complexity (Quick Wins)
- ✅ Add `versionNumber` to session
- ✅ Add version query parameter to GET endpoint
- ✅ Store version in `Form_Submission__c`

### Medium Complexity
- ⚠️ Create new Salesforce objects (`Form_Master__c`, `Form_Version__c`)
- ⚠️ Migrate existing data to new structure
- ⚠️ Update broker queries to use new objects

### High Complexity
- ❌ Build Salesforce UI for version management (Draft → Publish workflow)
- ❌ Implement A/B testing with version distribution
- ❌ Version deprecation automation with grace periods

## Recommendation

**Phase 1 (Current Sprint)**: Quick win version tracking
- Add `versionNumber` to session
- Store in `Form_Submission__c` for audit trail
- Add version mismatch warnings (don't reject yet)

**Phase 2 (Next Sprint)**: Full ContentDocument pattern
- Create new Salesforce objects
- Migrate data
- Enforce version pinning (reject mismatches)

**Phase 3 (Future)**: Advanced features
- Salesforce version management UI
- A/B testing support
- Deprecation automation

## Questions to Resolve

1. **Grace Period**: How long should old versions remain supported after new publish?
   - Recommendation: 7 days (covers weekend form abandonment)

2. **Max Versions**: Should we limit stored versions per form?
   - Recommendation: Keep all versions (disk is cheap, audit trail valuable)

3. **Version Naming**: Auto-increment or semantic (Major.Minor.Patch)?
   - Recommendation: Auto-increment (simpler, Salesforce native)

4. **API Breaking Change**: Require `versionNumber` in submission or optional?
   - Recommendation: Optional with warning first, then required after migration

5. **Session TTL**: Keep 24 hours or extend for long forms?
   - Recommendation: 24 hours, but allow version submissions for 7 days

## Next Steps

1. **Review & Approve**: Team reviews this architecture
2. **Salesforce Schema**: Create objects in sandbox
3. **Migration Script**: Write Apex to migrate existing forms
4. **Broker Updates**: Update queries and session management
5. **Testing**: Verify old sessions work after new version publish
6. **Documentation**: Update API docs with version parameters

---

**Status**: 🟡 Architectural Design (Awaiting Approval)  
**Complexity**: High (but necessary for production)  
**Timeline**: 2-3 sprints for full implementation  
**Quick Win Available**: Yes (Phase 1 can be done in 1 day)

