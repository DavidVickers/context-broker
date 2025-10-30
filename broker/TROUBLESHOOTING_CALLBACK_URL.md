# Troubleshooting: "Salesforce cannot reach http://localhost:3001/oauth/callback"

## This is Normal and Expected! ✅

Salesforce will show a warning that it cannot verify your localhost callback URL. **This is completely normal** for local development and **will not prevent** your broker from connecting to Salesforce.

## Why This Happens

- Salesforce tries to verify callback URLs by making a request to them
- `http://localhost:3001` is only accessible from your local machine
- Salesforce's servers cannot reach your localhost, so verification fails
- **This is expected behavior** and does not affect our authentication method

## What to Do

### Option 1: Ignore the Warning (Recommended for Local Development)
1. When you see the warning, click **"Continue"** or **"Save"** anyway
2. The app will still be created successfully
3. Your username/password authentication flow will work fine

### Option 2: Use a Simpler URL (Alternative)
If Salesforce won't let you proceed, try using:
- `http://localhost` (without the port number)
- Some orgs accept this as a valid callback URL for local development

### Option 3: Use a Public URL (For Testing)
If you need to test the full OAuth redirect flow (not just username/password):
- Use a public URL like `https://ngrok.io` to tunnel your local server
- Or deploy to Heroku and use your production URL

## Why It Doesn't Matter for Our Use Case

The Context Broker uses **username/password authentication** (not OAuth redirect flow):
- The callback URL is **only needed** for OAuth redirect flows where users authenticate via browser
- Our broker authenticates directly using `jsforce` with username/password + security token
- The callback URL is **not used** in this authentication method

## Verification

Even if Salesforce shows the warning, you can verify your setup works by:

1. **Test the connection**:
   ```bash
   cd broker
   npm run dev
   ```
   
2. **Look for successful authentication**:
   ```
   ✅ Successfully authenticated with Salesforce
   📋 Instance URL: https://your-instance.salesforce.com
   👤 User ID: 005...
   ```

3. **Check health endpoint**:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should show: `"salesforce": "connected"`

## When You Need a Valid Callback URL

You would only need a working callback URL if:
- You're implementing OAuth redirect flow (users click "Login with Salesforce")
- You're using a user-initiated authentication flow (not service account)
- You're building a web app that redirects users for authentication

Since we're using username/password for service account authentication, **the callback URL warning can be safely ignored**.

## For Production

When deploying to production (e.g., Heroku):
- Use your actual domain: `https://your-app.herokuapp.com/oauth/callback`
- Salesforce will be able to verify this URL
- But again, this is only needed for OAuth redirect flows

## Summary

✅ **You can safely ignore the "cannot reach" warning**
✅ **Your broker will connect successfully**
✅ **The callback URL is not used for username/password authentication**
✅ **This is normal behavior for localhost development**

