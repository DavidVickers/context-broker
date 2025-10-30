# Debugging OAUTH_APPROVAL_ERROR_GENERIC

## The Error
```
We can't authorize you because of an OAuth error. For more information, contact your Salesforce administrator.

OAUTH_APPROVAL_ERROR_GENERIC : An unexpected error has occured during authentication. Please try again.
```

## Common Causes & Fixes

### 1. Connected App Not Active
**Check**: Is your Connected App active?
- Setup → Apps → App Manager
- Find "Context_Broker_API" 
- Status should be "Active" (not "Inactive")

### 2. Missing OAuth Scopes
**Check**: Are OAuth scopes properly configured?
- Edit your Connected App
- OAuth Settings → Selected OAuth Scopes
- Must have at least:
  - ✅ "Access unique user identifiers (OpenId)"
  - ✅ "Manage user data via APIs (api)"

### 3. Incorrect Redirect URI
**Check**: Does the redirect URI match exactly?
- Connected App: `http://localhost:3001/oauth/callback`
- Test script: `http://localhost:3001/oauth/callback`
- Must match exactly (no trailing slash, correct case)

### 4. OAuth Policies Blocking
**Check**: Are OAuth policies too restrictive?
- Edit Connected App → Manage → OAuth Policies
- **Permitted Users**: Try "All users may self-authorize"
- **IP Relaxation**: "Relax IP restrictions"

### 5. User Profile Permissions
**Check**: Does your user have OAuth permissions?
- Setup → Users → Your User → Profile
- Look for "OAuth" or "Connected App" permissions
- May need "API Enabled" permission

### 6. Connected App Configuration Issues
**Check**: Is the Connected App properly configured?
- Consumer Key/Secret are correct
- OAuth settings are saved
- No typos in configuration

## Quick Fixes to Try

### Fix 1: Simplify OAuth Scopes
Try with minimal scopes first:
- Only select: "Access unique user identifiers (OpenId)"
- Remove other scopes temporarily
- Test again

### Fix 2: Check User Profile
- Setup → Users → Your User
- Profile → System Permissions
- Ensure "API Enabled" is checked

### Fix 3: Try Different User
- Create a new user with System Administrator profile
- Test with that user instead

### Fix 4: Check Connected App Status
- Ensure Connected App is "Active"
- If inactive, activate it
- Wait 2-3 minutes for changes to propagate

## Debug Steps

### Step 1: Verify Connected App
```bash
# Check if we can get basic info about the app
curl -s "https://test.salesforce.com/services/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/oauth/callback&scope=openid"
```

### Step 2: Check OAuth URL Format
The URL should look exactly like:
```
https://test.salesforce.com/services/oauth2/authorize?response_type=code&client_id=3MVG9...&redirect_uri=http://localhost:3001/oauth/callback&scope=openid&state=abc123&nonce=def456
```

### Step 3: Test with Minimal Configuration
Try the simplest possible OAuth request:
- Only `response_type=code`
- Only `client_id`
- Only `redirect_uri`
- No scope, state, or nonce

## Next Steps

1. **Check Connected App is Active**
2. **Verify OAuth scopes are selected**
3. **Ensure redirect URI matches exactly**
4. **Try with minimal scopes first**
5. **Check user profile permissions**

Let me know what you find in your Connected App configuration!
