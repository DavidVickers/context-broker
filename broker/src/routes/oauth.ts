import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';
import { tokenManager } from '../services/tokenManager';

dotenv.config();

const router = Router();

// Generate OAuth authorization URL
router.get('/oauth/authorize', (req: Request, res: Response) => {
  const contextId = (req.query.contextId as string) || `oauth_${Date.now()}`;
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
  const redirectUri = 'http://localhost:3001/oauth/callback';
  
  if (!clientId) {
    return res.status(500).json({
      error: 'SALESFORCE_CLIENT_ID not configured',
      message: 'Please set SALESFORCE_CLIENT_ID in .env'
    });
  }
  
  // Generate OAuth URL with state parameter for contextId
  const oauthUrl = `${loginUrl}/services/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=api%20refresh_token%20openid&` +
    `state=${encodeURIComponent(contextId)}`;
  
  console.log(`🔐 OAuth authorization URL generated for contextId: ${contextId}`);
  console.log(`   Redirecting to: ${loginUrl}/services/oauth2/authorize...`);
  
  res.redirect(oauthUrl);
});

// OAuth callback endpoint
router.get('/oauth/callback', (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  console.log('🔔 OAuth Callback Received:');
  console.log('   Code:', code);
  console.log('   State:', state);
  console.log('   Error:', error);
  
  if (error) {
    console.log('❌ OAuth Error:', error);
    return res.status(400).json({
      error: 'OAuth Error',
      description: error,
      message: 'Authorization was denied or failed'
    });
  }
  
  if (!code) {
    console.log('❌ No authorization code received');
    return res.status(400).json({
      error: 'Missing Code',
      message: 'No authorization code in callback'
    });
  }
  
  console.log('✅ Authorization Code received successfully!');
  
  // Exchange authorization code for access token
  const decodedCode = decodeURIComponent(code as string);
  exchangeCodeForToken(decodedCode, state as string)
    .then((tokenData: any) => {
      console.log('🎉 Token exchange successful!');
      console.log('   Access Token:', tokenData.access_token ? 'Received' : 'Missing');
      console.log('   Refresh Token:', tokenData.refresh_token ? 'Received' : 'Missing');
      console.log('   Token Type:', tokenData.token_type);
      console.log('   Expires In:', tokenData.expires_in, 'seconds');
      console.log('   Instance URL:', tokenData.instance_url || 'NOT PROVIDED - This is required!');

      // Store tokens in token manager
      const contextId = (state as string) || `oauth_${Date.now()}`;
      const sessionId = tokenManager.storeTokens(contextId, tokenData);
      console.log(`🔐 Tokens stored with sessionId: ${sessionId}, contextId: ${contextId}`);
      
      // Return success page
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>OAuth Success</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
    .info { text-align: left; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .next { color: #6c757d; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="success">🎉 OAuth Authorization Code Flow Complete!</div>
  <div class="info">
    <h3>✅ Session Created:</h3>
    <p><strong>Context ID:</strong> ${contextId}</p>
    <p><strong>Session ID:</strong> ${sessionId}</p>
    <p>${contextId === 'service_account' ? '<strong>Service account session stored!</strong> Form submissions will now work automatically.' : 'Session ready for use.'}</p>
  </div>
  <div class="next">
    ${contextId === 'service_account' ? 
      '<p>✅ Your broker can now authenticate automatically using this session.</p>' : 
      '<p>You can now use this session with your contextId.</p>'}
  </div>
</body>
</html>
      `);
    })
    .catch((error: any) => {
      console.error('❌ Token exchange failed:', error);
      res.status(500).send(`
        <h1>OAuth Error</h1>
        <p>Token exchange failed: ${error.message}</p>
        <p>Please check broker logs for details.</p>
      `);
    });
});

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string, state: string) {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const loginUrl = process.env.SALESFORCE_LOGIN_URL;
  const redirectUri = 'http://localhost:3001/oauth/callback';
  
  if (!clientId || !clientSecret || !loginUrl) {
    throw new Error('Missing Salesforce OAuth configuration');
  }
  
  const tokenUrl = `${loginUrl}/services/oauth2/token`;
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: code
  });
  
  console.log('🔄 Exchanging code for token...');
  console.log('   Token URL:', tokenUrl);
  console.log('   Client ID:', clientId.substring(0, 10) + '...' + clientId.substring(clientId.length - 5));
  console.log('   Code (first 20 chars):', code.substring(0, 20) + '...');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });
  
  const tokenData: any = await response.json();
  
  if (!response.ok) {
    console.error('❌ Token exchange failed:');
    console.error('   Status:', response.status);
    console.error('   Response:', tokenData);
    throw new Error(`Token exchange failed: ${tokenData.error || tokenData.error_description || 'Unknown error'}`);
  }
  
  return tokenData;
}

export default router;
