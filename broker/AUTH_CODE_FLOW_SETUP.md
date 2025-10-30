# Authorization Code Flow Setup Guide

## Prerequisites

Before running the test, ensure your Salesforce Connected App is configured for Authorization Code Flow:

### 1. Enable Authorization Code Flow in Connected App

1. **Setup → Apps → App Manager**
2. Find your "Context_Broker_API" app → Click dropdown → **Edit**
3. Go to **OAuth Settings**
4. Check: ✅ **"Enable Authorization Code and Credentials Flow"**
5. **Callback URL**: `http://localhost:3001/oauth/callback`
6. **OAuth Scopes** (select these):
   - ✅ **Access unique user identifiers (OpenId)**
   - ✅ **Manage user data via APIs (api)**
   - ✅ **Perform requests on your behalf at any time (refresh_token, offline_access)**
7. **Save**

### 2. Verify OAuth Policies

1. **Setup → Apps → App Manager**
2. Find your app → Click dropdown → **Manage**
3. Go to **OAuth Policies**
4. **Permitted Users**: "Admin approved users are pre-authorized" OR "All users may self-authorize"
5. **IP Relaxation**: "Relax IP restrictions" (for localhost testing)
6. **Save**

## Running the Test

```bash
cd broker
./test-auth-code-flow.sh
```

## What the Test Does

1. **Generates Authorization URL** with proper OAuth parameters
2. **Opens browser** for you to authorize (manual step)
3. **Exchanges code for token** automatically
4. **Tests API access** with the token
5. **Verifies refresh token** is received

## Expected Flow

```
1. Script generates: https://test.salesforce.com/services/oauth2/authorize?...
2. You click the URL → Salesforce login page
3. You log in → Salesforce redirects to: http://localhost:3001/oauth/callback?code=...
4. You copy the code → Script exchanges it for access_token
5. Script tests API call → SUCCESS!
```

## Troubleshooting

### "Invalid redirect_uri" error
- Ensure callback URL in Connected App exactly matches: `http://localhost:3001/oauth/callback`
- No trailing slash, exact case

### "Invalid client" error
- Check Client ID is correct
- Verify Connected App is active

### "Invalid scope" error
- Ensure OAuth scopes are selected in Connected App
- Check scope names match exactly

### "Access denied" error
- Check OAuth Policies allow your user
- Verify "Authorization Code and Credentials Flow" is enabled

## Success Indicators

✅ **Authorization URL generated**  
✅ **Browser opens to Salesforce login**  
✅ **Login successful**  
✅ **Redirect with code parameter**  
✅ **Token exchange successful**  
✅ **API call with token works**  
✅ **Refresh token received**  

If all steps succeed, Authorization Code Flow is working and ready for implementation!
