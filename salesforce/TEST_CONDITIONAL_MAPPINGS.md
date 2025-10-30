# Testing Conditional Mappings

## Pre-Test Checklist

Before testing conditional mappings, ensure:

1. ✅ **Broker is running** - `npm start` in `broker/` directory
2. ✅ **Salesforce connection works** - Broker can query `Form_Definition__c`
3. ✅ **Form Definition updated in Salesforce** - `Fields_JSON__c` has sections with `enquiryType` field
4. ✅ **Mapping_Rules__c updated in Salesforce** - Contains conditional mappings for `Company` field

## Test Scenario: Lead Company Field

### Expected Behavior

**Commercial Inquiry (`enquiryType: "commercial"`):**
- Form data: `{ firstName: "John", lastName: "Doe", enquiryType: "commercial", companyName: "Acme Corp" }`
- Expected Lead: `Company = "Acme Corp"`

**Personal Inquiry (`enquiryType: "personal"`):**
- Form data: `{ firstName: "John", lastName: "Doe", enquiryType: "personal" }`
- Expected Lead: `Company = "Doe"` (uses lastName)

## Mapping_Rules__c Configuration

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

## Test Steps

### 1. Test Commercial Inquiry

```bash
curl -X POST "http://localhost:3001/api/forms/test-drive-form/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-drive-form:test-session-123",
    "formData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@acme.com",
      "phone": "555-1234",
      "enquiryType": "commercial",
      "companyName": "Acme Corporation"
    }
  }'
```

**Expected Results:**
- ✅ Lead created with `Company = "Acme Corporation"`
- ✅ `FirstName = "John"`
- ✅ `LastName = "Doe"`
- ✅ `Email = "john.doe@acme.com"`
- ✅ `Phone = "555-1234"`

### 2. Test Personal Inquiry

```bash
curl -X POST "http://localhost:3001/api/forms/test-drive-form/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "test-drive-form:test-session-456",
    "formData": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phone": "555-5678",
      "enquiryType": "personal"
    }
  }'
```

**Expected Results:**
- ✅ Lead created with `Company = "Smith"` (from lastName)
- ✅ `FirstName = "Jane"`
- ✅ `LastName = "Smith"`
- ✅ `Email = "jane.smith@example.com"`
- ✅ `Phone = "555-5678"`

### 3. Verify in Salesforce

1. Navigate to Leads tab in Salesforce
2. Verify both leads were created
3. Check `Company` field:
   - Commercial lead: Should show "Acme Corporation"
   - Personal lead: Should show "Smith"

## Troubleshooting

### Issue: Company field not set correctly

**Check:**
- ✅ `Mapping_Rules__c` JSON is valid
- ✅ `enquiryType` field value matches condition (`"commercial"` or `"personal"`)
- ✅ Form data includes `companyName` for commercial inquiries
- ✅ Form data includes `lastName` for personal inquiries
- ✅ Check broker logs for conditional mapping evaluation

### Issue: Error "No condition met for conditional mapping Company"

**Solution:**
- Ensure `enquiryType` value exactly matches condition (case-sensitive)
- Check form data includes all required fields

### View Broker Logs

```bash
# In broker terminal, look for:
✅ Conditional mapping: Company = companyName (condition met)
✅ Conditional mapping: Company = lastName (else case)
```

## Advanced Testing

### Test Complex Conditions (Format 2)

Update `Mapping_Rules__c`:

```json
{
  "conditionalMappings": {
    "Company": {
      "conditions": [
        {
          "if": {
            "formField": "enquiryType",
            "operator": "equals",
            "value": "commercial"
          },
          "then": {
            "mapFrom": "companyName"
          }
        },
        {
          "if": {
            "formField": "enquiryType",
            "operator": "equals",
            "value": "personal"
          },
          "then": {
            "mapFrom": "lastName"
          }
        }
      ]
    }
  }
}
```

This format allows multiple conditions and is evaluated in order (first match wins).

