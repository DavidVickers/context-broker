# Salesforce Objects & Data Requirements

## Required Custom Objects

You need **2 Custom Objects** for the Forms-Aware Agent system:

### 1. Form_Definition__c (Form Definitions)

**Purpose**: Store form schemas, field definitions, and mapping rules

**Required Fields**:

| Field API Name | Label | Type | Required | Description |
|---------------|-------|------|----------|-------------|
| `Form_Id__c` | Form ID | Text (255) | ✅ Yes, Unique | Unique form identifier (e.g., `test-drive-form`) |
| `Fields_JSON__c` | Fields JSON | Long Text Area (131072) | No | JSON array of form field definitions |
| `Mapping_Rules__c` | Mapping Rules | Long Text Area (131072) | No | JSON mapping rules for Salesforce objects |
| `Active__c` | Active | Checkbox | No | Whether form is active (default: true) |

**Optional Fields** (per blueprint):
- `Agent_Config__c` - Agent configuration JSON (LongTextArea)

---

### 2. Form_Submission__c (Form Submissions)

**Purpose**: Store submitted form data with context tracking

**Required Fields**:

| Field API Name | Label | Type | Required | Description |
|---------------|-------|------|----------|-------------|
| `Form_Definition__c` | Form Definition | Master-Detail (Form_Definition__c) | No | Link to form definition |
| `Form_Id__c` | Form ID | Text (255) | No | Form identifier (denormalized) |
| `Context_ID__c` | Context ID | Text (255) | ✅ **CRITICAL** | Format: `{formId}:{sessionId}` |
| `Session_ID__c` | Session ID | Text (255) | ✅ **CRITICAL** | UUID v4 session identifier |
| `Submission_Data__c` | Submission Data | Long Text Area (131072) | No | JSON string of form field values |
| `Status__c` | Status | Picklist | No | Values: Submitted, Processed, Error |
| `Submitted_At__c` | Submitted At | Date/Time | No | Timestamp of submission |

---

## Deployment Methods

### Option A: Deploy via Salesforce CLI (Recommended)

```bash
cd salesforce
sfdx auth:web:login -a myorg
sfdx project deploy start
```

This will deploy both objects with all fields automatically.

### Option B: Manual Setup in Salesforce UI

#### Create Form_Definition__c:

1. **Setup → Object Manager → Create → Custom Object**
   - Label: `Form Definition`
   - Plural Label: `Form Definitions`
   - Object Name: `Form_Definition__c`
   - ✅ Allow Reports
   - ✅ Allow Activities
   - Save

2. **Add Field: Form_Id__c**
   - Field Type: Text
   - Length: 255
   - Field Label: `Form ID`
   - ✅ Required
   - ✅ Unique
   - Save

3. **Add Field: Fields_JSON__c**
   - Field Type: Long Text Area
   - Length: 131072
   - Field Label: `Fields JSON`
   - Visible Lines: 10
   - Save

4. **Add Field: Mapping_Rules__c**
   - Field Type: Long Text Area
   - Length: 131072
   - Field Label: `Mapping Rules`
   - Visible Lines: 10
   - Save

5. **Add Field: Active__c**
   - Field Type: Checkbox
   - Field Label: `Active`
   - Default Value: ✅ Checked
   - Save

#### Create Form_Submission__c:

1. **Setup → Object Manager → Create → Custom Object**
   - Label: `Form Submission`
   - Plural Label: `Form Submissions`
   - Object Name: `Form_Submission__c`
   - Record Name Format: Auto Number
   - Display Format: `SUB-{0000}`
   - Starting Number: 1
   - ✅ Allow Reports
   - ✅ Allow Activities
   - Save

2. **Add Field: Form_Definition__c** (Master-Detail)
   - Field Type: Master-Detail Relationship
   - Related To: `Form Definition`
   - Field Label: `Form Definition`
   - Relationship Name: `Form_Submissions`
   - Save

3. **Add Field: Form_Id__c**
   - Field Type: Text
   - Length: 255
   - Field Label: `Form ID`
   - Save

4. **Add Field: Context_ID__c** ⚠️ **CRITICAL**
   - Field Type: Text
   - Length: 255
   - Field Label: `Context ID`
   - Save

5. **Add Field: Session_ID__c** ⚠️ **CRITICAL**
   - Field Type: Text
   - Length: 255
   - Field Label: `Session ID`
   - Save

6. **Add Field: Submission_Data__c**
   - Field Type: Long Text Area
   - Length: 131072
   - Field Label: `Submission Data`
   - Visible Lines: 10
   - Save

7. **Add Field: Status__c**
   - Field Type: Picklist
   - Field Label: `Status`
   - Values:
     - Submitted (Default)
     - Processed
     - Error
   - Save

8. **Add Field: Submitted_At__c**
   - Field Type: Date/Time
   - Field Label: `Submitted At`
   - Save

---

## Sample Form Definition Data

### Test Drive Form Example

**Form_Definition__c Record**:

- **Name**: `Test Drive Form`
- **Form_Id__c**: `test-drive-form`
- **Active__c**: ✅ `true`

**Fields_JSON__c** (JSON string):
```json
[
  {
    "name": "name",
    "label": "Your Name",
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
    "required": true,
    "validation": {
      "pattern": "^[\\d\\s\\-\\(\\)\\+]+$"
    }
  },
  {
    "name": "preferred_date",
    "label": "Preferred Date",
    "type": "date",
    "required": false
  },
  {
    "name": "preferred_time",
    "label": "Preferred Time",
    "type": "select",
    "required": false,
    "validation": {
      "options": ["Morning (9am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-8pm)"]
    }
  },
  {
    "name": "special_requests",
    "label": "Special Requests or Notes",
    "type": "textarea",
    "required": false
  }
]
```

**Mapping_Rules__c** (JSON string):
```json
{
  "salesforceObject": "Form_Submission__c",
  "fieldMappings": {
    "name": "Name",
    "email": "Email__c",
    "phone": "Phone__c"
  }
}
```

**Note**: If you want to map to standard Salesforce objects (e.g., `Contact`, `Lead`), adjust the `salesforceObject` and `fieldMappings` accordingly.

---

## Quick Setup Script

After deploying objects, you can create a test form via:

### Salesforce UI:
1. Go to **Form Definitions** tab
2. Click **New**
3. Fill in Name, Form_Id__c, Fields_JSON__c, Mapping_Rules__c
4. Save

### Salesforce Developer Console (Apex):
```apex
Form_Definition__c testForm = new Form_Definition__c(
    Name = 'Test Drive Form',
    Form_Id__c = 'test-drive-form',
    Active__c = true,
    Fields_JSON__c = '[{"name":"name","label":"Your Name","type":"text","required":true}]',
    Mapping_Rules__c = '{"salesforceObject":"Form_Submission__c","fieldMappings":{}}'
);
insert testForm;
```

### Via Broker API (after connection):
```bash
# Not directly supported - forms must be created in Salesforce UI or CLI
```

---

## Important Notes

1. **Context_ID__c Format**: Must be `{formId}:{sessionId}` (e.g., `test-drive-form:550e8400-e29b-41d4-a716-446655440000`)

2. **Session_ID__c Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

3. **Form_Id__c Must Be Unique**: Enforced at Salesforce level

4. **JSON Fields**: Fields_JSON__c and Mapping_Rules__c must contain valid JSON strings

5. **Active__c**: Inactive forms won't be returned by broker queries (per blueprint)

---

## Verification

After creating objects:

1. **Check Objects Exist**:
   ```bash
   # In Salesforce, verify tabs appear:
   # - Form Definitions
   # - Form Submissions
   ```

2. **Test Form Retrieval**:
   ```bash
   curl http://localhost:3001/api/forms/test-drive-form
   ```

3. **Test Form Submission**:
   - Submit via frontend modal
   - Check Form_Submission__c records created in Salesforce
   - Verify Context_ID__c and Session_ID__c are populated

