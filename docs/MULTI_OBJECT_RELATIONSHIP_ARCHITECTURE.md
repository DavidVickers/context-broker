# Multi-Object Relationship Architecture

## The Real Requirement

**Scenario:**
- David Vickers bought a car 3 years ago (existing Contact)
- David comes back and fills out a form
- System needs to link ONE form submission to:
  1. **New Lead** (created from form)
  2. **Existing Contact** (matched by email)
  3. **Existing Account** (Contact's Account - "Vickers Household")
  4. Potentially other objects (Vehicle__c, Opportunity, etc.)

**Key Insight:** One form submission can relate to MULTIPLE objects, and relationships can include both:
- **Newly created records** (Lead from form)
- **Existing records** (Contact matched, Account linked)

## Solution: Separate Relationship Junction Object

### Architecture

```
Form_Submission__c (Tracks the submission itself)
  └─ Form_Submission_Relationship__c (Junction - ONE per related record)
     ├─ Form_Submission__c (Master-Detail)
     ├─ Related_Record_Id__c (Text - ID of any record)
     ├─ Related_Object_Type__c (Text - "Lead", "Contact", "Account")
     ├─ Relationship_Type__c (Picklist - "Created", "Matched", "Linked", "Parent")
     └─ Is_Primary__c (Checkbox - which record is the "main" one)
```

### Example Data

**Form_Submission__c:**
- Id: `a0c123`
- Context_ID__c: `test-drive-form:550e8400...`
- Form_Id__c: `test-drive-form`
- Submission_Data__c: `{"name": "David Vickers", "email": "david@example.com", ...}`

**Form_Submission_Relationship__c (4 records for one submission):**

| Id | Form_Submission__c | Related_Record_Id__c | Related_Object_Type__c | Relationship_Type__c | Is_Primary__c |
|----|-------------------|---------------------|----------------------|---------------------|---------------|
| rel1 | a0c123 | 00Q000001 | Lead | Created | ✅ true |
| rel2 | a0c123 | 003000002 | Contact | Matched | false |
| rel3 | a0c123 | 001000003 | Account | Linked | false |
| rel4 | a0c123 | a0v000004 | Vehicle__c | Linked | false |

### Query Examples

**"Show me all Leads created from forms":**
```sql
SELECT Id, Email, LastName,
  (SELECT Form_Submission__c.Context_ID__c, Form_Submission__c.Submitted_At__c
   FROM Form_Submission_Relationships__r
   WHERE Related_Object_Type__c = 'Lead' AND Relationship_Type__c = 'Created')
FROM Lead
WHERE Id IN (SELECT Related_Record_Id__c FROM Form_Submission_Relationship__c
             WHERE Related_Object_Type__c = 'Lead' AND Relationship_Type__c = 'Created')
```

**"Show me all form submissions that created Leads and matched Contacts":**
```sql
℡ELECT Form_Submission__c, Related_Record_Id__c, Related_Object_Type__c, Relationship_Type__c
FROM Form_Submission_Relationship__c
WHERE Form_Submission__c IN (
  SELECT Form_Submission__c FROM Form_Submission_Relationship__c
  WHERE Related_Object_Type__c = 'Lead' AND Relationship_Type__c = 'Created'
)
AND (
  Related_Object_Type__c = 'Lead' OR
  Related_Object_Type__c = 'Contact'
)
```

**"Show me David Vickers' form submission and all related records":**
```sql
SELECT Id, Related_Record_Id__c, Related_Object_Type__c, Relationship_Type__c,
       Form_Submission__c.Context_ID__c,
       Form_Submission__c.Submission_Data__c
FROM Form_Submission_Relationship__c
WHERE Form_Submission__c IN (
  SELECT Id FROM Form_Submission__c
  WHERE Submission_Data__c LIKE '%david@example.com%'
)
```

## Schema Definition

### Form_Submission_Relationship__c (New Junction Object)

**Fields:**
- `Form_Submission__c` (Master-Detail to Form_Submission__c) - Required
- `Related_Record_Id__c` (Text, 18) - ID of related record
- `Related_Object_Type__c` (Text, 50) - "Lead", "Contact", "Account", "Case", "Vehicle__c", etc.
- `Relationship_Type__c` (Picklist) - Values:
  - `Created` - Record created from this form submission
  - `Matched` - Existing record matched to this submission (by email, etc.)
  - `Linked` - Record linked for context (Account, Vehicle, etc.)
  - `Parent` - Parent relationship (Account → Contact → Lead)
- `Is_Primary__c` (Checkbox) - TRUE for the "main" record (usually the Created record)
- `Relationship_Metadata__c` (LongTextArea, JSON) - Optional: matching criteria, confidence score, etc.

**Optional but useful:**
- `Related_Record_Name__c` (Formula) - Name of related record (for reporting)
- `Created_At__c` (DateTime) - When relationship established

## Broker Implementation Pattern

```typescript
// Step 1: Create business object(s) from form
const leadResult = await conn.sobject('Lead').create({
  LastName: formData.name,
  Email: formData.email,
  // ...
});

// Step 2: Match existing records
const contact = await matchContactByEmail(formData.email);
const account = contact?.AccountId ? await getAccount(contact.AccountId) : null;

// Step 3: Create Form_Submission__c
const submission = await conn.sobject('Form_Submission__c').create({
  Form_Definition__c: formDefId,
  Context_ID__c: contextId,
  Submission_Data__c: JSON.stringify(formData),
  Status__c: 'Processed',
  Processed_At__c: new Date().toISOString()
});

// Step 4: Create relationship records (multiple!)
const relationships = [
  {
    Form_Submission__c: submission.id,
    Related_Record_Id__c: leadResult.id,
    Related_Object_Type__c: 'Lead',
    Relationship_Type__c: 'Created',
    Is_Primary__c: true
  },
  {
    Form_Submission__c: submission.id,
    Related_Record_Id__c: contact.id,
    Related_Object_Type__c: 'Contact',
    Relationship_Type__c: 'Matched',
    Is_Primary__c: false
  },
  {
    Form_Submission__c: submission.id,
    Related_Record_Id__c: account.id,
    Related_Object_Type__c: 'Account',
    Relationship_Type__c: 'Linked',
    Is_Primary__c: false
  }
];

// Bulk create all relationships
await conn.sobject('Form_Submission_Relationship__c').create(relationships);
```

## Benefits

1. ✅ **Universal** - Works with any object type, any number of relationships
2. ✅ **Flexible** - Different forms can have different relationship patterns
3. ✅ **Queryable** - Standard SOQL for reporting
4. ✅ **Scalable** - Handles complex scenarios (Lead + Contact + Account + Vehicle)
5. ✅ **Clear intent** - Relationship_Type__c shows WHY the relationship exists
6. ✅ **Auditable** - Can track matching logic, confidence scores in metadata

## Mapping_Rules__c Enhancement

**Current:**
```json
{
  "salesforceObject": "Lead",
  "fieldMappings": { ... }
}
```

**Enhanced (optional):**
```json
{
  "salesforceObject": "Lead",
  "fieldMappings": { ... },
  "relationships": [
    {
      "type": "Match",
      "object": "Contact",
      "matchCriteria": {
        "field": "Email",
        "source": "formData.email",
        "strategy": "exact"
      }
    },
    {
      "type": "Link",
      "object": "Account",
      "source": "Contact.AccountId",
      "itr": "auto"
    }
  ]
}
```

## Deployment Strategy

### Phase 1: Core Junction Object
- Create `Form_Submission_Relationship__c` object
- Deploy basic fields
- Update broker to create relationships

### Phase 2: Enhanced Features
- Add Relationship_Type__c picklist values
- Add matching logic in broker
- Add relationship metadata JSON

### Phase 3: Reporting
- Build reports showing form submissions with all related records
- Create dashboards for form analytics

## Migration from Single Relationship

If we already have `Related_Record_Id__c` on `Form_Submission__c`:

1. Create migration script to:
   - Find all Form_Submission__c with Related_Record_Id__c
   - Create Form_Submission_Relationship__c records
   - Set Is_Primary__c = true

2. Keep old fields temporarily (for backward compatibility)
3. Remove old fields once migrated

## Next Steps

1. **Approve this architecture?**
2. **Create Form_Submission_Relationship__c metadata**
3. **Update broker code to create multiple relationships**
4. **Add matching logic** (email matching, etc.)

This pattern gives you the universal flexibility you need! 🎯

