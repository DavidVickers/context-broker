# Form_Definition__c Object Guide

Complete guide for creating and managing form definitions in Salesforce.

## Overview

The `Form_Definition__c` custom object stores dynamic form configurations that drive the Context Broker system. Each record defines:

- **Form Structure**: Fields, sections, validation rules, conditional logic
- **Salesforce Mappings**: How form data maps to Salesforce objects (Lead, Contact, etc.)
- **Agent Configuration**: AI agent behavior for form assistance

Forms are defined as JSON stored in the object's fields and rendered dynamically by the React frontend.

---

## Object Fields

### Required Fields

| Field API Name | Type | Description | Required |
|----------------|------|-------------|----------|
| `Name` | Text(80) | Display name of the form (e.g., "Test Drive Form") | ✅ Yes |
| `Form_Id__c` | Text(255) | Unique identifier for the form (e.g., "test-drive-form") | ✅ Yes |

### JSON Configuration Fields

| Field API Name | Type | Description | Required |
|----------------|------|-------------|----------|
| `Fields_JSON__c` | Long Text Area (131072) | Form structure with sections, fields, validation, and conditional logic | ✅ Yes |
| `Mapping_Rules__c` | Long Text Area (131072) | Maps form fields to Salesforce object fields | ❌ No |
| `Agent_Config__c` | Long Text Area (131072) | AI agent behavior configuration | ❌ No |

### Metadata Fields

| Field API Name | Type | Description |
|----------------|------|-------------|
| `Active__c` | Checkbox | Whether the form is active and available for use (default: true) |

---

## Fields_JSON__c - Form Structure

Defines the form's structure, sections, fields, validation, and conditional logic.

### Schema Structure

```json
{
  "formId": "unique-form-id",
  "title": "Form Display Title",
  "sections": [
    {
      "id": "section-unique-id",
      "title": "Section Title",
      "fields": [
        {
          "name": "fieldName",
          "label": "Field Label",
          "type": "text|email|tel|date|number|select|textarea|checkbox",
          "required": true|false,
          "placeholder": "Placeholder text",
          "validation": {
            "pattern": "regex-pattern",
            "message": "Custom error message",
            "minLength": 2,
            "maxLength": 100
          },
          "options": [
            { "value": "option1", "label": "Option 1" },
            { "value": "option2", "label": "Option 2" }
          ],
          "conditions": {
            "visibility": [
              {
                "field": "otherField",
                "operator": "equals|notEquals|contains|notContains|greaterThan|lessThan",
                "value": "expectedValue"
              }
            ],
            "required": [
              {
                "field": "otherField",
                "operator": "equals",
                "value": "expectedValue"
              }
            ]
          }
        }
      ],
      "conditions": {
        "visibility": [
          {
            "field": "fieldName",
            "operator": "equals",
            "value": "expectedValue"
          }
        ]
      }
    }
  ]
}
```

### Field Types

| Type | Description | HTML Element |
|------|-------------|--------------|
| `text` | Single-line text input | `<input type="text">` |
| `email` | Email address input | `<input type="email">` |
| `tel` | Phone number input | `<input type="tel">` |
| `date` | Date picker | `<input type="date">` |
| `number` | Numeric input | `<input type="number">` |
| `select` | Dropdown select | `<select>` |
| `textarea` | Multi-line text area | `<textarea>` |
| `checkbox` | Checkbox input | `<input type="checkbox">` |

### Conditional Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `enquiryType === "commercial"` |
| `notEquals` | Not equal | `enquiryType !== "personal"` |
| `contains` | String contains | `email` contains `"@company.com"` |
| `notContains` | String does not contain | `email` does not contain `"@"` |
| `greaterThan` | Numeric greater than | `fleetSize > 10` |
| `lessThan` | Numeric less than | `fleetSize < 100` |

### Complete Example: Vehicle Enquiry Form

```json
{
  "formId": "vehicle-enquiry",
  "title": "Vehicle Enquiry Form",
  "sections": [
    {
      "id": "personal-info",
      "title": "Personal Information",
      "fields": [
        {
          "name": "firstName",
          "label": "First Name",
          "type": "text",
          "required": true,
          "placeholder": "Enter your first name"
        },
        {
          "name": "lastName",
          "label": "Last Name",
          "type": "text",
          "required": true,
          "placeholder": "Enter your last name"
        },
        {
          "name": "email",
          "label": "Email Address",
          "type": "email",
          "required": true,
          "validation": {
            "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            "message": "Please enter a valid email address"
          }
        },
        {
          "name": "phone",
          "label": "Phone Number",
          "type": "tel",
          "required": true
        }
      ]
    },
    {
      "id": "enquiry-details",
      "title": "Enquiry Details",
      "fields": [
        {
          "name": "enquiryType",
          "label": "Enquiry Type",
          "type": "select",
          "required": true,
          "options": [
            { "value": "personal", "label": "Personal" },
            { "value": "commercial", "label": "Commercial" }
          ]
        },
        {
          "name": "companyName",
          "label": "Company Name",
          "type": "text",
          "required": false,
          "placeholder": "Enter your company name",
          "conditions": {
            "visibility": [
              {
                "field": "enquiryType",
                "operator": "equals",
                "value": "commercial"
              }
            ],
            "required": [
              {
                "field": "enquiryType",
                "operator": "equals",
                "value": "commercial"
              }
            ]
          }
        },
        {
          "name": "companySize",
          "label": "Company Size",
          "type": "select",
          "required": false,
          "options": [
            { "value": "1-10", "label": "1-10 employees" },
            { "value": "11-50", "label": "11-50 employees" },
            { "value": "51-200", "label": "51-200 employees" },
            { "value": "200+", "label": "200+ employees" }
          ],
          "conditions": {
            "visibility": [
              {
                "field": "enquiryType",
                "operator": "equals",
                "value": "commercial"
              }
            ]
          }
        },
        {
          "name": "vehicleInterest",
          "label": "Vehicle of Interest",
          "type": "text",
          "required": false
        },
        {
          "name": "preferredDate",
          "label": "Preferred Date",
          "type": "date",
          "required": false
        }
      ]
    },
    {
      "id": "fleet-details",
      "title": "Fleet Information",
      "conditions": {
        "visibility": [
          {
            "field": "enquiryType",
            "operator": "equals",
            "value": "commercial"
          }
        ]
      },
      "fields": [
        {
          "name": "fleetSize",
          "label": "Expected Fleet Size",
          "type": "number",
          "required": false,
          "conditions": {
            "required": [
              {
                "field": "enquiryType",
                "operator": "equals",
                "value": "commercial"
              }
            ]
          }
        },
        {
          "name": "purchaseTimeline",
          "label": "Purchase Timeline",
          "type": "select",
          "required": false,
          "options": [
            { "value": "immediate", "label": "Immediate (0-3 months)" },
            { "value": "short", "label": "Short-term (3-6 months)" },
            { "value": "medium", "label": "Medium-term (6-12 months)" },
            { "value": "long", "label": "Long-term (12+ months)" }
          ]
        }
      ]
    }
  ]
}
```

### Backward Compatible Format (Simple Fields Array)

For simpler forms, you can use a flat fields array:

```json
{
  "formId": "simple-form",
  "title": "Simple Form",
  "fields": [
    {
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true
    },
    {
      "name": "email",
      "label": "Email",
      "type": "email",
      "required": true
    }
  ]
}
```

---

## Mapping_Rules__c - Salesforce Field Mappings

Defines how form field values map to Salesforce object fields when a form is submitted.

### Schema Structure

```json
{
  "salesforceObject": "Lead|Contact|Case|Account|Custom_Object__c",
  "fieldMappings": {
    "formFieldName": "SalesforceFieldAPI",
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone"
  },
  "conditionalMappings": {
    "SalesforceField": {
      "when": {
        "formField": "value"
      },
      "then": {
        "mapFrom": "sourceField"
      },
      "else": {
        "mapFrom": "fallbackField"
      }
    }
  }
}
```

### Conditional Mappings

Use `conditionalMappings` to set Salesforce field values based on form data conditions. This replaces hardcoded logic and makes mappings generic and reusable.

**Format 1: Simple when/then/else (recommended)**
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

**Format 2: Array of if/then conditions (for complex logic)**
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

**Supported Operators:**
- `equals` or `==` - Exact match
- `notEquals` or `!=` - Not equal
- `contains` - String contains
- `notContains` - String does not contain
- `greaterThan` or `>` - Numeric greater than
- `lessThan` or `<` - Numeric less than
- `exists` or `isNotEmpty` - Field has a value
- `isEmpty` or `notExists` - Field is empty/null

**Special Handling for Lead Object**

When `salesforceObject` is `"Lead"`, use conditional mappings for the Company field:

- **Company Field (Commercial)**: If `enquiryType` is `"commercial"`, use `companyName` field
- **Company Field (Personal)**: If `enquiryType` is `"personal"`, use `lastName` field

### Name Field Handling

The broker supports two patterns for name fields:

1. **Separate Fields** (Recommended):
   ```json
   {
     "firstName": "FirstName",
     "lastName": "LastName"
   }
   ```

2. **Single Name Field**:
   ```json
   {
     "name": "LastName"
   }
   ```
   - If the form sends a single `name` field (e.g., "John Doe"), the broker will automatically parse it into:
     - `FirstName`: "John"
     - `LastName`: "Doe"

### Example: Lead Mapping

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone",
    "companyName": "Company"
  }
}
```

### Example: Contact Mapping

```json
{
  "salesforceObject": "Contact",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone",
    "companyName": "Account.Name"
  }
}
```

### Example: Custom Object Mapping

```json
{
  "salesforceObject": "Vehicle_Enquiry__c",
  "fieldMappings": {
    "vehicleInterest": "Vehicle_of_Interest__c",
    "preferredDate": "Preferred_Date__c",
    "enquiryType": "Enquiry_Type__c",
    "fleetSize": "Fleet_Size__c"
  }
}
```

**Note**: If `Mapping_Rules__c` is empty or not provided, the form will still create a `Form_Submission__c` record with all form data stored in `Submission_Data__c` as JSON.

---

## Agent_Config__c - AI Agent Configuration

Configures AI agent behavior for form assistance (autocomplete, validation, suggestions).

### Schema Structure

```json
{
  "enabled": true|false,
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

### Features

| Feature | Description |
|---------|-------------|
| `autocomplete` | Auto-complete field values based on user history |
| `validation` | Real-time field validation suggestions |
| `suggestions` | Smart field value suggestions |
| `smartDefaults` | Intelligent default values |

### Example: Minimal Configuration

```json
{
  "enabled": true,
  "features": [
    "autocomplete",
    "validation"
  ]
}
```

### Example: Full Configuration

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

### Example: Disabled

```json
{
  "enabled": false,
  "features": []
}
```

---

## Creating a Form Definition Record

### Via Salesforce UI

1. Navigate to **Form Definition** tab
2. Click **New**
3. Fill in required fields:
   - **Name**: Display name (e.g., "Vehicle Enquiry Form")
   - **Form Id**: Unique identifier (e.g., "vehicle-enquiry")
4. Paste JSON into:
   - **Fields JSON**: Form structure
   - **Mapping Rules**: Salesforce field mappings (optional)
   - **Agent Config**: AI agent configuration (optional)
5. Set **Active** checkbox ✅
6. Click **Save**

### Via Salesforce CLI

```bash
# Create a CSV file (form-definition.csv)
# Name,Form_Id__c,Fields_JSON__c,Mapping_Rules__c,Active__c
# "Vehicle Enquiry Form","vehicle-enquiry","{...JSON...}","{...JSON...}",true

# Import using Data Loader or Salesforce CLI
sfdx force:data:bulk:upsert -s Form_Definition__c -f form-definition.csv -i Form_Id__c
```

### Via API (using broker)

```bash
curl -X POST "http://localhost:3001/api/forms/create-definition" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vehicle Enquiry Form",
    "formId": "vehicle-enquiry",
    "fieldsJson": "{...JSON...}",
    "mappingRules": "{...JSON...}",
    "agentConfig": "{...JSON...}"
  }'
```

---

## Best Practices

### Form Structure

1. **Use Sections**: Group related fields into sections for better UX
2. **Conditional Fields**: Use conditional visibility to show/hide fields based on user selections
3. **Validation**: Always add validation for email, phone, and required fields
4. **Placeholders**: Include helpful placeholder text for better UX
5. **Field Names**: Use camelCase (e.g., `firstName`, `companyName`)

### Mapping Rules

1. **Lead Object**: Always include `firstName`/`lastName` or `name` mapping
2. **Company Field**: For Leads, provide `company` mapping if business inquiries are expected
3. **Field Names**: Match form field names exactly (case-sensitive)
4. **Salesforce Fields**: Use Salesforce API field names (not labels)

### Agent Config

1. **Start Simple**: Begin with minimal config, add features as needed
2. **Performance**: Use `suggestionDelay` to reduce API calls
3. **Auto-save**: Enable `autoSave` for better user experience

---

## Common Patterns

### Pattern 1: Personal vs Business Inquiry

```json
// Fields_JSON__c
{
  "sections": [{
    "fields": [
      {
        "name": "enquiryType",
        "type": "select",
        "options": [
          { "value": "personal", "label": "Personal" },
          { "value": "business", "label": "Business" }
        ]
      },
      {
        "name": "companyName",
        "conditions": {
          "visibility": [
            { "field": "enquiryType", "operator": "equals", "value": "business" }
          ],
          "required": [
            { "field": "enquiryType", "operator": "equals", "value": "business" }
          ]
        }
      }
    ]
  }]
}
```

### Pattern 2: Conditional Section

```json
{
  "sections": [
    {
      "id": "fleet-info",
      "title": "Fleet Information",
      "conditions": {
        "visibility": [
          { "field": "enquiryType", "operator": "equals", "value": "commercial" }
        ]
      },
      "fields": [...]
    }
  ]
}
```

### Pattern 3: Name Parsing

```json
// Mapping_Rules__c - Option 1: Separate fields (recommended)
{
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName"
  }
}

// Mapping_Rules__c - Option 2: Single name field (auto-parsed)
{
  "fieldMappings": {
    "name": "LastName"  // Broker will parse "John Doe" → FirstName="John", LastName="Doe"
  }
}
```

---

## Testing Your Form

### 1. Verify JSON Syntax

Use a JSON validator before saving:
- [JSONLint](https://jsonlint.com/)
- [JSON Formatter](https://jsonformatter.org/)

### 2. Test Form Rendering

1. Open the form in your React frontend
2. Verify all fields render correctly
3. Test conditional fields show/hide properly
4. Test validation messages appear correctly

### 3. Test Form Submission

```bash
curl -X POST "http://localhost:3001/api/forms/{formId}/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "555-1234"
    }
  }'
```

### 4. Verify Salesforce Records

1. Check `Form_Submission__c` record was created
2. Check target object (Lead, Contact, etc.) was created (if mapped)
3. Check `Form_Submission_Relationship__c` records link them together

---

## Troubleshooting

### Form Not Loading

- ✅ Check `Form_Id__c` matches the form ID in the URL
- ✅ Check `Active__c` is set to `true`
- ✅ Check `Fields_JSON__c` is valid JSON
- ✅ Check broker logs for errors

### Fields Not Mapping

- ✅ Verify `Mapping_Rules__c` field names match form field names exactly
- ✅ Verify Salesforce field API names are correct
- ✅ Check broker logs for mapping details

### Conditional Fields Not Working

- ✅ Verify `conditions` syntax is correct
- ✅ Check field names in conditions match actual field names
- ✅ Verify operator and value are correct
- ✅ Test with browser DevTools to see form state

### Lead Company Field Missing

- ✅ The broker automatically handles Company field:
  - If `company` is provided → use it
  - If `company` is NOT provided → use `LastName` as `Company`
- ✅ Check broker logs to see which path was taken

---

## Related Objects

- **Form_Submission__c**: Records all form submissions
- **Form_Submission_Relationship__c**: Links submissions to Salesforce objects (Lead, Contact, etc.)

---

## Support

For issues or questions:
1. Check broker logs for detailed error messages
2. Verify JSON syntax using a validator
3. Test with minimal form structure first
4. Check Salesforce object field permissions

