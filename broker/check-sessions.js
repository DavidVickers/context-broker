// Check available OAuth sessions
const { tokenManager } = require('./src/services/tokenManager');

console.log('🔍 Checking available OAuth sessions...');

const sessions = tokenManager.getAllSessions();
console.log(`Found ${sessions.length} sessions:`);

sessions.forEach((session, index) => {
  console.log(`\nSession ${index + 1}:`);
  console.log(`  Session ID: ${session.sessionId}`);
  console.log(`  Context ID: ${session.contextId}`);
  console.log(`  User ID: ${session.userId || 'Not set'}`);
  console.log(`  User Email: ${session.userEmail || 'Not set'}`);
  console.log(`  Created: ${new Date(session.createdAt).toISOString()}`);
  console.log(`  Last Accessed: ${new Date(session.lastAccessed).toISOString()}`);
  console.log(`  Token Expires: ${new Date(session.tokenData.expires_at).toISOString()}`);
  console.log(`  Has Access Token: ${!!session.tokenData.access_token}`);
  console.log(`  Has Refresh Token: ${!!session.tokenData.refresh_token}`);
});

if (sessions.length === 0) {
  console.log('\n❌ No OAuth sessions found. You need to complete the OAuth flow again.');
  console.log('Run: ./test-oauth-with-scopes.sh');
}
