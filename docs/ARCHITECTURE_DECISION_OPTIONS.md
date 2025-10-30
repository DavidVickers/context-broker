# Architecture Decision: How to Link Forms to Business Objects

## The Problem

You want to:
1. **Track form submissions** (Form_Submission__c records)
2. **Create business objects** from forms (Lead, Case, Contact, etc.) based on Mapping_Rules__c JSON
3. **Link submissions to business objects** for reporting/tracking
4. **Keep it flexible** - new forms and object types without code changes

## Current State

- `Form_Definition__c` stores form schema and `Mapping_Rules__c` JSON
- `Form_Submission__c` tracks submissions (has Context_ID__c, Session_ID__c, Submission_Data__c)
- Broker creates business objects (Lead/Case/etc.) but **no link back to Form_Submission__c**
- Can't easily answer: "Which form created this Lead?" or "Show me all Leads from form X"

## Architecture Options

### Option 1: Junction Object Pattern (Your Original Idea)

**Concept:**
```
Form_Submission__c acts as junction linking:
  - Form_Definition__c (which form)
  - Business Object (Lead, Case, Contact, etc.)
```

**Schema:**
- `Form_Submission__c` (existing, acts as junction)
  - `Form_Definition__c` (Master-Detail) ✅ Already exists
  - `Related_Record_Id__c` (Text) - ID of created business object
  - `Related_Object_Type__c` (Text) - "Lead", "Case", etc.
  - `Context_ID__c`, `Submission_Data__c`, etc. ✅ Already exists

**Pros:**
- ✅ Standard Salesforce pattern (well-understood)
- ✅ Single source of truth per submission
- ✅ Can query both directions (submission → Lead, Lead → submission)
- ✅ Flexible - works with any object type
- ✅ Reportable via standard SOQL

**Cons:**
- ❌ Two-step creation (create Lead, then update Form_Submission__c)
- ❌ Need to store ID as text (no true polymorphic lookup on custom objects)
- ❌ Manual relationship (no referential integrity)

**Workflow:**
1. Create Lead (or Case, etc.)
2. Create Form_Submission__c with Related_Record_Id__c = Lead.Id
3. Both records linked

---

### Option 2: Store ID in JSON (Simple)

**Concept:**
```
Form_Submission__c.Submission_Data__c contains:
{
  "name": "John",
  "email": "john@example.com",
  "_createdRecordId": "00Q...",  // Lead ID stored here
  "_createdRecordType": "Lead"
}
```

**Schema:**
- No schema changes needed
- Store business record ID in Submission_Data__c JSON

**Pros:**
- ✅ No schema changes
- ✅ Very simple implementation
- ✅ All data in one place

**Cons:**
- ❌ Not queryable (can't SOQL query by business record ID)
- ❌ No referential integrity
- ❌ Can't build reports easily
- ❌ Hard to query "all Leads from forms"

---

### Option 3: Separate Lookup Fields from Business Objects

**Concept:**
```
Each business object (Lead, Case, Contact) gets:
  - Form_Submission__c lookup field (added via managed package or manually)
```

**Schema:**
- Lead.Form_Submission__c (Lookup to Form_Submission__c)
- Case.Form_Submission__c (Lookup to Form_Submission__c)
- Contact.Form_Submission__c (Lookup to Form_Submission__c)
- etc.

**Pros:**
- ✅ True Salesforce relationship (with referential integrity)
- ✅ Standard SOQL joins work perfectly
- ✅ Can build reports easily

**Cons:**
- ❌ Requires schema change on EACH object type (Lead, Case, Contact, etc.)
- ❌ Not flexible - need to modify schema for new object types
- ❌ Can't add fields to standard objects in some orgs
- ❌ Maintenance burden (new field per object type)

---

### Option 4: Hybrid: Junction + JSON (Best of Both?)

**Concept:**
```
Form_Submission__c:
  - Related_Record_Id__c (Text) - for querying
  - Submission_Data__c (JSON) - includes record ID too
```

**Pros:**
- ✅ Queryable via Related_Record_Id__c
- ✅ Full data in JSON
- ✅ Flexible

**Cons:**
- ❌ Data duplication (ID in two places)
- ❌ Need to keep in sync

---

## My Recommendation

**Option 1: Junction Object Pattern** (ref-order-form of your original idea)

**Why:**
1. **Scalable** - Works with any object type without schema changes
2. **Queryable** - Can report on "Leads from forms" vs "Cases from forms"
3. **Standard pattern** - Salesforce developers understand junction objects
4. **Flexible** - JSON-based mappings don't require code changes
5. **Proven** - Common pattern in Salesforce (CampaignMembers, OpportunityLineItem, etc.)

**Refinements:**
- Use `Related_Record_Id__c` (Text, 18) instead of true polymorphic lookup (not available)
- Use `Related_Object_Type__c` (Text) to filter queries
- Store full Submission_Data__c JSON for audit trail

## Decision Points

**Questions for you:**

1. **Do you need to query "all Leads submitted via forms"?**
   - ✅ Yes → Need Option 1 or 3
   - ❌ No → Option 2 is fine

2. **Will you add new object types frequently?**
   - ✅ Yes → Option 1 (junction) is best
   - ❌ No → Option 3 (lookup fields) might work

3. **Do you need true referential integrity?**
   - ✅ Yes → Option 3 (but requires schema per object)
   - ❌ No → Option 1 works fine

4. **How important is "standard Salesforce pattern"?**
   - ✅ Important → Option 1 (junction) or Option 3 (lookup)
   - ❌ Not important → Option 2 (JSON) is simplest

## What Would You Like?

Please tell me:
1. Which option do you prefer?
2. Any concerns with junction object pattern?
3. What are your most important requirements?

**I've already prepared Option 1 (junction object) metadata, but haven't deployed it yet. We can pivot to any approach you prefer!**

