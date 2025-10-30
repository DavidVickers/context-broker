# Junction Object Pattern Implementation Guide

## Summary

**Your architecture idea is EXCELLENT!** This document shows exactly how to implement it.

## Architecture Overview

```
Form_Definition__c (Master)
  └─ Form_Submission__c (Junction Object)
     ├─ Form_Definition__c (Master-Detail) ✅ Already exists
     ├─ Related_Record_Id__c (Text - ID of created record)
     ├─ Related_Object_Type__c (Text - "Lead", "Case", etc.)
     ├─ Context_ID__c (Text, Unique, External ID) ✅ Already exists
     └─ Submission_Data__c (JSON) ✅ Already exists
```

## Step 1: Deploy New Fields to Salesforce

The metadata file has been updated at:
- `salesforce/force-app/main/default/objects/Form_Submission__c/Form_Submission__c.object-meta.xml`

**New Fields Added:**
1. **Related_Record_Id__c** - Text(18) - Stores ID of created business object
2. **Related_Object_Type__c** - Text(50) - Stores object type ("Lead", "Case", etc.)
3. **Adjunct_Data__c** - LongTextArea(131072) - Optional metadata JSON
4. **Processed_At__c** - DateTime - When processing completed

**Deploy:**
```bash
cd salesforce
sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission__c
```

## Step 2: Update Broker Code

**File:** `broker/src/routes/forms.ts`

**Current Logic (lines 362-425):**
- Tries to create business object with Form_Submission__c fields (WRONG)
- Single record creation

**New Logic (Pattern):**

```typescript
// Determine target Salesforce object from Mapping_Rules__c
const targetBusinessObject = mappings?.salesforceObject || null;
const fieldMappings = mappings?.fieldMappings || {};

// Ensure authenticated connection
if (!authConn) {
  authConn = await getAuthenticatedSalesforceConnectionByContextId('explore_org');
}

// STEP 1: Create business object (Lead, Case, Contact, etc.) if mapping exists
let businessRecordId: string | null = null;
let businessObjectType: string | null = null;

if (targetBusinessObject && targetBusinessObject !== 'Form_Submission__c') {
  // Map ONLY business object fields (no Form_Submission__c fields!)
  const businessRecord: Record<string, any> = {};
  Object.keys(formData).forEach((formField) => {
    const salesforceField = fieldMappings[formField];
    if (salesforceField) {
      businessRecord[salesforceField] = formData[formField];
    }
  });
  
  try {
    const businessResult = await authConn.sobject(targetBusinessObject).create(businessRecord);
    businessRecordId = businessResult.id;
    businessObjectType = targetBusinessObject;
    console.log(`✅ Created ${targetBusinessObject} record: ${businessRecordId}`);
  } catch (error: any) {
    console.error(`❌ Failed to create ${targetBusinessObject}:`, error.message);
    // Continue to create Form_Submission__c for tracking
  }
}

// STEP 2: ALWAYS create Form_Submission__c junction record
const submissionRecord: Record<string, any> = {
  Form_Definition__c: formRecord.Id, // Required Master-Detail
  Form_Id__c: validatedFormId,
  Submission_Data__c: JSON.stringify(formData),
  Submitted_At__c: new Date().toISOString(),
  Status__c: businessRecordId ? 'Processed' : 'Submitted',
};

// Add Context ID and Session ID
if (contextId) {
  submissionRecord.Context_ID__c = contextId;
}
if (sessionId) {
  submissionRecord.Session_ID__c = sessionId;
}

// Link to business record if created
if (businessRecordId) {
  submissionRecord.Related_Record_Id__c = businessRecordId;
  submissionRecord.Related_Object_ recal_Type__c = businessObjectType;
  submissionRecord.Processed_At__c = new Date().toISOString();
}

const submissionResult = await authConn.sobject('Form_Submission__c').create(submissionRecord);
const submissionId = submissionResult.id;

// Return submission ID
res.json({
  success: true,
  recordId: submissionId,
  businessRecordId: businessRecordId,
  businessObjectType: businessObjectType,
  contextId: contextId || null,
  message: 'Form submitted successfully',
});
```

## Step 3: Query Patterns

### Find all Leads submitted via forms:
```sql
SELECT Id, Email, LastName, 
  (SELECT Context_ID__c, Submitted_At__c, Submission_Data__c 
   FROM Form_Submissions__r)
FROM Lead
WHERE Id IN (SELECT Related_Record_Id__c FROM Form_Submission__c 
             WHERE Related_Object_Type__c = 'Lead')
```

### Find form submission and related Lead:
```sql
SELECT Id, Context_ID__c, Related_Record_Id__c, 
       Related_Object_Type__c, Submission_Data__c, Status__c
FROM Form_Submission__c
WHERE Related_Object_Type__c = 'Lead'
  AND Related_Record_Id__c != null
```

### Find submissions without business records (failed processing):
```sql
SELECT Id, Context_ID__c, Form_Id__c, Status__c, Submission_Data__c
FROM Form_Submission__c
WHERE Related_Record_Id__c = null
  AND Status__c = 'Submitted'
```

## Benefits of This Architecture

1. ✅ **Single Source of Truth** - One Form_Submission__c per submission
2. ✅ **Bi-directional Queries** - From Lead → find Form, from Form → find Lead
3. ✅ **Error Tracking** - Failed business object creation still tracked
4. ✅ **Flexible** - Supports any object type without schema changes
5. ✅ **Scalable** - Junction pattern handles millions of records
6. ✅ **Reportable** - Standard SOQL for analytics
7. ✅ **JSON-based** - Mappings defined in Form_Definition__c, no code changes

## Migration Considerations

- **Existing Records:** Records created before this pattern won't have Related_Record_Id__c
- **Backfill Script:** Optionally create Apex batch job to populate Related_Record_Id__c from Submission_Data__c JSON
- **Validation Rules:** Consider adding rule: "If Status = 'Processed', Related_Record_Id__c is required"

## Testing Checklist

- [ ] Deploy new fields to Salesforce
- [ ] Update broker code (forms.ts)
- [ ] Test form submission creating Lead
- [ ] Test form submission creating Case
- [ ] Test form submission with no mapping (just Form_Submission__c)
- [ ] Verify Form_Submission__c has Related_Record_Id__c populated
- [ ] Test querying Leads with Form_Submissions__r
- [ ] Test error handling (Lead creation fails, Form_Submission__c still created)

## Next Steps

1. Deploy metadata to Salesforce
2. Update broker code with new pattern
3. Test with existing "test-drive-form" (maps to Lead)
4. Verify both records created successfully
5. Build reports/dashboards using new relationships

