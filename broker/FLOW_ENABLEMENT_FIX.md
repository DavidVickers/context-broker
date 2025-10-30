# Fix: Flow Enablement Settings for Username-Password Authentication

## Current Settings (from your screenshot)

### ✅ Good Settings:
- **Require secret for Web Server Flow**: ✅ CHECKED (Required!)
- **Require secret for Refresh Token Flow**: ✅ CHECKED (Good!)
- **Enable Client Credentials Flow**: ✅ CHECKED

### ❌ Potential Issue:
- **Enable Authorization Code and Credentials Flow**: ❌ UNCHECKED

## The Problem

For username/password authentication using `jsforce`, you typically need:
- **Web Server Flow** enabled (which allows Username-Password OAuth flow)
- OR **Enable Authorization Code and Credentials Flow** enabled

The "Username-Password OAuth Flow" is part of the OAuth 2.0 specification that allows client applications to authenticate using username and password directly (without browser redirects).

## Solution Options

### Option 1: Enable Authorization Code and Credentials Flow (Recommended)

1. **Check the box**: ✅ **"Enable Authorization Code and Credentials Flow"**
2. **Save** the External Client App
3. **Wait 1-2 minutes** for changes to propagate
4. **Restart your broker**

This flow typically includes support for username/password authentication.

### Option 2: Try Enabling Web Server Flow Explicitly (If Available)

Some orgs have a separate "Enable Username-Password Flow" or "Enable Web Server Flow" option. If you see this, enable it.

### Option 3: Use Client Credentials Flow (Server-to-Server)

Since "Enable Client Credentials Flow" is checked, you could use this for server-to-server auth, but it won't work for user context operations.

**However**, since we need user context (to access Form_Definition__c records as a specific user), we need username/password flow.

## What to Do

1. **In your External Client App settings**:
   - ✅ Check **"Enable Authorization Code and Credentials Flow"**
   - ✅ Keep **"Require secret for Web Server Flow"** checked
   - ✅ Save

2. **Wait 1-2 minutes** for Salesforce to propagate the changes

3. **Restart your broker**:
   ```bash
   npm run dev
   ```

4. You should see: `✅ Successfully authenticated with Salesforce`

## Why This Should Work

The "Authorization Code and Credentials Flow" typically includes:
- Authorization Code Flow (browser redirect)
- Resource Owner Password Credentials Grant (username/password) ← **This is what we need!**

Once enabled, the username/password authentication should work with `jsforce`.

## Verification

After enabling and restarting, check:
- ✅ No more `invalid_grant` error
- ✅ You see "Successfully authenticated with Salesforce"
- ✅ Instance URL and User ID are displayed

