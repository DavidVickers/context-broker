# Pre-Test Checklist

## ✅ Ready Items

1. ✅ Broker is running (`http://localhost:3001/api/health` responds)
2. ✅ Salesforce connection is active
3. ✅ Form definition uses sections (new format)
4. ✅ Conditional mappings code is implemented

## ⚠️ Items to Verify in Salesforce

Before testing, check that:

### 1. Form Definition (`Form_Definition__c`)
- `Fields_JSON__c` contains `enquiryType` field (with options: "personal", "commercial")
- `Fields_JSON__c` contains `companyName` field
- `Fields_JSON__c` contains `firstName` and `lastName` fields

### 2. Mapping Rules (`Mapping_Rules__c`)

Must include:
```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone"
  },
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

## Quick Test Command

Once verified, run:

```bash
# Test Commercial Inquiry
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

Expected: Lead created with `Company = "Acme Corporation"`

