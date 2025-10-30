#!/bin/bash

# Create a test Form_Definition__c record in Salesforce
echo "🧪 Creating test Form_Definition__c record..."

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found"
    exit 1
fi

if [ -z "$SALESFORCE_CLIENT_ID" ] || [ -z "$SALESFORCE_CLIENT_SECRET" ] || [ -z "$SALESFORCE_USERNAME" ]; then
    echo "❌ Missing Salesforce credentials"
    exit 1
fi

# Test form data
FORM_DATA='{
  "Name": "Test Drive Form",
  "Form_Id__c": "test-drive-form",
  "Active__c": true,
  "Fields_JSON__c": "[{\"name\":\"name\",\"label\":\"Your Name\",\"type\":\"text\",\"required\":true,\"validation\":{\"minLength\":2,\"maxLength\":100}},{\"name\":\"email\",\"label\":\"Email Address\",\"type\":\"email\",\"required\":true,\"validation\":{\"pattern\":\"^[\\\\w\\\\.-]+@[\\\\w\\\\.-]+\\\\.[a-zA-Z]{2,}$\"}},{\"name\":\"phone\",\"label\":\"Phone Number\",\"type\":\"tel\",\"required\":true,\"validation\":{\"pattern\":\"^[\\\\d\\\\s\\\\-\\\\(\\\\)\\\\+]+$\"}},{\"name\":\"preferredDate\",\"label\":\"Preferred Test Drive Date\",\"type\":\"date\",\"required\":true},{\"name\":\"vehicleInterest\",\"label\":\"Vehicle of Interest\",\"type\":\"select\",\"required\":true,\"options\":[{\"value\":\"tesla-model-3\",\"label\":\"Tesla Model 3\"},{\"value\":\"tesla-model-y\",\"label\":\"Tesla Model Y\"},{\"value\":\"tesla-model-s\",\"label\":\"Tesla Model S\"},{\"value\":\"tesla-model-x\",\"label\":\"Tesla Model X\"}]},{\"name\":\"message\",\"label\":\"Additional Comments\",\"type\":\"textarea\",\"required\":false,\"validation\":{\"maxLength\":500}}]",
  "Mapping_Rules__c": "{\"salesforceObject\":\"Lead\",\"fieldMappings\":{\"name\":\"FirstName\",\"email\":\"Email\",\"phone\":\"Phone\",\"preferredDate\":\"Test_Drive_Date__c\",\"vehicleInterest\":\"Vehicle_Interest__c\",\"message\":\"Description\"}}",
  "Agent_Config__c": "{\"enabled\":true,\"triggers\":[\"focus\",\"change\",\"submit\"],\"ui\":{\"showProgress\":true,\"autoSave\":true},\"validation\":{\"realTime\":true,\"showErrors\":true}}"
}'

echo "📝 Form data to create:"
echo "$FORM_DATA" | jq .

echo ""
echo "🔄 Creating record in Salesforce..."

# Use the broker's Salesforce connection to create the record
curl -X POST "http://localhost:3001/api/forms/test-drive-form/create" \
  -H "Content-Type: application/json" \
  -d "$FORM_DATA" \
  -s | jq .

echo ""
echo "✅ Test form record creation attempted!"
echo "   Check the broker logs for details"
