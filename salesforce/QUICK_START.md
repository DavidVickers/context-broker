# Quick Start: Deploy Salesforce Objects

## Deploy via Salesforce CLI

### 1. Authenticate to Sandbox
```bash
cd salesforce
sfdx auth:web:login -r https://test.salesforce.com -a myorg
```

**Note**: For Production orgs, use:
```bash
sfdx auth:web:login -r https://login.salesforce.com -a myorg
```

### 2. Deploy Objects
```bash
sfdx project deploy start
```

### 3. Verify Deployment
```bash
sfdx force:org:list
```

### 4. Create Test Form Definition

After deployment, create a test form in Salesforce:

**Via UI**:
1. Go to **Form Definitions** tab
2. Click **New**
3. Copy from sample below

**Via Apex** (Developer Console):
```apex
Form_Definition__c testForm = new Form_Definition__c(
    Name = 'Test Drive Form',
    Form_Id__c = 'test-drive-form',
    Active__c = true,
    Fields_JSON__c = '[{"name":"name","label":"Your Name","type":"text","required":true},{"name":"email","label":"Email","type":"email","required":true},{"name":"phone","label":"Phone","type":"tel","required":true},{"name":"preferred_date","label":"Preferred Date","type":"date","required":false},{"name":"preferred_time","label":"Preferred Time","type":"select","required":false,"validation":{"options":["Morning (9am-12pm)","Afternoon (12pm-5pm)","Evening (5pm-8pm)"]}},{"name":"special_requests","label":"Special Requests","type":"textarea","required":false}]',
    Mapping_Rules__c = '{"salesforceObject":"Form_Submission__c","fieldMappings":{"name":"Name","email":"Email__c","phone":"Phone__c"}}'
);
insert testForm;
System.debug('Created Form ID: ' + testForm.Id);
```

## Objects Created

✅ **Form_Definition__c** - Stores form schemas
✅ **Form_Submission__c** - Stores form submissions

Both objects include all required fields for context tracking.

