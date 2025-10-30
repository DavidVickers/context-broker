// Test Salesforce connection directly
const jsforce = require('jsforce');

async function testConnection() {
  try {
    // Use the access token from the OAuth flow
    const accessToken = '00DW4000006SS9B!AQEAQBuBK0tRDO7XHSiMuv9laf52THlbyE...';
    const instanceUrl = 'https://test.salesforce.com';
    
    const conn = new jsforce.Connection({
      instanceUrl: 'https://test.salesforce.com',
      accessToken: accessToken,
      version: '58.0'
    });
    
    // Force set the instance URL
    conn.instanceUrl = 'https://test.salesforce.com';

    console.log('🔍 Testing connection...');
    
    // Test simple query
    const query = `SELECT Id, Name FROM Form_Definition__c LIMIT 1`;
    console.log('Query:', query);
    
    const result = await conn.query(query);
    console.log('✅ Query successful!');
    console.log('Records:', result.records);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
