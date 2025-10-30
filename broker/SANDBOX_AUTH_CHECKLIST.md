# Full Copy Sandbox Authentication Checklist

Since you're using a **full copy sandbox** with `test.salesforce.com`, and seeing **no failed logins** in Salesforce, the issue is likely with the **External Client App / Connected App configuration**, not your credentials.

## Critical Connected App Settings

### 1. ✅ Verify "Require Secret for Username-Password Flows"
**This MUST be checked:**
- Setup → App Manager → Your External Client App → Edit
- Under "Enable OAuth" section
- ✅ **"Require Secret for Web Server Flow"** (for External Client Apps)
- OR ✅ **"Require Secret for Username-Password Flows"** (for legacy Connected Apps)
- **If this is NOT checked, username/password authentication will fail**

### 2. ✅ OAuth Policies - IP Restrictions
- Setup → App Manager → Your External Client App → Edit
- Under "OAuth Policies"
- **IP Relaxation**: Must be **"Relax IP restrictions"** OR your IP must be in the allowed list
- If "Enforce IP restrictions" is on and your IP isn't listed, auth will be blocked **before** reaching login

### 3. ✅ User Permissions
- Check that your user can access the Connected App
- Setup → App Manager → Your External Client App → **Manage Policies**
- **Permitted Users**: Should be "All users may self-authorize" OR your profile must be explicitly allowed

### 4. ✅ Connected App is Active
- Setup → App Manager → Your External Client App
- Status should be **"Active"**
- If it's "Inactive", authentication will fail

## Verify Your Configuration

### Step 1: Check Connected App Settings
1. Go to: Setup → App Manager → **Your External Client App** → **View** (or Edit)
2. Verify these settings:
   - ✅ OAuth is Enabled
   - ✅ "Require Secret for Web Server Flow" is CHECKED (critical!)
   - ✅ Your Consumer Key matches `SALESFORCE_CLIENT_ID` in `.env`
   - ✅ Your Consumer Secret matches `SALESFORCE_CLIENT_SECRET` in `.env`

### Step 2: Check OAuth Scopes
Your app should have these scopes:
- `api` (Manage user data via APIs)
- `refresh_token` (Perform requests on your behalf at any time)
- `openid` (Access unique user identifiers) - optional

### Step 3: Test with Salesforce Workbench (Alternative)
If the broker still fails, try authenticating via Salesforce Workbench to isolate the issue:
1. Go to: https://workbench.developerforce.com/
2. Environment: **Production** (for full copy sandbox, it's still "Production")
3. Server: **Custom** → `https://test.salesforce.com`
4. Use OAuth Consumer Key: Check this
5. Enter your Consumer Key and Secret
6. Try to login

If this works but the broker doesn't, it's a code/configuration issue. If this fails too, it's a Connected App issue.

## Full Copy Sandbox Specifics

- ✅ Login URL: `https://test.salesforce.com` (you have this correct)
- ✅ Username format: `user@domain.com.staging` (you have this correct)
- ⚠️ Full copy sandboxes still use `test.salesforce.com` for authentication
- ⚠️ The domain in your username should match your org's domain

## Most Likely Issue

Given that you see **no failed logins**, the request is probably being **rejected at the Connected App level** before reaching authentication:

1. **"Require Secret for Username-Password Flows" is not checked** ← **Most likely**
2. **IP Restrictions are blocking your IP** ← **Second most likely**
3. **User doesn't have permission to use the Connected App**
4. **Connected App is Inactive**

## Quick Fix

Try this in your External Client App settings:
1. Edit the External Client App
2. Enable OAuth section:
   - Make sure **"Require Secret for Web Server Flow"** is **CHECKED** ✅
3. OAuth Policies:
   - **IP Relaxation**: Set to **"Relax IP restrictions"** (for testing)
   - **Permitted Users**: Set to **"All users may self-authorize"**
4. **Save**

Then restart your broker.

