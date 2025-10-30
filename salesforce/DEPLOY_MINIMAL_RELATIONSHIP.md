# Deploy Minimal Form_Submission_Relationship__c

## What's Changed

**Simplified to absolute minimum:**
- ✅ `Form_Submission__c` (Master-Detail) - Required
- ✅ `Related_Record_Id__c` (Text, 18) - Stores the record ID
- ✅ `Related_Object_Type__c` (Text, 50) - Stores object type name

**Removed for now (can add later):**
- ❌ Account lookup field
- ❌ Relationship_Type__c picklist
- ❌ Is_Primary__c checkbox
- ❌ Relationship_Metadata__c JSON field
- ❌ Created_At__c DateTime
- ❌ History tracking (set to false)

## Deploy

```bash
cd salesforce
sfdx auth:web:login -r https://test.salesforce.com -a myorg
sfdx project deploy validate --source-dir force-app/main/default/objects/Form_Submission_Relationship__c
sfdx project deploy start --source-dir force-app/main/default/objects/Form_Submission_Relationship__c
```

## Verify

After deployment, verify the object exists:
- Setup → Object Manager → Form Submission Relationship

Should see:
- 3 fields: Form Submission, Related Record ID, Related Object Type
- Master-Detail relationship to Form Submission

## Next Steps (After Successful Deployment)

Once this deploys, we can add back:
1. Relationship_Type__c (picklist: Created, Matched, Linked, Parent)
2. Is_Primary__c (checkbox)
3. Other fields as needed

