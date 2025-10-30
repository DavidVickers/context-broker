# Broker Code Updated: Junction Object Pattern

## ✅ What Changed

The broker form submission logic has been updated to use the **Form_Submission_Relationship__c** junction object pattern.

## 🔄 New Submission Flow

### Step 1: Create Business Object (Lead, Case, etc.)
- Reads `Mapping_Rules__c` from `Form_Definition__c`
- Maps form fields to business object fields (e.g., `name` → `LastName`, `email` → `Email`)
- Creates the business object record (Lead, Case, Contact, etc.)
- **If business object creation fails**, still continues to Step 2 (for tracking)

### Step 2: Create Form_Submission__c Record
- **ALWAYS created** (even if business object creation failed)
- Stores full form data in `Submission_Data__c` (JSON)
- Sets `Status__c` to:
  - `"Processed"` if business object was created
  - `"Submitted"` if business object creation failed

### Step 3: Create Relationship Records
- Creates `Form_Submission_Relationship__c` record(s)
- Links `Form_Submission__c` to business object(s) via:
  - `Form_Submission__c` (Master-Detail)
  - `Related_Record_Id__c` (Lead/Case/etc. ID)
  - `Related_Object_Type__c` ("Lead", "Case", etc.)

## 📋 Do You Need to Add Fields to Lead?

**✅ NO - You don't need to add any fields to Lead!**

The junction object (`Form_Submission_Relationship__c`) handles all relationships. Lead doesn't need to know about form submissions.

**Why:**
- The relationship is tracked in `Form_Submission_Relationship__c`
- You can query "all Leads from forms" via the junction object
- Lead stays clean - no custom fields needed

**Example Query:**
```sql
SELECT Id, Email, LastName,
  (SELECT Form_Submission__c.Context_ID__c, Form_Submission__c.Submitted_At__c
   FROM Form_Submission_Relationships__r)
FROM Lead
WHERE Id IN (
  SELECT Related_Record_Id__c 
  FROM Form_Submission_Relationship__c 
  WHERE Related_Object_Type__c = 'Lead'
)
```

## 🎯 Response Format

The broker now returns:
```json
{
  "success": true,
  "recordId": "a0c123",  // Form_Submission__c ID
  "businessRecordIds": [
    {
      "id": "00Q000001",  // Lead ID
      "objectType": "Lead"
    }
  ],
  "relationshipIds": ["rel001"],  // Form_Submission_Relationship__c IDs
  "contextId": "test-drive-form:550e8400...",
  "message": "Form submitted successfully"
}
```

## 🔄 Future Enhancement: Multiple Relationships

The code is already structured to handle multiple relationships (e.g., Lead + Contact + Account). Just populate `businessRecordIds` array with all created records:

```typescript
businessRecordIds.push({ id: leadId, objectType: 'Lead' });
businessRecordIds.push({ id: contactId, objectType: 'Contact' });
businessRecordIds.push({ id: accountId, objectType: 'Account' });
```

All relationships will be created automatically in Step 3.

## 🧪 Testing

1. Submit a form that creates a Lead
2. Verify:
   - Lead record created
   - Form_Submission__c record created
   - Form_Submission_Relationship__c record created with link to Lead
3. Query relationships to verify links

## 📝 Summary

- ✅ Broker code updated
- ✅ No Lead fields needed
- ✅ Junction object handles all relationships
- ✅ Ready for multi-object relationships (Lead + Contact + Account)

