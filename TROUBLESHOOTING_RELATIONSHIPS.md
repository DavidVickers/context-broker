# Troubleshooting: Form_Submission_Relationship__c Not Created

## Issue

Lead gets created but no `Form_Submission_Relationship__c` record is created.

## Root Cause Analysis

The relationship creation depends on `businessRecordIds` array. If this array is empty, no relationships will be created.

## Check Broker Logs

Look for these log messages in your broker console:

### ✅ Successful Lead Creation
```
✅ Successfully created and verified Lead record with ID: 00Q...
📊 businessRecordIds after creation: [{"id":"00Q...","objectType":"Lead"}]
```

### ❌ Failed Lead Creation (Silent Failure)
```
❌ Failed to create Lead: [error message]
⚠️  Lead creation failed - will still create Form_Submission__c but no relationship will be created
```

### 🔍 Relationship Creation Check
```
🔍 Relationship creation check: businessRecordIds.length = 1
   businessRecordIds: [{"id":"00Q...","objectType":"Lead"}]
   submissionId: a0RW...
📝 Step 3: Creating 1 relationship record(s)...
```

### ⚠️ No Relationships Created
```
⚠️  No business records to link - skipping relationship creation
```

## Common Causes

### 1. Lead Creation Failing Silently

**Symptoms:**
- No error in response
- `Form_Submission__c` created successfully
- `businessRecordIds` is empty
- No relationship records

**Check:**
- Look for `❌ Failed to create Lead` in broker logs
- Check if Lead was actually created in Salesforce
- Verify all required Lead fields are present (Company, LastName, etc.)

### 2. Conditional Mapping Not Working

**Symptoms:**
- Lead created but Company field is wrong
- Conditional mappings not evaluated correctly

**Check:**
- Verify `Mapping_Rules__c` has correct `conditionalMappings` structure
- Check if `enquiryType` value matches condition (case-sensitive)
- Verify form data includes all required fields

### 3. Connection Issues

**Symptoms:**
- `authConn` is null during relationship creation
- Missing `instanceUrl`

**Check:**
- Verify Salesforce connection is active
- Check OAuth session is valid
- Ensure service account connection is initialized

## Debugging Steps

### Step 1: Check Broker Logs

After form submission, look for:
1. Lead creation success/failure
2. `businessRecordIds` array contents
3. Relationship creation attempt

### Step 2: Verify Lead Was Created

In Salesforce:
1. Navigate to **Leads** tab
2. Find the Lead record
3. Verify it exists and has correct data

### Step 3: Check businessRecordIds

The relationship creation depends on this array. If it's empty, relationships won't be created.

**Expected:**
```javascript
businessRecordIds = [{ id: "00Q...", objectType: "Lead" }]
```

**If Empty:**
- Lead creation failed
- Check error logs for details

## Fixes

### Fix 1: Lead Creation Failing

If Lead creation is failing silently:

1. Check broker logs for exact error
2. Verify all required Lead fields are mapped:
   - `Company` (via conditional mapping or lastName)
   - `LastName`
3. Check field mappings in `Mapping_Rules__c`
4. Verify form data includes all required fields

### Fix 2: Conditional Mapping Not Working

If Company field is not set correctly:

1. Verify `enquiryType` value in form data
2. Check `Mapping_Rules__c` conditional mappings structure:
```json
{
  "conditionalMappings": {
    "Company": {
      "when": {
        "enquiryType": "commercial"
      },
      "then": {
        "mapFrom": "companyName"
      },
      "else": {
        "mapFrom": "lastName"
      }
    }
  }
}
```
3. Test with both `enquiryType: "commercial"` and `enquiryType: "personal"`

### Fix 3: Relationship Creation Failing

If Lead is created but relationship is not:

1. Verify `businessRecordIds.length > 0`
2. Check relationship creation logs:
```
📝 Step 3: Creating 1 relationship record(s)...
✅ Created relationship 1/1 with ID: a0RW...
```
3. If relationship creation fails, check:
   - `Form_Submission_Relationship__c` object exists in Salesforce
   - Required fields are populated (Form_Submission__c, Related_Record_Id__c, Related_Object_Type__c)
   - Connection has permission to create relationships

## Testing

### Test 1: Commercial Inquiry
```bash
curl -X POST "http://localhost:3001/api/forms/test-drive-form/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-drive-form:test-session-123",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@acme.com",
      "phone": "555-1234",
      "enquiryType": "commercial",
      "companyName": "Acme Corporation"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "recordId": "a0RW...",
  "businessRecordIds": [{"id": "00Q...", "objectType": "Lead"}],
  "relationshipIds": ["a0RW..."],
  "message": "Form submitted successfully"
}
```

**Check Broker Logs:**
- ✅ Lead created
- ✅ businessRecordIds has 1 record
- ✅ Relationship created

### Test 2: Personal Inquiry
```bash
curl -X POST "http://localhost:3001/api/forms/test-drive-form/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-drive-form:test-session-456",
    "formData": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "555-5678",
      "enquiryType": "personal"
    }
  }'
```

**Expected:**
- Lead created with `Company = "Smith"` (from lastName)
- Relationship created

## Verification in Salesforce

1. **Check Lead:**
   - Navigate to Leads tab
   - Find Lead by email
   - Verify Company field is correct

2. **Check Relationship:**
   - Navigate to Form Submission record
   - Find the `Form_Submission_Relationship__c` record
   - Verify it links to the Lead

3. **Check Form Submission:**
   - Navigate to Form Submission record
   - Verify `Submission_Data__c` contains all form data

