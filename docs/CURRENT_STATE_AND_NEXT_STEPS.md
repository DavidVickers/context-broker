# Current State & Next Steps

## ✅ What We've Done

1. **Architecture Analysis** - Designed junction object pattern (`ARCHITECTURE_ANALYSIS.md`)
2. **Metadata Prepared** - Created field definitions in `Form_Submission__c.object-meta.xml`
3. **Implementation Guide** - Documented code changes needed (`JUNCTION_OBJECT_IMPLEMENTATION.md`)

## ⚠️ What's NOT Deployed Yet

**Salesforce Fields:**
- ❌ `Related_Record_Id__c` - Not in Salesforce
- ❌ `Related_Object_Type__c` - Not in Salesforce  
- ❌ `Adjunct_Data__c` - Not in Salesforce
- ❌ `Processed_At__c` - Not in Salesforce
- ⚠️ `Context_ID__c` changes (Unique, External ID, Required) - Not applied

**Broker Code:**
- ❌ Form submission logic still uses old pattern
- ❌ No two-step creation (business object + junction record)

## 📋 Deployment Order

### Step 1: Deploy Salesforce Fields FIRST ⚠️ CRITICAL

**File:** `salesforce/force-app/main/default/objects/Form_Submission__c/Form_Submission__c.object-meta.xml`

**Command:**
```bash
cd salesforce
sfdx auth:web:login -r https://test.salesforce.com -a myorg
sfdx project deploy validate --source-dir force-app/main/default/objects/Form_Submission__c
sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission__c
```

**⚠️ Important Considerations:**

1. **Context_ID__c Required Field:**
   - Currently making it `required=true` in metadata
   - **RISK:** Existing `Form_Submission__c` records without `Context_ID__c` will cause validation errors
   - **Options:**
     - **Option A:** Make `required=false` initially, backfill data, then change to `required=true`
     - **Option B:** Ensure all existing records have `Context_ID__c` before deploying
     - **Option C:** Accept that new submissions require contextId (existing records stay as-is)

2. **External ID on Context_ID__c:**
   - This enables upsert and deduplication
   - Good for preventing duplicate submissions

3. **Verification After Deployment:**
   - Check Setup → Object Manager → Form Submission → Fields
   - Verify all 4 new fields exist
   - Check Context_ID__c field properties

### Step 2: Verify Deployment

```bash
# Query to verify fields exist (should not error)
sfdx force:data:soql:query \
  -q "SELECT Id, Related_Record_Id__c, Related_Object_Type__c, Processed_At__c FROM Form_Submission__c LIMIT 1" \
  -u myorg
```

### Step 3: Update Broker Code (AFTER fields deployed)

**File:** `broker/src/routes/forms.ts`

**Pattern:**
1. Create business object first (Lead, Case, etc.) based on `Mapping_Rules__c`
2. Then create `Form_Submission__c` with link to business object
3. Always create `Form_Submission__c` even if business object creation fails

**See:** `docs/JUNCTION_OBJECT_IMPLEMENTATION.md` for exact code

### Step 4: Test

1. Submit form that creates Lead
2. Verify Lead record created
3. Verify Form_Submission__c created
4. Verify `Related_Record_Id__c` points to Lead
5. Verify `Related_Object_Type__c` = "Lead"

## 🚨 Context_ID__c Decision Needed

**Question:** Should `Context_ID__c` be required immediately?

**Recommendation:** Make it **required=false** initially, then:

1. **If you have existing records:**
   - Backfill existing records with contextId values
   - Then change to required=true

2. **If you're starting fresh:**
   - Can make required=true immediately
   - Broker code already sends contextId for all new submissions

**Want me to update the metadata to make Context_ID__c required=false initially?**

## Current Broker Code Status

**Location:** `broker/src/routes/forms.ts` (lines 362-425)

**Current Behavior:**
- Tries to create business object (Lead) with Form_Submission__c fields mixed in
- Results in error: "No such column 'Form_Id__c' on sobject of type Lead"
- Single record creation approach

**New Behavior (after update):**
- Create Lead with only Lead fields
- Create Form_Submission__c separately with link to Lead
- Two-step process with proper error handling

## Files Ready for Deployment

✅ **Ready:**
- `salesforce/force-app/main/default/objects/Form_Submission__c/Form_Submission__c.object-meta.xml`

⏸️ **Waiting:**
- `broker/src/routes/forms.ts` (update after fields deployed)

## Questions to Answer

1. ✅ Make `Context_ID__c` required=false initially? (I recommend YES)
2. ✅ Deploy to sandbox first, then production? (I recommend YES)
3. ✅ Do existing Form_Submission__c records have Context_ID__c values?

