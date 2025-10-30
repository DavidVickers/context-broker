// Test Salesforce REST API directly

async function testRestAPI() {
  try {
    const accessToken = '00DW4000006SS9B!AQEAQLsE.7W.07.S3NSvQYY2ANwkNMOYYP...';
    const instanceUrl = 'https://login.salesforce.com';
    
    console.log('🔍 Testing REST API...');
    
    // Test simple query
    const query = `SELECT Id, Name FROM Form_Definition__c LIMIT 1`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${instanceUrl}/services/data/v58.0/query?q=${encodedQuery}`;
    
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ REST API query successful!');
      console.log('Records:', data.records);
    } else {
      console.error('❌ REST API error:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRestAPI();
