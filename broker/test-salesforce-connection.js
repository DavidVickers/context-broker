// Test Salesforce connection with OAuth token
const jsforce = require('jsforce');

// Your OAuth session details
const sessionId = '40eb9690-040e-48e4-9300-ec869f6151eb';
const contextId = 'oauth_1761829631698';

// Test the connection
async function testConnection() {
  try {
    // This would normally come from the token manager
    const accessToken = '00DW4000006SS9B!AQEAQBE9rKPN3sf65k9nnvi5QZ_KMUnIBt...'; // Your access token
    
    const conn = new jsforce.Connection({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: accessToken,
      version: '58.0'
    });

    console.log('🔍 Testing Salesforce connection...');
    
    // Test basic query
    const result = await conn.query('SELECT Id, Name FROM User LIMIT 1');
    console.log('✅ Basic query successful:', result.records[0]);
    
    // Test Form_Definition__c query
    const formResult = await conn.query('SELECT Id, Name, Form_Id__c FROM Form_Definition__c LIMIT 5');
    console.log('✅ Form_Definition__c query successful:', formResult.records);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();
