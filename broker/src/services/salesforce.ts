import jsforce, { Connection, QueryResult } from 'jsforce';
import dotenv from 'dotenv';
import { tokenManager } from './tokenManager';

dotenv.config();

let connection: Connection | null = null;

interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  loginUrl: string;
}

export const initializeSalesforce = async (): Promise<Connection> => {
  if (connection) {
    return connection;
  }

  // Validate required environment variables (now using refresh tokens from OAuth, not username/password)
  const requiredVars = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    // In development, just return null - don't throw
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Salesforce credentials not configured - continuing without Salesforce');
      return null as any; // Return null connection - calling code should check
    }
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID || '';
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET || '';
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  console.log('🔍 Initializing Salesforce service account connection (using refresh token from OAuth)...');

  try {
    // Look for service account session stored from OAuth Authorization Code Flow
    const serviceAccountContextId = 'service_account';
    const session = tokenManager.getSessionByContextId(serviceAccountContextId);
    
    if (session && session.tokenData.refresh_token) {
      console.log('✅ Found stored service account session with refresh token');
      
      // Get valid access token (will auto-refresh if expired)
      const accessToken = await tokenManager.getValidAccessToken(session.sessionId);
      
      if (accessToken && session.tokenData.instance_url) {
        // Normalize instance URL
        const instanceUrl = session.tokenData.instance_url
          .replace('.my.salesforce-setup.com', '.my.salesforce.com')
          .replace('.my.site.com', '.my.salesforce.com');
        
        connection = new jsforce.Connection({
          instanceUrl: instanceUrl,
          accessToken: accessToken,
          version: '58.0'
        });
        
        // Explicitly set to ensure jsforce uses them
        connection.instanceUrl = instanceUrl;
        connection.accessToken = accessToken;
        
        console.log('✅ Using stored service account session (OAuth Authorization Code Flow)');
        console.log(`📋 Instance URL: ${instanceUrl}`);
        return connection;
      }
    }
    
    // No stored session - need to create one via OAuth Authorization Code Flow first
    console.log('⚠️  No service account session found');
    console.log('   To enable automatic authentication:');
    console.log('   1. Complete OAuth Authorization Code Flow once with contextId="service_account"');
    console.log('   2. Refresh token will be stored and reused for all form submissions');
    console.log('   3. Visit: http://localhost:3001/oauth/authorize?contextId=service_account');
    
    throw new Error('No service account session available. Complete OAuth Authorization Code Flow once with contextId=service_account to create a persistent session.');
  } catch (error: any) {
    console.error('\n❌ Salesforce authentication failed!');
    console.error('─────────────────────────────────────────');
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Code: ${error.errorCode || 'N/A'}`);
    console.error(`Error Name: ${error.name || 'N/A'}`);
    
    // Log the full error object for debugging
    console.error('\n📋 Full Error Object:');
    console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Provide specific error details
    if (error.errorCode) {
      console.error(`\n📋 Error Code Details: ${error.errorCode}`);
    }
    
    // Log full error if available
    if (error.error) {
      console.error(`\nError Response:`, JSON.stringify(error.error, null, 2));
    }
    
    // Check for response body
    if (error.response) {
      console.error(`\nHTTP Response Status: ${error.response.status || 'N/A'}`);
      console.error(`HTTP Response Body:`, JSON.stringify(error.response.body || error.response, null, 2));
    }

    // Common error code mappings
    const errorCodeMap: Record<string, string> = {
      'INVALID_LOGIN': 'Invalid username, password, or security token',
      'INVALID_CLIENT_ID': 'Invalid Consumer Key (Client ID). Check your External Client App configuration.',
      'INVALID_CLIENT': 'Invalid Consumer Key or Consumer Secret',
      'LOGIN_DENIED': 'Login denied - check user permissions',
      'REQUEST_LIMIT_EXCEEDED': 'API request limit exceeded',
      'INVALID_SESSION_ID': 'Session expired or invalid',
      'invalid_grant': 'OAuth grant rejected - usually means username/password invalid OR "Require Secret for Web Server Flow" is NOT checked in Connected App',
    };

    if (error.errorCode && errorCodeMap[error.errorCode]) {
      console.error(`\n💡 Likely Cause: ${errorCodeMap[error.errorCode]}`);
    }

    // Provide troubleshooting hints based on error
    if (error.message?.includes('authentication failure') || error.message?.includes('INVALID_LOGIN')) {
      console.error('\n🔧 Troubleshooting Steps:');
      console.error('   1. Verify username is correct (include .sandbox for sandbox orgs)');
      console.error('   2. Verify password is correct (no extra spaces)');
      console.error('   3. OAuth Authorization Code Flow must be completed first');
      console.error('   4. Verify login URL matches org type (test.salesforce.com for sandbox)');
    }

    if (error.message?.includes('client') || error.errorCode === 'INVALID_CLIENT_ID') {
      console.error('\n🔧 Troubleshooting Steps:');
      console.error('   1. Verify Consumer Key (SALESFORCE_CLIENT_ID) matches your External Client App');
      console.error('   2. Verify Consumer Secret (SALESFORCE_CLIENT_SECRET) is correct');
      console.error('   3. Check that External Client App is Active');
      console.error('   4. Verify OAuth settings are enabled on the app');
      console.error('   5. ⚠️  CRITICAL: Check "Require Secret for Web Server Flow" is CHECKED');
    }
    
    // Special handling for invalid_grant
    if (error.name === 'invalid_grant' || error.message?.includes('invalid_grant')) {
      console.error('\n🎯 CRITICAL FIX for invalid_grant error:');
      console.error('   → Go to: Setup → App Manager → Your External Client App → Edit');
      console.error('   → Under "Enable OAuth" section, verify:');
      console.error('   → ✅ "Require Secret for Web Server Flow" is CHECKED');
      console.error('   → ✅ "Enable Authorization Code and Credentials Flow" is CHECKED');
      console.error('   → ✅ "Require user credentials in the POST body" is CHECKED');
      console.error('   → ✅ Connected App status is "Active"');
      console.error('\n🧪 To initialize service account:');
      console.error(`   → Visit: http://localhost:3001/oauth/authorize?contextId=service_account`);
      console.error(`   → Complete the OAuth Authorization Code Flow once`);
    }
    
    // Special note if no failed logins in Salesforce
    console.error('\n💡 IMPORTANT: If you see NO failed logins in Salesforce Setup → Login History:');
    console.error('   → The request is being rejected at the OAuth/Connected App level');
    console.error('   → This typically means "Require Secret for Web Server Flow" is NOT checked');
    console.error('   → Or Consumer Key/Secret mismatch');

    console.error('─────────────────────────────────────────\n');
    
    throw new Error(`Salesforce authentication failed: ${error.message}${error.errorCode ? ` (${error.errorCode})` : ''}`);
  }
};

export const getSalesforceConnection = (): Connection => {
  if (!connection) {
    throw new Error('Salesforce connection not initialized. Call initializeSalesforce() first.');
  }
  
  // Verify instanceUrl is set (critical for API calls)
  if (!connection.instanceUrl) {
    console.error('❌ Connection exists but instanceUrl is missing! Re-authenticating...');
    // Force re-authentication
    connection = null;
    throw new Error('Salesforce connection missing instanceUrl. Connection needs to be re-authenticated.');
  }
  
  return connection;
};

export const querySalesforce = async (soql: string): Promise<QueryResult<any>> => {
  try {
    let conn: Connection;
    try {
      conn = getSalesforceConnection();
    } catch (error: any) {
      // If connection doesn't exist, try to initialize it
      if (error.message?.includes('not initialized')) {
        console.log('🔄 Connection not initialized, initializing now...');
        conn = await initializeSalesforce();
      } else {
        throw error;
      }
    }
    
    // Verify instanceUrl before query
    if (!conn.instanceUrl) {
      console.error('❌ Connection missing instanceUrl in querySalesforce!');
      throw new Error('Salesforce connection missing instanceUrl');
    }
    
    return await conn.query(soql);
  } catch (error: any) {
    throw error;
  }
};

export const createSalesforceRecord = async (sobjectType: string, record: Record<string, any>): Promise<string> => {
  const conn = getSalesforceConnection();
  const result = await conn.sobject(sobjectType).create(record);
  
  if (!result.success) {
    throw new Error(`Failed to create record: ${result.errors?.join(', ')}`);
  }
  
  return result.id;
};

export const updateSalesforceRecord = async (sobjectType: string, id: string, record: Record<string, any>): Promise<void> => {
  const conn = getSalesforceConnection();
  const result = await conn.sobject(sobjectType).update({
    Id: id,
    ...record,
  });
  
  if (!result.success) {
    throw new Error(`Failed to update record: ${result.errors?.join(', ')}`);
  }
};

/**
 * Get authenticated Salesforce connection for a specific session
 */
export async function getAuthenticatedSalesforceConnection(sessionId: string): Promise<Connection | null> {
  const session = tokenManager.getSession(sessionId);
  if (!session) {
    console.log(`❌ Session ${sessionId} not found`);
    return null;
  }

  const accessToken = await tokenManager.getValidAccessToken(sessionId);
  if (!accessToken) {
    console.log(`❌ No valid access token for session ${sessionId}`);
    return null;
  }

  // Create authenticated connection
  // Use instance_url from OAuth response (required for custom domains)
  const instanceUrlRaw = session.tokenData.instance_url;
  if (!instanceUrlRaw) {
    console.error(`❌ No instance_url in token data for session ${sessionId}`);
    console.error('   This is required for Salesforce API calls, especially with custom domains');
    console.error('   Token data keys:', Object.keys(session.tokenData));
    return null;
  }
  
  // Normalize setup domains to API domains (remove "-setup")
  const instanceUrl = instanceUrlRaw
    .replace('.my.salesforce-setup.com', '.my.salesforce.com')
    .replace('.my.site.com', '.my.salesforce.com');
  
  console.log(`🔗 Using instance URL: ${instanceUrl}`);
  const conn = new jsforce.Connection({
    instanceUrl,
    accessToken: accessToken,
    version: '58.0'
  });

  // Explicitly set instanceUrl after creation (jsforce sometimes needs this)
  conn.instanceUrl = instanceUrl;
  conn.accessToken = accessToken;
  
  console.log(`✅ Created authenticated Salesforce connection for session ${sessionId}`);
  console.log(`   Verified instance URL: ${conn.instanceUrl}`);
  return conn;
}

/**
 * Get authenticated Salesforce connection by contextId
 */
export async function getAuthenticatedSalesforceConnectionByContextId(contextId: string): Promise<Connection | null> {
  const session = tokenManager.getSessionByContextId(contextId);
  if (!session) {
    console.log(`❌ No session found for contextId ${contextId}`);
    return null;
  }

  return getAuthenticatedSalesforceConnection(session.sessionId);
}

export default {
  initializeSalesforce,
  getSalesforceConnection,
  getAuthenticatedSalesforceConnection,
  getAuthenticatedSalesforceConnectionByContextId,
  querySalesforce,
  createSalesforceRecord,
  updateSalesforceRecord,
};


