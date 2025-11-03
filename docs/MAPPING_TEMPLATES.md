# Mapping Rules Templates

**Version**: 1.0  
**Last Updated**: 2025-01-XX

Complete templates for `Mapping_Rules__c` configuration in `Form_Definition__c` records.

---

## Template Structure

```json
{
  "salesforceObject": "Lead|Contact|Case|CustomObject__c",
  "fieldMappings": {
    "formFieldName": "SalesforceFieldAPI"
  },
  "conditionalMappings": {
    "SalesforceField": {
      "when": { "formField": "value" },
      "then": { "mapFrom": "formField" },
      "else": { "mapFrom": "formField" }
    }
  },
  "transformations": {
    "transformationKey": {
      "type": "splitName|formatPhone|formatDate|concat",
      "source": "formField",
      "target": { ... }
    }
  }
}
```

---

## Template 1: Lead Mapping (Simple)

**Use Case**: Map form fields directly to Lead object

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone",
    "company": "Company",
    "message": "Description"
  }
}
```

**Form Fields**:
- `firstName` → Lead.FirstName
- `lastName` → Lead.LastName
- `email` → Lead.Email
- `phone` → Lead.Phone
- `company` → Lead.Company
- `message` → Lead.Description

---

## Template 2: Lead Mapping with Name Transformation

**Use Case**: Single "name" field that needs to be split into FirstName/LastName

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "name": "LastName",
    "email": "Email",
    "phone": "Phone",
    "company": "Company"
  },
  "transformations": {
    "name": {
      "type": "splitName",
      "source": "name",
      "target": {
        "firstName": "FirstName",
        "lastName": "LastName"
      },
      "delimiter": " "
    }
  }
}
```

**How It Works**:
- Form field `name` = "John Doe"
- Transformation splits into: `{ FirstName: "John", LastName: "Doe" }`
- `FirstName` and `LastName` are created directly (not mapped via fieldMappings)

**Form Fields**:
- `name` = "John Doe" → Lead.FirstName = "John", Lead.LastName = "Doe"
- `email` → Lead.Email
- `phone` → Lead.Phone
- `company` → Lead.Company

---

## Template 3: Contact Mapping with Account

**Use Case**: Map to Contact object, optionally create/link Account

```json
{
  "salesforceObject": "Contact",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone",
    "companyName": "Account.Name"
  },
  "conditionalMappings": {
    "AccountId": {
      "when": {
        "createAccount": true
      },
      "then": {
        "mapFrom": "companyName",
        "action": "lookupOrCreateAccount"
      }
    }
  }
}
```

**Note**: Account lookup/creation requires Apex trigger or Flow (not handled by broker mapping rules).

---

## Template 4: Lead Mapping with Conditional Company

**Use Case**: Company field populated conditionally (commercial vs. personal)

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

**How It Works**:
- If `enquiryType` = "commercial" → Lead.Company = `companyName`
- Otherwise → Lead.Company = `lastName`

**Form Fields**:
- `firstName` → Lead.FirstName
- `lastName` → Lead.LastName
- `enquiryType` = "commercial" or "personal"
- `companyName` → Lead.Company (if commercial)

---

## Template 5: Case Mapping

**Use Case**: Map form to Case object (support tickets)

```json
{
  "salesforceObject": "Case",
  "fieldMappings": {
    "email": "SuppliedEmail",
    "phone": "SuppliedPhone",
    "subject": "Subject",
    "description": "Description",
    "priority": "Priority",
    "category": "Category__c"
  },
  "conditionalMappings": {
    "Status": {
      "when": {
        "urgent": true
      },
      "then": {
        "value": "Escalated"
      },
      "else": {
        "value": "New"
      }
    },
    "Origin": {
      "conditions": [
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "web"
          },
          "then": {
            "value": "Web"
          }
        },
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "email"
          },
          "then": {
            "value": "Email"
          }
        },
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "phone"
          },
          "then": {
            "value": "Phone"
          }
        }
      ]
    }
  }
}
```

**Form Fields**:
- `email` → Case.SuppliedEmail
- `subject` → Case.Subject
- `description` → Case.Description
- `urgent` = true/false → Case.Status = "Escalated" or "New"
- `source` = "web"/"email"/"phone" → Case.Origin

---

## Template 6: Custom Object Mapping

**Use Case**: Map to custom Salesforce object (e.g., Vehicle_Enquiry__c)

```json
{
  "salesforceObject": "Vehicle_Enquiry__c",
  "fieldMappings": {
    "firstName": "First_Name__c",
    "lastName": "Last_Name__c",
    "email": "Email__c",
    "phone": "Phone__c",
    "vehicleInterest": "Vehicle_of_Interest__c",
    "preferredDate": "Preferred_Date__c",
    "enquiryType": "Enquiry_Type__c",
    "fleetSize": "Fleet_Size__c"
  }
}
```

**Form Fields**:
- All form fields map directly to custom object fields

---

## Template 7: Complex Conditional Mapping

**Use Case**: Multiple conditions with complex logic

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
    "LeadSource": {
      "conditions": [
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "referral"
          },
          "then": {
            "value": "Referral"
          }
        },
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "website"
          },
          "then": {
            "value": "Web"
          }
        },
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "social"
          },
          "then": {
            "value": "Social"
          }
        }
      ]
    },
    "Rating": {
      "conditions": [
        {
          "if": {
            "formField": "annualRevenue",
            "operator": "greaterThan",
            "value": 1000000
          },
          "then": {
            "value": "Hot"
          }
        },
        {
          "if": {
            "formField": "annualRevenue",
            "operator": "greaterThan",
            "value": 100000
          },
          "then": {
            "value": "Warm"
          }
        },
        {
          "if": {
            "formField": "annualRevenue",
            "operator": "exists",
            "value": true
          },
          "then": {
            "value": "Cold"
          }
        }
      ]
    }
  }
}
```

**Form Fields**:
- `source` → Determines Lead.LeadSource
- `annualRevenue` → Determines Lead.Rating (Hot/Warm/Cold)

---

## Template 8: Phone Formatting Transformation

**Use Case**: Format phone numbers to standard format

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "phone": "Phone"
  },
  "transformations": {
    "phone": {
      "type": "formatPhone",
      "source": "phone",
      "target": "Phone",
      "format": "US"
    }
  }
}
```

**How It Works**:
- Form field `phone` = "1234567890"
- Transformation formats to: "(123) 456-7890"
- Lead.Phone = "(123) 456-7890"

**Format Options**:
- `"US"`: (123) 456-7890
- `"E164"`: +11234567890
- `"NATIONAL"`: (123) 456-7890

---

## Template 9: Date Formatting Transformation

**Use Case**: Format dates to Salesforce format

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "firstName": "FirstName",
    "lastName": "LastName",
    "email": "Email",
    "preferredDate": "Preferred_Date__c"
  },
  "transformations": {
    "preferredDate": {
      "type": "formatDate",
      "source": "preferredDate",
      "target": "Preferred_Date__c",
      "inputFormat": "YYYY-MM-DD",
      "outputFormat": "YYYY-MM-DD"
    }
  }
}
```

**How It Works**:
- Form field `preferredDate` = "2025-01-15"
- Transformation formats to: "2025-01-15" (ISO 8601)
- Lead.Preferred_Date__c = "2025-01-15"

---

## Template 10: Concatenation Transformation

**Use Case**: Concatenate multiple fields into one

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "email": "Email",
    "phone": "Phone",
    "fullName": "Company"
  },
  "transformations": {
    "fullName": {
      "type": "concat",
      "sources": ["firstName", "lastName"],
      "target": "Company",
      "separator": " "
    }
  }
}
```

**How It Works**:
- Form fields: `firstName` = "John", `lastName` = "Doe"
- Transformation concatenates: "John Doe"
- Lead.Company = "John Doe"

---

## Transformation Reference

### splitName

Splits a single "name" field into FirstName/LastName.

```json
{
  "type": "splitName",
  "source": "name",
  "target": {
    "firstName": "FirstName",
    "lastName": "LastName"
  },
  "delimiter": " "  // Optional, default: whitespace
}
```

**Examples**:
- "John Doe" → `{ FirstName: "John", LastName: "Doe" }`
- "Mary Jane Watson" → `{ FirstName: "Mary Jane", LastName: "Watson" }`
- "Smith" → `{ LastName: "Smith" }` (single word = LastName only)

### formatPhone

Formats phone numbers to standard format.

```json
{
  "type": "formatPhone",
  "source": "phone",
  "target": "Phone",
  "format": "US"  // "US" | "E164" | "NATIONAL"
}
```

**Examples**:
- Input: "1234567890"
- US: "(123) 456-7890"
- E164: "+11234567890"
- NATIONAL: "(123) 456-7890"

### formatDate

Formats dates to Salesforce format (ISO 8601).

```json
{
  "type": "formatDate",
  "source": "date",
  "target": "Date__c",
  "inputFormat": "YYYY-MM-DD",  // Optional
  "outputFormat": "YYYY-MM-DD"   // Optional, default: ISO 8601
}
```

### concat

Concatenates multiple fields into one.

```json
{
  "type": "concat",
  "sources": ["firstName", "lastName"],
  "target": "FullName",
  "separator": " "  // Optional, default: space
}
```

---

## Conditional Mapping Reference

### Format 1: Simple when/then/else

```json
{
  "SalesforceField": {
    "when": {
      "formField1": "value1",
      "formField2": "value2"
    },
    "then": {
      "mapFrom": "sourceField"
    },
    "else": {
      "mapFrom": "elseField"
    }
  }
}
```

**Logic**: All `when` conditions must match (AND logic).

### Format 2: Array of conditions (first match wins)

```json
{
  "SalesforceField": {
    "conditions": [
      {
        "if": {
          "formField": "fieldName",
          "operator": "equals",
          "value": "value1"
        },
        "then": {
          "mapFrom": "sourceField1"
        }
      },
      {
        "if": {
          "formField": "fieldName",
          "operator": "equals",
          "value": "value2"
        },
        "then": {
          "mapFrom": "sourceField2"
        }
      }
    ]
  }
}
```

**Supported Operators**:
- `equals` / `==` - Field equals value
- `notEquals` / `!=` - Field not equals value
- `contains` - Field contains value (string)
- `notContains` - Field doesn't contain value
- `greaterThan` / `>` - Field > value (number)
- `lessThan` / `<` - Field < value (number)
- `exists` / `isNotEmpty` - Field has value
- `isEmpty` / `notExists` - Field is empty

---

## Complete Example: Contact Form with All Features

```json
{
  "salesforceObject": "Lead",
  "fieldMappings": {
    "email": "Email",
    "phone": "Phone",
    "message": "Description"
  },
  "transformations": {
    "name": {
      "type": "splitName",
      "source": "name",
      "target": {
        "firstName": "FirstName",
        "lastName": "LastName"
      }
    },
    "phone": {
      "type": "formatPhone",
      "source": "phone",
      "target": "Phone",
      "format": "US"
    }
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
    },
    "LeadSource": {
      "conditions": [
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "referral"
          },
          "then": {
            "value": "Referral"
          }
        },
        {
          "if": {
            "formField": "source",
            "operator": "equals",
            "value": "website"
          },
          "then": {
            "value": "Web"
          }
        }
      ]
    }
  }
}
```

**Form Fields**:
- `name` = "John Doe" → Lead.FirstName = "John", Lead.LastName = "Doe"
- `email` → Lead.Email
- `phone` = "1234567890" → Lead.Phone = "(123) 456-7890"
- `message` → Lead.Description
- `enquiryType` = "commercial" → Lead.Company = `companyName`
- `enquiryType` = "personal" → Lead.Company = `lastName`
- `source` = "referral" → Lead.LeadSource = "Referral"
- `source` = "website" → Lead.LeadSource = "Web"

---

## Best Practices

1. **Always map required fields**: Ensure all required Salesforce fields are mapped
2. **Use transformations for formatting**: Format data before mapping (phone, dates, names)
3. **Use conditional mappings for business logic**: Different values based on form data
4. **Test mappings**: Verify mappings work with test form submissions
5. **Document custom objects**: Include field API names in comments
6. **Handle edge cases**: Single word names, missing phone numbers, etc.
7. **Verify Field-Level Security**: Ensure service account has Read/Edit access to all mapped fields

---

## Troubleshooting

### Transformation Not Applied

**Issue**: Transformation defined but not working  
**Check**:
- Transformation `type` is correct (splitName, formatPhone, etc.)
- `source` field exists in form data
- `target` configuration is correct

### Conditional Mapping Not Working

**Issue**: Conditional mapping not applied  
**Check**:
- Condition values match exactly (case-sensitive)
- Operator is correct (equals, contains, etc.)
- Form data contains the condition fields

### Field Not Mapped

**Issue**: Form field not mapped to Salesforce  
**Check**:
- Field name in `fieldMappings` matches form field name exactly
- Salesforce field API name is correct (case-sensitive)
- Field exists in Salesforce object
- Field-Level Security allows service account to write

---

## Migration from Old Name Parsing Logic

**Old (Hardcoded)**:
Name parsing was automatically applied if `name` field mapped to `LastName`.

**New (Configurable)**:
Name parsing is now configured via `transformations` in `Mapping_Rules__c`:

```json
{
  "transformations": {
    "name": {
      "type": "splitName",
      "source": "name",
      "target": {
        "firstName": "FirstName",
        "lastName": "LastName"
      }
    }
  }
}
```

**Migration Steps**:
1. Remove hardcoded name parsing logic (already done in broker)
2. Add `transformations` section to `Mapping_Rules__c`
3. Test form submission to verify name splitting works
4. Update any other forms using the old pattern


