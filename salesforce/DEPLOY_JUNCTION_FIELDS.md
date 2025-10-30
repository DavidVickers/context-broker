# Deploy Junction Object Fields to Salesforce

## Summary

We've added **4 new fields** to `Form_Submission__c` to support the junction object pattern:

1. **Related_Record_Id__c** (Text, 18) - ID of the business record created (Lead, Case, etc.)
2. **Related_Object_Type__c** (Text, 50) - Type of related record ("Lead", "Case", etc.)
3. **Adjunct_Data__c** (LongTextArea) - Optional metadata JSON
4. **Processed_At__c** (DateTime) - When processing completed

Also updated: **Context_ID__c** to be Unique, External ID, and Required.

## ⚠️ Important Notes

- **DO NOT update broker code yet** - Deploy fields first
- **Context_ID__c changes** - Making it Required means existing records must have values
- **Test in sandbox first** before deploying to production

## Deployment Steps

### Option 1: Deploy via Salesforce CLI (Recommended)

```bash
cd salesforce

# Authenticate to your org (if not already)
sfdx auth:web:login -r https://test.salesforce.com -a myorg

# Validate deployment first (dry-run)
sfdx project deploy validate --source-dir force-app/main/default/objects/Form_Submission__c

# If validation passes, deploy
sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission__c

# Or deploy everything
sfdx project deploy start
```

### Option 2: Deploy via VS Code Salesforce Extension

1. Right-click `Form_Submission__c.object-meta.xml`
2. Select "SFDX: Deploy Source to Org"
3. Review deployment results

### Option 3: Manual Deploy (Salesforce UI)

**Not recommended** - Use CLI for consistency.

## What Gets Deployed

### New Fields:

1. **Related_Record_Id__c**
   - Type: Text (18 characters)
   - Label: Related Record ID
   - Description: ID of record created from form submission
   - Not required (nullable)

2. **Related_Object_Type__c**
   - Type: Text (50 characters)
   - Label: Related Object Type
   - Description: Type of related record ("Lead", "Case", etc.)
   - Not required (nullable)

3. **Adjunct_Data__c**
   - Type: Long Text Area (131,072 characters)
   - Label: Adjunct Data
   - Visible Lines: 10
   - Description: Optional metadata JSON
   - Not required (nullable)

4. **Processed_At__c**
   - Type: Date/Time
   - Label: Processed At
   - Description: When processing completed
   - Not required (nullable)

### Updated Fields:

1. **Context_ID__c**
   - ✅ Now **Unique**
   - ✅ Now **External ID**
   - ✅ Now **Required**
   - ⚠️ **IMPORTANT:** Existing records without Context_ID__c will need values
   - ⚠️ **Consider:** Backfill existing records or make required=false initially

## Pre-Deployment Checklist

- [ ] **Review Context_ID__c requirement** - Do existing records have values?
- [ ] **Backup plan** - What if deployment fails?
- [ ] **Test org** - Deploy to sandbox first?
- [ ] **Broker code** - Wait until fields are deployed before updating broker

## Post-Deployment Steps

1. **Verify fields exist:**
   ```bash
   sfdx force:data:soql:query -q "SELECT Id, Related_Record_Id__c, Related_Object_Type__c, Processed_At__c FROM Form_Submission__c LIMIT 1" -u myorg
   ```

2. **Check for errors:**
   - Review deployment results
   - Check Setup → Apex → Apex Test Results for any failures

3. **Backfill existing records (if needed):**
   - If Context_ID__c is required, existing records need values
   - Consider data update script or workflow

4. **Update broker code:**
   - Only after fields are successfully deployed
   - Follow `JUNCTION_OBJECT_IMPLEMENTATION.md` in docs/

## Rollback Plan

If deployment causes issues:

1. **Remove fields via CLI:**
   ```bash
   # Not easily done via CLI - may need to delete fields in UI
   # Or remove from metadata and redeploy
   ```

2. **Revert Context_ID__c changes:**
   - Edit metadata file to remove unique/externalId/required
   - Redeploy

3. **Data loss risk:** Minimal - new fields are nullable

## Troubleshooting

### Error: "Context_ID__c required but existing records null"
- **Solution:** Make required=false initially, backfill data, then make required=true

### Error: "Duplicate Context_ID__c values"
- **Solution:** Review existing records, update duplicates, then enable unique constraint

### Error: "Field already exists"
- **Solution:** Field may have been manually created - check Setup → Object Manager

## Next Steps After Deployment

1. ✅ Verify fields in Salesforce UI (Setup → Object Manager → Form Submission → Fields)
2. ✅ Update broker code (`broker/src/routes/forms.ts`) - See `docs/JUNCTION_OBJECT_IMPLEMENTATION.md`
3. ✅ Test form submission creates both records
4. ✅ Verify Related_Record_Id__c is populated
5. ✅ Build reports using new relationships

