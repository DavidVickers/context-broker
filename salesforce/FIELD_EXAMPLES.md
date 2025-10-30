# Form_Definition__c Field Examples

## Mapping_Rules__c (JSON String)

**Purpose**: Maps form field names to Salesforce object fields

**Structure**:
```json
{
  "salesforceObject": "Contact",
  "fieldMappings": {
    "formFieldName": "SalesforceFieldAPI",
    "formFieldName2": "SalesforceFieldAPI2"
  }
}
```

**Example for test-drive-form**:
```json
{
  "salesforceObject": "Form_Submission__c",
  "fieldMappings": {
    "name": "Name",
    "email": "Email__c",
    "phone": "Phone__c",
    "preferredDate": "Preferred_Date__c",
    "vehicleInterest": "Vehicle_Interest__c"
  }
}
```

**Example mapping to standard Contact object**:
```json
{
  "salesforceObject": "Contact",
  "fieldMappings": {
    "name": "LastName",
    "email": "Email",
    "phone": "Phone"
  }
}
```

**Example mapping to Lead object with conditional mappings (supports both personal and business inquiries)**:
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

**Conditional Mappings Format:**

The `conditionalMappings` object allows you to set Salesforce field values based on form data conditions. Two formats are supported:

**Format 1: Simple when/then/else (recommended for simple conditions)**
```json
{
  "conditionalMappings": {
    "SalesforceField": {
      "when": {
        "formField1": "value1",
        "formField2": "value2"
      },
      "then": {
        "mapFrom": "formFieldToUseWhenConditionMet"
      },
      "else": {
        "mapFrom": "formFieldToUseWhenConditionNotMet"
      }
    }
  }
}
```

**Format 2: Array of if/then conditions (for complex logic, first match wins)**
```json
{
  "conditionalMappings": {
    "SalesforceField": {
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

**Supported Operators:**
- `equals` or `==` - Exact match
- `notEquals` or `!=` - Not equal
- `contains` - String contains
- `notContains` - String does not contain
- `greaterThan` or `>` - Numeric greater than
- `lessThan` or `<` - Numeric less than
- `exists` or `isNotEmpty` - Field has a value
- `isEmpty` or `notExists` - Field is empty/null

**Example: Lead Company field based on enquiry type**
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

**Note:**
- Conditional mappings are evaluated **after** static field mappings
- Conditional mappings **override** static mappings if conditions are met
- If no condition is met and no `else` clause exists, the field will be left unset
- The `when` format requires **all** fields to match (AND logic)
- The `conditions` array format evaluates in order and uses the **first match** (OR logic)

**Note**: The broker uses these mappings to create/update Salesforce records when forms are submitted.

---

## Agent_Config__c (JSON String)

**Purpose**: Configures agent behavior for this form (autocomplete, validation, suggestions)

**Structure**:
```json
{
  "enabled": true,
  "features": [
    "autocomplete",
    "validation",
    "suggestions"
  ],
  "agentType": "salesforce-einstein",
  "options": {
    "autoSave": true,
    "suggestionDelay": 500
  }
}
```

**Minimal Example** (agent enabled, basic features):
```json
{
  "enabled": true,
  "features": [
    "autocomplete",
    "validation"
  ]
}
```

**Full Example** (all features enabled):
```json
{
  "enabled": true,
  "features": [
    "autocomplete",
    "validation",
    "suggestions",
    "smartDefaults"
  ],
  "agentType": "salesforce-einstein",
  "options": {
    "autoSave": true,
    "autoSaveInterval": 30000,
    "suggestionDelay": 500,
    "validationOnBlur": true
  }
}
```

**Disabled Example** (no agent features):
```json
{
  "enabled": false,
  "features": []
}
```

---

## Complete Example: test-drive-form Record

**Form_Definition__c Record**:

- **Name**: `Test Drive Form`
- **Form_Id__c**: `test-drive-form`
- **Active__c**: ✅ `true`

**Fields_JSON__c**:
```json
[
  {
    "name": "name",
    "label": "Full Name",
    "type": "text",
    "required": true,
    "validation": {
      "minLength": 2,
      "maxLength": 100
    }
  },
  {
    "name": "email",
    "label": "Email Address",
    "type": "email",
    "required": true,
    "validation": {
      "pattern": "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$"
    }
  },
  {
    "name": "phone",
    "label": "Phone Number",
    "type": "tel",
    "required": true
  },
  {
    "name": "preferredDate",
    "label": "Preferred Date",
    "type": "date",
    "required": false
  },
  {
    "name": "vehicleInterest",
    "label": "Vehicle of Interest",
    "type": "text",
    "required": false
  }
]
```

**Mapping_Rules__c**:
```json
{
  "salesforceObject": "Form_Submission__c",
  "fieldMappings": {}
}
```

**Agent_Config__c**:
```json
{
  "enabled": true,
  "features": [
    "autocomplete",
    "validation"
  ]
}
```

**Note**: For now, you can leave `Mapping_Rules__c` with an empty `fieldMappings` object `{}` if you're just storing submissions in `Form_Submission__c`. The broker will still create submission records using `Submission_Data__c` as JSON.

