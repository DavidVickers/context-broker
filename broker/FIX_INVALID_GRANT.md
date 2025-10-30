# Fix: "invalid_grant: authentication failure" Error

## Error Details

- **Error Name**: `invalid_grant`
- **Error Message**: `authentication failure`
- **Location**: OAuth2 token request (`jsforce/lib/oauth2.js`)

## What This Means

The `invalid_grant` error means the **OAuth grant** (your username/password combination) is being rejected. This happens **before** Salesforce even checks login history, which is why you see no failed logins.

## Most Common Causes

### 1. ⚠️ **CRITICAL: "Require Secret for Web Server Flow" Not Checked**

This is the **#1 most common issue**. The Connected App must allow username/password flow:

1. **Setup → App Manager → Your External Client App → Edit**
2. Under **"Enable OAuth"** section
3. ✅ **"Require Secret for Web Server Flow"** MUST be **CHECKED**
4. If unchecked, username/password authentication will always fail with `invalid_grant`

### 2. Incorrect Password + Security Token Combination

The password sent to Salesforce should be: `your_password` + `security_token` (concatenated, no space)

Verify:
- Password length is correct (should be password_length + token_length)
- No extra spaces in password or token
- Token was copied correctly (no leading/trailing spaces)

### 3. Username Format Issue

For staging orgs, username should be:
- `username@domain.com.staging`
- The `.staging` suffix is critical

### 4. Consumer Key/Secret Mismatch

- Verify `SALESFORCE_CLIENT_ID` exactly matches your External Client App's Consumer Key
- Verify `SALESFORCE_CLIENT_SECRET` exactly matches (sometimes there's confusion between Consumer Key and Secret)

### 5. Connected App Not Active

- Check that your External Client App status is **"Active"**
- If "Inactive", it won't accept OAuth requests

## Step-by-Step Fix

### Step 1: Verify Connected App Settings

1. Go to: **Setup → App Manager → Your External Client App → Edit**
2. Check these settings:
   - ✅ **Enable OAuth** is checked
   - ✅ **"Require Secret for Web Server Flow"** is **CHECKED** ← **CRITICAL**
   - ✅ **"Require Secret for Refresh Token Flow"** is checked
   - Status shows **"Active"**

### Step 2: Verify OAuth Policies

1. Still in the External Client App edit page
2. Scroll to **"OAuth Policies"** section
3. Verify:
   - **IP Relaxation**: `Relax IP restrictions` (for testing)
   - **Permitted Users**: `All users may self-authorize`
   - **Refresh Token Policy**: `Refresh token is valid until revoked`

### Step 3: Re-check Your .env File

Make sure all values are correct:
```bash
SALESFORCE_CLIENT_ID=3MVG9Nwk_W...exact_match_from_app
SALESFORCE_CLIENT_SECRET=4A996...exact_match_from_app  
SALESFORCE_USERNAME=david@customer_simulation25.org.staging
SALESFORCE_PASSWORD=your_password_no_spaces
SALESFORCE_SECURITY_TOKEN=your_token_no_spaces
SALESFORCE_LOGIN_URL=https://test.salesforce.com
```

### Step 4: Test Credentials Manually

Try logging into Salesforce web UI with the exact same credentials:
1. Go to: `https://test.salesforce.com`
2. Username: `david@customer_simulation25.org.staging`
3. Password: `your_password` (without security token for web login)
4. If this works, the issue is likely the Connected App configuration

## Alternative: Try Without Security Token (If IP is Trusted)

If your IP is in Trusted IP Ranges:
1. Set in `.env`: `SALESFORCE_SECURITY_TOKEN=` (empty)
2. Restart broker
3. This uses just password without token

## After Fixing

1. **Save the Connected App** changes
2. **Wait 1-2 minutes** for changes to propagate
3. **Restart your broker**: `npm run dev`
4. You should see: `✅ Successfully authenticated with Salesforce`

## If Still Failing

1. **Double-check Consumer Key/Secret**:
   - Go to External Client App → Manage Consumer Details
   - Copy Consumer Key and Consumer Secret again
   - Make sure there are no extra spaces when pasting into `.env`

2. **Try generating new security token**:
   - Setup → Reset My Security Token
   - Get new token from email
   - Update `.env` with new token

3. **Verify org type**:
   - Full copy sandbox uses `test.salesforce.com` ✅ (you have this correct)
   - Username should have `.staging` suffix ✅ (you have this)

## Most Likely Solution

**99% of the time**: Check **"Require Secret for Web Server Flow"** is CHECKED in your External Client App settings. This is the #1 cause of `invalid_grant` errors.

