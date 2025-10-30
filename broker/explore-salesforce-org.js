// Explore Salesforce org schema and records
const jsforce = require('jsforce');

// Your OAuth session details from earlier
const accessToken = '00DW4000006SS9B!AQEAQBE9rKPN3sf65k9nnvi5QZ_KMUnIBt...'; // Your access token
const contextId = 'oauth_1761829631698';

async function exploreOrg() {
  try {
    const conn = new jsforce.Connection({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: accessToken,
      version: '58.0'
    });

    console.log('🔍 Exploring Salesforce Org...\n');

    // 1. Get org info
    console.log('📊 ORG INFORMATION:');
    const orgInfo = await conn.query('SELECT Id, Name, OrganizationType, Country, State FROM Organization LIMIT 1');
    console.log(JSON.stringify(orgInfo.records[0], null, 2));
    console.log('');

    // 2. List all custom objects
    console.log('🏗️  CUSTOM OBJECTS:');
    const customObjects = await conn.describeGlobal();
    const customObjectsList = customObjects.sobjects
      .filter(obj => obj.custom)
      .map(obj => ({ name: obj.name, label: obj.label }));
    console.log(JSON.stringify(customObjectsList, null, 2));
    console.log('');

    // 3. Check our Form_Definition__c object
    console.log('📝 FORM_DEFINITION__C OBJECT:');
    const formDefDescribe = await conn.describe('Form_Definition__c');
    console.log(`Label: ${formDefDescribe.label}`);
    console.log(`Fields: ${formDefDescribe.fields.length}`);
    console.log('Field details:');
    formDefDescribe.fields.forEach(field => {
      console.log(`  - ${field.name} (${field.type}) - ${field.label}`);
    });
    console.log('');

    // 4. Get all Form_Definition__c records
    console.log('📋 FORM_DEFINITION__C RECORDS:');
    const formRecords = await conn.query('SELECT Id, Name, Form_Id__c, Active__c, CreatedDate FROM Form_Definition__c ORDER BY CreatedDate DESC');
    console.log(`Total records: ${formRecords.totalSize}`);
    formRecords.records.forEach(record => {
      console.log(`  - ${record.Name} (${record.Form_Id__c}) - Active: ${record.Active__c}`);
    });
    console.log('');

    // 5. Check Form_Submission__c object
    console.log('📤 FORM_SUBMISSION__C OBJECT:');
    const formSubDescribe = await conn.describe('Form_Submission__c');
    console.log(`Label: ${formSubDescribe.label}`);
    console.log(`Fields: ${formSubDescribe.fields.length}`);
    console.log('Field details:');
    formSubDescribe.fields.forEach(field => {
      console.log(`  - ${field.name} (${field.type}) - ${field.label}`);
    });
    console.log('');

    // 6. Get all Form_Submission__c records
    console.log('📥 FORM_SUBMISSION__C RECORDS:');
    const subRecords = await conn.query('SELECT Id, Name, Context_ID__c, Session_ID__c, Status__c, CreatedDate FROM Form_Submission__c ORDER BY CreatedDate DESC LIMIT 10');
    console.log(`Total records: ${subRecords.totalSize}`);
    subRecords.records.forEach(record => {
      console.log(`  - ${record.Name} - Context: ${record.Context_ID__c} - Status: ${record.Status__c}`);
    });
    console.log('');

    // 7. List standard objects that might be useful
    console.log('🏢 STANDARD OBJECTS (useful for vehicle inventory):');
    const standardObjects = customObjects.sobjects
      .filter(obj => !obj.custom && ['Account', 'Contact', 'Lead', 'Opportunity', 'Product2', 'Pricebook2', 'PricebookEntry'].includes(obj.name))
      .map(obj => ({ name: obj.name, label: obj.label }));
    console.log(JSON.stringify(standardObjects, null, 2));
    console.log('');

    // 8. Check if there are any existing vehicle-related records
    console.log('🚗 CHECKING FOR VEHICLE-RELATED DATA:');
    
    // Check Product2 (could be used for vehicles)
    try {
      const products = await conn.query('SELECT Id, Name, ProductCode, Family, IsActive FROM Product2 WHERE Family LIKE \'%Vehicle%\' OR Name LIKE \'%Car%\' OR Name LIKE \'%Auto%\' LIMIT 5');
      console.log(`Product2 records (vehicle-related): ${products.totalSize}`);
      products.records.forEach(product => {
        console.log(`  - ${product.Name} (${product.ProductCode}) - Family: ${product.Family}`);
      });
    } catch (error) {
      console.log('  No Product2 records found or accessible');
    }

    // Check for custom objects that might be vehicle-related
    const vehicleObjects = customObjects.sobjects
      .filter(obj => obj.custom && (obj.name.toLowerCase().includes('vehicle') || obj.name.toLowerCase().includes('car') || obj.name.toLowerCase().includes('inventory')))
      .map(obj => ({ name: obj.name, label: obj.label }));
    
    if (vehicleObjects.length > 0) {
      console.log('Vehicle-related custom objects:');
      console.log(JSON.stringify(vehicleObjects, null, 2));
    } else {
      console.log('  No vehicle-related custom objects found');
    }

  } catch (error) {
    console.error('❌ Error exploring org:', error.message);
  }
}

exploreOrg();
