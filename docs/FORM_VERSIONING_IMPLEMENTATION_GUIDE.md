# Form Versioning Implementation Guide

## Status
**🟡 DOCUMENTED BUT NOT IMPLEMENTED**  
**Use Case**: Demo org - versioning not critical yet  
**Priority**: Implement before production deployment with frequent form updates

---

## Executive Summary

Form versioning prevents submission failures when admins update forms while users have them loaded. Based on Salesforce's ContentDocument/ContentVersion pattern.

**Two-Phase Approach**:
- **Phase 1 (Quick Win)**: Add version tracking to existing objects - 1-2 days
- **Phase 2 (Full Solution)**: Implement ContentDocument pattern - 2-3 weeks

---

## Phase 1: Quick Version Tracking (Recommended First Step)

### Salesforce Changes

#### 1. Add Fields to Form_Definition__c

```xml
<!-- In: salesforce/force-app/main/default/objects/Form_Definition__c/fields/ -->

<!-- Version__c.field-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Version__c</fullName>
    <description>Version number for form definition. Increment when form structure changes.</description>
    <label>Version</label>
    <precision>3</precision>
    <scale>0</scale>
    <type>Number</type>
    <defaultValue>1</defaultValue>
    <required>false</required>
</CustomField>

<!-- Last_Published_Date__c.field-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Last_Published_Date__c</fullName>
    <description>Date this version was last published/updated</description>
    <label>Last Published Date</label>
    <type>DateTime</type>
    <required>false</required>
</CustomField>

<!-- Change_Notes__c.field-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Change_Notes__c</fullName>
    <description>Description of what changed in this version</description>
    <label>Change Notes</label>
    <type>LongTextArea</type>
    <length>5000</length>
    <required>false</required>
    <visibleLines>5</visibleLines>
</CustomField>
```

#### 2. Add Fields to Form_Submission__c

```xml
<!-- Version_Number__c.field-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>Version_Number__c</fullName>
    <description>Version of form used for this submission (snapshot for reporting)</description>
    <label>Form Version</label>
    <precision>3</precision>
    <scale>0</scale>
    <type>Number</type>
    <required>false</required>
</CustomField>
```

#### 3. Deploy Fields

```bash
cd salesforce
sfdx force:source:deploy -p force-app/main/default/objects/Form_Definition__c/fields/Version__c.field-meta.xml
sfdx force:source:deploy -p force-app/main/default/objects/Form_Definition__c/fields/Last_Published_Date__c.field-meta.xml
sfdx force:source:deploy -p force-app/main/default/objects/Form_Definition__c/fields/Change_Notes__c.field-meta.xml
sfdx force:source:deploy -p force-app/main/default/objects/Form_Submission__c/fields/Version_Number__c.field-meta.xml
```

#### 4. Initialize Existing Forms

```apex
// Run this once after deploying fields
List<Form_Definition__c> forms = [SELECT Id, Version__c FROM Form_Definition__c];
for (Form_Definition__c form : forms) {
    if (form.Version__c == null) {
        form.Version__c = 1;
        form.Last_Published_Date__c = System.now();
    }
}
update forms;
```

### Broker Changes

#### 1. Update Session Interface

```typescript
// broker/src/services/session.ts

export interface SessionData {
  sessionId: string;
  formId: string;
  contextId: string;
  startTime: Date;
  lastActivity: Date;
  formData?: Record<string, any>;
  agentContext?: Record<string, any>;
  expiresAt: Date;
  
  // NEW: Version tracking
  versionNumber?: number;        // Version loaded with form
  versionLoadedAt?: Date;        // When version was loaded
  formDefinitionId?: string;     // Salesforce Form_Definition__c.Id
}
```

#### 2. Update GET /api/forms/:formId

```typescript
// broker/src/routes/forms.ts (line ~37 and ~124)

// Update SOQL queries to include Version__c:
const query = `
  SELECT 
    Id, 
    Name, 
    Form_Id__c, 
    Fields_JSON__c, 
    Mapping_Rules__c, 
    Agent_Config__c, 
    Active__c,
    Version__c,              -- ADD THIS
    Last_Published_Date__c   -- ADD THIS
  FROM Form_Definition__c 
  WHERE Form_Id__c = '${formId}' 
  LIMIT 1
`;

// Update response to include version:
const response: any = {
  formId: formRecord.Form_Id__c || formRecord.Name || formId,
  name: formRecord.Name || 'Unnamed Form',
  mappings,
  agentConfig,
  active: formRecord.Active__c !== false,
  
  // NEW: Version info
  versionNumber: formRecord.Version__c,
  formDefinitionId: formRecord.Id,
  lastPublished: formRecord.Last_Published_Date__c,
};
```

#### 3. Store Version in Session

```typescript
// broker/src/routes/sessions.ts

// When creating session after form load:
export const createSession = (
  formId: string, 
  sessionId?: string,
  versionNumber?: number,      // NEW parameter
  formDefinitionId?: string    // NEW parameter
): SessionData => {
  const sid = sessionId || generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const sessionData: SessionData = {
    sessionId: sid,
    formId,
    contextId: createContextId(formId, sid),
    startTime: now,
    lastActivity: now,
    expiresAt,
    
    // NEW: Store version loaded
    versionNumber,
    versionLoadedAt: now,
    formDefinitionId,
  };

  sessions.set(sid, sessionData);
  return sessionData;
};
```

#### 4. Validate Version on Submission

```typescript
// broker/src/routes/forms.ts (POST /:formId/submit)

// After session retrieval (around line 333):
const session = getSessionByContextId(contextId);
if (!session) {
  // ... existing error handling
}

// NEW: Check version mismatch
if (session.versionNumber && formRecord.Version__c) {
  if (session.versionNumber !== formRecord.Version__c) {
    console.warn(`⚠️ Version mismatch detected!`);
    console.warn(`   Session version: ${session.versionNumber}`);
    console.warn(`   Current version: ${formRecord.Version__c}`);
    console.warn(`   Session age: ${Date.now() - session.versionLoadedAt.getTime()}ms`);
    
    // For now: WARN but don't reject (graceful degradation)
    // Later: Can return 409 Conflict if strict version enforcement needed
  }
}
```

#### 5. Store Version in Submission

```typescript
// broker/src/routes/forms.ts (around line 800)

const submissionRecord: Record<string, any> = {
  Form_Definition__c: formRecord.Id,
  Form_Id__c: validatedFormId,
  Submission_Data__c: JSON.stringify(formData),
  
  // NEW: Store version used
  Version_Number__c: session.versionNumber || formRecord.Version__c,
};
```

#### 6. Add Version Warning to Response

```typescript
// broker/src/routes/forms.ts (around line 1068)

const response: any = {
  success: true,
  recordId: submissionId,
  businessRecordIds: businessRecordIds.map(r => ({ id: r.id, objectType: r.objectType })),
  relationshipIds: relationshipIds,
  contextId: contextId || null,
  message: existingSubmission 
    ? 'Form submission already exists (duplicate Context_ID__c) - using existing record' 
    : 'Form submitted successfully',
  isDuplicate: existingSubmission,
  
  // NEW: Version mismatch warning
  formVersionOutdated: session.versionNumber && session.versionNumber !== formRecord.Version__c,
  sessionVersion: session.versionNumber,
  currentVersion: formRecord.Version__c,
};
```

### Frontend Changes (Optional)

```typescript
// frontend/src/services/sessionManager.ts

interface SessionData {
  sessionId: string;
  contextId: string;
  formId: string;
  createdAt: Date;
  
  // NEW: Version tracking
  versionNumber?: number;
  formDefinitionId?: string;
}

// Store version when creating session
export const createSession = async (
  formId: string, 
  formDefinition: FormDefinition
): Promise<SessionData> => {
  const sessionId = generateSessionId();
  const contextId = `${formId}:${sessionId}`;
  
  const session: SessionData = {
    sessionId,
    contextId,
    formId,
    createdAt: new Date(),
    
    // NEW: Store version from form definition
    versionNumber: formDefinition.versionNumber,
    formDefinitionId: formDefinition.formDefinitionId,
  };
  
  localStorage.setItem(`session_${formId}`, JSON.stringify(session));
  return session;
};
```

```tsx
// frontend/src/components/FormRenderer.tsx

// Show warning banner if version outdated
{response.formVersionOutdated && (
  <div className="version-warning-banner">
    ⚠️ A new version of this form is available. 
    <button onClick={() => window.location.reload()}>
      Refresh to see latest
    </button>
  </div>
)}
```

### Testing Phase 1

```bash
# Test 1: Version tracking
curl http://localhost:3001/api/forms/test-form
# Should return: "versionNumber": 1

# Test 2: Create session with version
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"formId": "test-form", "versionNumber": 1}'

# Test 3: Update form version in Salesforce
# Manually: Set Version__c = 2 on Form_Definition__c record

# Test 4: Submit with old session
curl -X POST http://localhost:3001/api/forms/test-form/submit \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-form:uuid",
    "formData": {"name": "Test"}
  }'
# Should return: "formVersionOutdated": true

# Test 5: Verify version stored in submission
# Check Form_Submission__c.Version_Number__c = 1 (old version)
```

---

## Phase 2: Full ContentDocument Pattern (Future)

### When to Implement

Implement Phase 2 when:
- Admins update forms frequently (daily/weekly)
- Need draft/publish workflow
- Need A/B testing (multiple live versions)
- Need audit trail of all form changes
- Need rollback capability

### New Salesforce Objects

#### Form_Master__c (Parent)

```xml
<!-- salesforce/force-app/main/default/objects/Form_Master__c/ -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Form Master</label>
    <pluralLabel>Form Masters</pluralLabel>
    <nameField>
        <label>Form Name</label>
        <type>Text</type>
    </nameField>
    
    <!-- Fields -->
    <fields>
        <fullName>Form_Id__c</fullName>
        <label>Form ID</label>
        <type>Text</type>
        <unique>true</unique>
        <externalId>true</externalId>
        <required>true</required>
        <length>255</length>
    </fields>
    
    <fields>
        <fullName>Active__c</fullName>
        <label>Active</label>
        <type>Checkbox</type>
        <defaultValue>true</defaultValue>
    </fields>
    
    <fields>
        <fullName>Latest_Published_Version__c</fullName>
        <label>Latest Published Version</label>
        <type>Lookup</type>
        <referenceTo>Form_Version__c</referenceTo>
        <relationshipName>LatestVersion</relationshipName>
    </fields>
    
    <fields>
        <fullName>Description__c</fullName>
        <label>Description</label>
        <type>LongTextArea</type>
        <length>5000</length>
    </fields>
</CustomObject>
```

#### Form_Version__c (Version)

```xml
<!-- salesforce/force-app/main/default/objects/Form_Version__c/ -->
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Form Version</label>
    <pluralLabel>Form Versions</pluralLabel>
    
    <fields>
        <fullName>Form_Master__c</fullName>
        <label>Form Master</label>
        <type>MasterDetail</type>
        <referenceTo>Form_Master__c</referenceTo>
        <required>true</required>
    </fields>
    
    <fields>
        <fullName>Version_Number__c</fullName>
        <label>Version Number</label>
        <type>Number</type>
        <precision>3</precision>
        <scale>0</scale>
        <unique>false</unique>
        <required>true</required>
    </fields>
    
    <fields>
        <fullName>Status__c</fullName>
        <label>Status</label>
        <type>Picklist</type>
        <valueSet>
            <valueSetDefinition>
                <value>
                    <fullName>Draft</fullName>
                    <default>true</default>
                </value>
                <value>
                    <fullName>Published</fullName>
                    <default>false</default>
                </value>
                <value>
                    <fullName>Archived</fullName>
                    <default>false</default>
                </value>
            </valueSetDefinition>
        </valueSet>
    </fields>
    
    <fields>
        <fullName>Fields_JSON__c</fullName>
        <label>Fields JSON</label>
        <type>LongTextArea</type>
        <length>131072</length>
    </fields>
    
    <fields>
        <fullName>Mapping_Rules__c</fullName>
        <label>Mapping Rules</label>
        <type>LongTextArea</type>
        <length>131072</length>
    </fields>
    
    <fields>
        <fullName>Agent_Config__c</fullName>
        <label>Agent Config</label>
        <type>LongTextArea</type>
        <length>131072</length>
    </fields>
    
    <fields>
        <fullName>Published_Date__c</fullName>
        <label>Published Date</label>
        <type>DateTime</type>
    </fields>
    
    <fields>
        <fullName>Change_Notes__c</fullName>
        <label>Change Notes</label>
        <type>LongTextArea</type>
        <length>5000</length>
    </fields>
    
    <!-- Formula field for Current__c -->
    <fields>
        <fullName>Current__c</fullName>
        <label>Is Current</label>
        <type>Checkbox</type>
        <formula>Form_Master__r.Latest_Published_Version__c = Id</formula>
    </fields>
</CustomObject>
```

### Migration Script (Phase 2)

```apex
// Run once to migrate from Phase 1 to Phase 2
public class MigrateFormsToVersioning {
    public static void migrate() {
        List<Form_Master__c> masters = new List<Form_Master__c>();
        List<Form_Version__c> versions = new List<Form_Version__c>();
        Map<Id, Id> oldToMaster = new Map<Id, Id>();
        
        // Step 1: Create Form_Master records
        for (Form_Definition__c oldForm : [
            SELECT Id, Form_Id__c, Name, Active__c, Description__c
            FROM Form_Definition__c
        ]) {
            Form_Master__c master = new Form_Master__c(
                Form_Id__c = oldForm.Form_Id__c,
                Name = oldForm.Name,
                Active__c = oldForm.Active__c,
                Description__c = oldForm.Description__c
            );
            masters.add(master);
        }
        insert masters;
        
        // Map old IDs to new master IDs
        Integer i = 0;
        for (Form_Definition__c oldForm : [SELECT Id FROM Form_Definition__c ORDER BY Id]) {
            oldToMaster.put(oldForm.Id, masters[i].Id);
            i++;
        }
        
        // Step 2: Create Form_Version records (Version 1)
        for (Form_Definition__c oldForm : [
            SELECT Id, Fields_JSON__c, Mapping_Rules__c, Agent_Config__c, 
                   Version__c, Last_Published_Date__c, Change_Notes__c
            FROM Form_Definition__c
        ]) {
            Form_Version__c version = new Form_Version__c(
                Form_Master__c = oldToMaster.get(oldForm.Id),
                Version_Number__c = oldForm.Version__c != null ? oldForm.Version__c : 1,
                Status__c = 'Published',
                Fields_JSON__c = oldForm.Fields_JSON__c,
                Mapping_Rules__c = oldForm.Mapping_Rules__c,
                Agent_Config__c = oldForm.Agent_Config__c,
                Published_Date__c = oldForm.Last_Published_Date__c != null ? 
                    oldForm.Last_Published_Date__c : System.now(),
                Change_Notes__c = 'Migrated from Form_Definition__c'
            );
            versions.add(version);
        }
        insert versions;
        
        // Step 3: Update Form_Master with Latest_Published_Version__c
        i = 0;
        List<Form_Master__c> mastersToUpdate = new List<Form_Master__c>();
        for (Form_Master__c master : masters) {
            master.Latest_Published_Version__c = versions[i].Id;
            mastersToUpdate.add(master);
            i++;
        }
        update mastersToUpdate;
        
        System.debug('Migrated ' + masters.size() + ' forms to versioning system');
    }
}
```

### Broker Updates (Phase 2)

```typescript
// broker/src/routes/forms.ts

// NEW: Support version query parameter
router.get('/:formId', async (req: Request, res: Response) => {
  const { formId } = req.params;
  const version = req.query.version as string | undefined;
  
  // Query Form_Master
  const masterQuery = `
    SELECT Id, Latest_Published_Version__c 
    FROM Form_Master__c 
    WHERE Form_Id__c = '${formId}'
  `;
  
  const masterResult = await conn.query(masterQuery);
  const master = masterResult.records[0];
  
  // Get specific version or latest
  let versionQuery;
  if (version) {
    // Get specific version number
    versionQuery = `
      SELECT Id, Version_Number__c, Fields_JSON__c, Mapping_Rules__c
      FROM Form_Version__c
      WHERE Form_Master__c = '${master.Id}'
        AND Version_Number__c = ${version}
        AND Status__c = 'Published'
    `;
  } else {
    // Get latest published version
    versionQuery = `
      SELECT Id, Version_Number__c, Fields_JSON__c, Mapping_Rules__c
      FROM Form_Version__c
      WHERE Id = '${master.Latest_Published_Version__c}'
    `;
  }
  
  const versionResult = await conn.query(versionQuery);
  const formVersion = versionResult.records[0];
  
  // Return with version info
  res.json({
    formId,
    formMasterId: master.Id,
    versionId: formVersion.Id,
    versionNumber: formVersion.Version_Number__c,
    fields: JSON.parse(formVersion.Fields_JSON__c),
    mappings: JSON.parse(formVersion.Mapping_Rules__c),
  });
});
```

---

## When to Implement

### Phase 1: Implement When...
- Admins start updating forms monthly
- Need to track which version users submitted
- Want to warn users about outdated forms
- **Effort**: 1-2 days

### Phase 2: Implement When...
- Admins update forms weekly or daily
- Need draft/publish workflow (test before going live)
- Need A/B testing (run multiple versions)
- Need audit trail and rollback capability
- **Effort**: 2-3 weeks

---

## Monitoring & Metrics

After implementation, track:

1. **Version Mismatch Rate**: `(outdated submissions / total submissions)`
   - <5%: Normal behavior
   - >20%: Forms changing too frequently

2. **Session Age at Submission**: Time between form load and submit
   - If users take >1 hour, version mismatches more likely

3. **Version Update Frequency**: How often admins publish new versions
   - Daily: Phase 2 needed
   - Monthly: Phase 1 sufficient

---

## Related Documentation

- Full architecture: `docs/FORM_VERSIONING_ARCHITECTURE.md`
- Production checklist: `docs/PRODUCTION_READINESS_CHECKLIST.md`
- Current session management: `broker/src/services/session.ts`

---

## Questions Before Implementation

1. How often do you expect form updates?
2. Do you need draft/publish workflow?
3. Do you need A/B testing?
4. What's your version mismatch tolerance?

**Decision**: Phase 1 or Phase 2?

---

**Last Updated**: 2025-11-03  
**Status**: 📄 Documented, not implemented  
**Recommended**: Implement Phase 1 before production

