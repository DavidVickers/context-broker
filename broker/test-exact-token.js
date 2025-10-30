// Test with exact access token from OAuth response
async function testExactToken() {
  try {
    // Use the exact token from the OAuth response (not truncated)
    const accessToken = '00DW4000006SS9B!AQEAQLsE.7W.07.S3NSvQYY2ANwkNMOYYP...'; // This is truncated
    const instanceUrl = 'https://test.salesforce.com';
    
    console.log('🔍 Testing with exact token...');
    console.log('Token length:', accessToken.length);
    console.log('Token starts with:', accessToken.substring(0, 20));
    
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
      console.log('✅ Query successful!');
      console.log('Records:', data.records);
    } else {
      console.error('❌ Error:', data);
      console.error('Status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExactToken();
