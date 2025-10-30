# Form-Aware Agent Architecture Analysis

## Executive Summary

**Your junction object idea is EXCELLENT and aligns with Salesforce best practices.** However, we can refine it slightly for optimal scalability and flexibility.

## Current Architecture (Baseline)

```
Form_Definition__c (Master)
  └─ Form_Submission__c (Detail) - flattened, tracks submission metadata
     ├─ Context_ID__c (formId:sessionId)
     ├─ Session_ID__c (UUID)
     └─ Submission_Data__c (JSON)
```

**Problem:** 
- Mapping_Rules__c creates records in Lead/Case/Contact/etc., but no formal link back
- Cannot easily query "all Leads submitted via forms" or "form submissions that created Cases"
- Submission tracking and business object creation are decoupled

## Proposed Architecture Options

### ✅ **Option 1: Junction Object with Polymorphic Lookup (REFINED)**

**Recommended Pattern:**

```
Form_Definition__c
  └─ Form_Submission__c (Junction Object)
     ├─ Form_Definition__c (Master-Detail)
     ├─ Related_Record__c (Polymorphic Lookup)
     ├─ Related_Object_Type__c (Text: Lead, Case, Contact, etc.)
     ├─ Context_ID__c (formId:sessionId) ✅ REQUIRED
     ├─ Session_ID__c (UUID)
     ├─ Submission_Data__c (JSON - full form data)
},     ├─ Adjunct_Data__c (JSON - optional metadata)
     └─ Status__c (Picklist)
```

**Key Field: Related_Record__c (Polymorphic Lookup)**
- Salesforce native polymorphic lookup (`NameOrId` field type)
- Can reference ANY object: Lead, Case, Contact, Opportunity, etc.
- Fully queryable via SOQL

**Benefits:**
1. ✅ **Single source of truth** - One record per form submission
2. ✅ **Trackable** - Can report on "forms that created Leads" vs "forms that created Cases"
3. ✅ **Bi-directional** - From Lead, find its Form_Submission; from Form_Submission, find the Lead
4. ✅ **Flexible** - New object types don't require schema changes
5. ✅ **Queryable** - Standard SOQL joins work
6. ✅ **Pattern-compliant** - Standard Salesforce junction object pattern

**Limitations:**
- Polymorphic lookups can't have required=true (acceptable trade-off)
- Need to set Related_Object_Type__c manually for filtering

### Option 2: Separate Tracking Object (NOT RECOMMENDED)

Create Form_Submission__c separate from the business object. Problems:
- ❌ Two-step creation (more API calls)
- ❌ Risk of orphaned records
- ❌ More complex error handling

### Option 3: JSON Reference (NOT RECOMMENDED)

Store created record ID in JSON. Problems:
- ❌ Not queryable via SOQL
- ❌ No referential integrity
- ❌ Can't build reports easily

## ✅ Recommended Architecture: Hybrid Approach

**Best of both worlds:**

### Core Objects:

```
Form_Definition__c
├─ Form_Id__c (Text, Unique, Required)
├─ Fields_JSON__c (LongTextArea - form schema)
├─ Mapping_Rules__c (LongTextArea - JSON mappings)
└─ Agent_Config__c (LongTextArea - agent settings)

作物_Submission__c (Junction Object)
├─ Form_Definition__c (Master-Detail, Required)
├─ Related_Record__c (Polymorphic Lookup - to Lead/Case/Contact/etc.)
├─ Related_Object_Type__c (Text - "Lead", "Case", etc.)
├─ Context_ID__c (Text, Unique, External ID, Required)
├─ Session_ID__c (Text)
├─ Submission_Data__c (LongTextArea - full JSON payload)
├─ Adjunct_Data__c (LongTextArea - optional metadata JSON)
├─ Status__c (Picklist: Submitted, Processing, Processed, Error)
├─ Submitted_At__c (DateTime)
└─ Processed_At__c (DateTime)
```

### Workflow:

1. **Form Submitted** → Broker receives form data with contextId
2. **Create Business Object** → Based on Mapping_Rules__c, create Lead/Case/Contact/etc.
3. **Create Form_Submission__c** → Link to both Form_Definition__c AND the created record
4. **Single Transaction** → Both records created together (atomic)

## Implementation Patterns

### Broker Flow (forms.ts):

```typescript
// 1. Parse Mapping_Rules__c
const mappings = JSON.parse(formRecord.Mapping_Rules__c);
const targetObject = mappings.salesforceObject; // "Lead", "Case", etc.

// 2. Create target business object first
const businessRecord = createBusinessObject(targetObject, formData, mappings);

// 3. Create Form_Submission__c junction record
const submissionRecord = {
  Form_Definition__c: formRecord.Id,
  Related_Record__c: businessRecord.id, // Polymorphic lookup
  Related_Object_Type__c: targetObject, // For filtering
  Context_ID__c: contextId,
  Session_ID__c: sessionId,
  Submission_Data__c: JSON.stringify(formData),
  Status__c: 'Submitted',
  Submitted_At__c: new Date().toISOString()
};
await createSubmissionRecord(submissionRecord);
```

### Query Patterns:

```sql
-- Find all Leads submitted via forms
SELECT Id, Email, (SELECT Context_ID__c, Submitted_At__c FROM Form_Submissions__r)
FROM Lead
WHERE Id IN (SELECT Related_Record__c FROM Form_Submission__c)

-- Find form submission and related Lead
SELECT Id, Context_ID__c, Related_Record__c, Submission_Data__c
FROM Form_Submission__c
WHERE Related_Record__r.Type = 'Lead'
```

## Schema Changes Required

### Form_Submission__c (New Fields):

1. **Related_Record__c**
   - Type: `Lookup (NameOrId)` - Polymorphic lookup
   - Label: "Related Record"
   - Description: "The record created from this form submission (Lead, Case, Contact, etc.)"

2. **Related_Object_Type__c**
   - Type: `Text` (50)
   - Label: "Related Object Type"
   - Description: "Type of related record (Lead, Case, Contact, etc.)"
   - Help Text: "Populated automatically from Related_Record__c"

3. **Adjunct_Data__c**
   - Type: `LongTextArea` (131072)
   - Label: "Adjunct Data"
   - Description: "Optional metadata, processing notes, agent context"

4. **Processed_At__c**
   - Type: `DateTime`
   - Label: "Processed At"
   - Description: "When the submission was fully processed"

## Migration Path

1. **Phase 1**: Add new fields to Form_Submission__c
2. **Phase 2**: Update broker to create both records in transaction
3. **Phase 3**: Add validation rules (Related_Record__c required if Status = Processed)
4. **Phase 4**: Build reports/dashboards using new relationships

## Scalability Considerations

- ✅ **JSON-based mappings** allow new forms without code changes
- ✅ **Polymorphic lookup** supports new object types without schema changes
- ✅ **Junction pattern** scales to millions of submissions
- ✅ **External ID (Context_ID__c)** enables upsert and deduplication
- ✅ **Status tracking** enables async processing workflows

## Security & Sharing

- Form_Submission__c uses `ControlledByParent` (inherits from Form_Definition__c)
- Consider Record-Level Security on Related_Record__c based on business object access

## Next Steps

1. ✅ Create metadata XML for new fields
2. ✅ Update broker form submission logic
3. ✅ Add validation rules
4. ✅ Create sample reports
5. ✅ Document query patterns

