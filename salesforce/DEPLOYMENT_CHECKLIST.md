# Deployment Checklist

## ✅ Pre-Deployment

- [ ] Review `Form_Submission__c.object-meta.xml` - Backup current fields
- [ ] Check existing `Form_Submission__c` records for `Context_ID__c` values
- [ ] Decide: Make `Context_ID__c` required now or later? (Currently set to `required=false` for safety)
- [ ] Authenticate to Salesforce: `sfdx auth:web:login -r https://test.salesforce.com -a myorg`

## 📤 Deploy Fields

```bash
cd salesforce

# Validate first (dry-run)
sfdx project deploy validate --source-dir force-app/main/default/objects/Form_Submission__c

# Deploy
sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission__c
```

## ✅ Post-Deployment Verification

- [ ] Check Setup → Object Manager → Form Submission → Fields
- [ ] Verify these NEW fields exist:
  - `Related_Record_Id__c` (Text, 18)
  - `Related_Object_Type__c` (Text, 50)
  - `Adjunct_Data__c` (Long Text Area)
  - `Processed_At__c` (Date/Time)
- [ ] Verify `Context_ID__c` is now Unique and External ID
- [ ] Test query: `SELECT Id, Related_Record_Id__c FROM Form_Submission__c LIMIT 1`

## 🔄 After Fields Deployed

- [ ] Update broker code (`broker/src/routes/forms.ts`) - See `docs/JUNCTION_OBJECT_IMPLEMENTATION.md`
- [ ] Test form submission creates both records
- [ ] Verify `Related_Record_Id__c` is populated correctly

## 🎯 Making Context_ID__c Required Later (Optional)

Once all records have values:

1. Edit metadata: Change `<required>false</required>` to `<required>true</required>`
2. Redeploy: `sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission__c`

