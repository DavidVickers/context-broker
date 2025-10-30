# Removing "Vehicle of Interest" Field from Form Definition

## Why Remove It?

The "Vehicle of Interest" field should be automatically filled from the context where the "Test Drive" button was clicked. The vehicle information is already passed in the form submission via `itemMetadata` from the button context.

## Vehicle Information Flow

1. **Button Click**: User clicks "Test Drive" button on a vehicle card
2. **Context Passed**: Vehicle metadata is passed via `itemContext.itemMetadata`:
   ```javascript
   {
     vehicle_name: "2024 Toyota Camry Hybrid",
     vehicle_price: "$32,450",
     vehicle_features: "8-Speed CVT • 52 MPG • Safety Sense 2.0",
     vehicle_make: "Toyota",
     vehicle_fuel_type: "Hybrid"
   }
   ```
3. **Form Submission**: This metadata is automatically merged into form data
4. **No User Input Needed**: The vehicle information is already known from context

## How to Remove the Field

### Step 1: Edit Form Definition in Salesforce

1. Navigate to **Form Definition** tab in Salesforce
2. Find your form record (e.g., `test-drive-form`)
3. Edit the **Fields JSON** field
4. Find the field with `"name": "vehicleInterest"` or similar
5. Remove that field from the form definition

### Step 2: Example - Before

```json
{
  "sections": [
    {
      "id": "enquiry-details",
      "title": "Enquiry Details",
      "fields": [
        {
          "name": "vehicleInterest",
          "label": "Vehicle of Interest",
          "type": "text",
          "required": false
        }
      ]
    }
  ]
}
```

### Step 3: Example - After

```json
{
  "sections": [
    {
      "id": "enquiry-details",
      "title": "Enquiry Details",
      "fields": [
        {
          "name": "preferredDate",
          "label": "Preferred Date",
          "type": "date",
          "required": false
        }
      ]
    }
  ]
}
```

## Verification

After removing the field:

1. ✅ Form no longer shows "Vehicle of Interest" field
2. ✅ Vehicle information is still included in form submission (from context)
3. ✅ Form submission JSON includes `vehicle_name`, `vehicle_make`, etc. (from `itemMetadata`)
4. ✅ No user input required for vehicle information

## Vehicle Information in Form Submission

The vehicle information will automatically be included in the form submission via `itemContext.itemMetadata`:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "vehicle_name": "2024 Toyota Camry Hybrid",
  "vehicle_price": "$32,450",
  "vehicle_features": "8-Speed CVT • 52 MPG • Safety Sense 2.0",
  "vehicle_make": "Toyota",
  "vehicle_fuel_type": "Hybrid"
}
```

This data is stored in `Form_Submission__c.Submission_Data__c` as JSON, so the vehicle information is preserved even though the field is removed from the form UI.

