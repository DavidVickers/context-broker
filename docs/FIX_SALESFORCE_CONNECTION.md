# Fix: Salesforce Connection Error

## Problem

Error: `Salesforce query Form_Definition__c failed`  
Cause: `No service account session available`

## Solution: Complete OAuth Authorization Flow

The broker needs a service account session to query Salesforce. You only need to do this once - the refresh token will be stored and reused.

### Step 1: Open OAuth Authorization URL

Visit this URL in your browser:

```
http://localhost:3001/oauth/authorize?contextId=service_account
```

### Step 2: Login to Salesforce

You'll be redirected to Salesforce login page:
1. Enter your Salesforce username/password
2. Click **Allow** to authorize the broker
3. You'll be redirected back to the broker

### Step 3: Verify Session Created

The broker will:
- Exchange the authorization code for access and refresh tokens
- Store the refresh token in `broker/data/oauth-sessions.json`
- Use this token for all future Salesforce queries

### Step 4: Test Connection

Try loading a form again - it should now work!

```bash
curl http://localhost:3001/api/forms/test-form
```

---

## Why This Happens

The broker uses OAuth 2.0 Authorization Code Flow for security:
- **One-time setup**: Complete OAuth flow once with `contextId=service_account`
- **Persistent session**: Refresh token is stored and reused automatically
- **Auto-refresh**: Tokens are automatically refreshed before expiry

---

## Troubleshooting

### Still getting errors?

1. **Check broker logs**: Look for detailed error messages
2. **Verify .env file**: Ensure `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` are set
3. **Check Connected App**: Ensure callback URL matches: `http://localhost:3001/oauth/callback`
4. **Check OAuth session file**: `broker/data/oauth-sessions.json` should have a session after OAuth completes

### OAuth Redirect Error?

If the callback fails:
1. Verify Connected App callback URL: `http://localhost:3001/oauth/callback`
2. Ensure broker is running on port 3001
3. Check browser console for redirect errors

---

## Quick Fix Command

If you just need to re-authenticate:

```bash
# 1. Open browser to OAuth URL
open "http://localhost:3001/oauth/authorize?contextId=service_account"

# 2. Complete OAuth flow in browser

# 3. Test connection
curl http://localhost:3001/api/health
```

