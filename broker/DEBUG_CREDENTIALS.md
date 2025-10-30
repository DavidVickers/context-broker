# Debug: invalid_grant with Direct curl Test

Since **both jsforce AND curl fail** with `invalid_grant`, this confirms:
- ✅ It's NOT a jsforce configuration issue
- ❌ It IS a Connected App configuration OR credential issue

## What to Check Now

### 1. Verify Consumer Key/Secret Match EXACTLY

The Consumer Key and Secret in your `.env` must match **EXACTLY** what's in Salesforce:

1. **In Salesforce**:
   - Setup → App Manager → Your External Client App
   - Click **"Manage Consumer Details"**
   - Copy the **Consumer Key** (full value, no spaces)
   - Click **"Click to reveal"** for **Consumer Secret**
   - Copy the full secret (no spaces, no truncation)

2. **In your `.env` file**:
   - `SALESFORCE_CLIENT_ID=` should match Consumer Key **exactly**
   - `SALESFORCE_CLIENT_SECRET=` should match Consumer Secret **exactly**
   - **NO extra spaces before/after the values**
   - **NO quotes around values** (unless your shell requires them)

### 2. Test with Just Password (No Security Token)

Try temporarily removing the security token to see if that's the issue:

1. In `.env`, set: `SALESFORCE_SECURITY_TOKEN=`
2. Run: `./test-oauth.sh`
3. See if it works (if your IP is in Trusted IP Ranges)

### 3. Verify Username Format

Your username: `david@customer_simulation25.org.staging`

Make sure:
- No extra spaces
- The `.staging` suffix is correct for your org
- You can log into Salesforce web UI with this exact username

### 4. Verify Password

Test if your password works in Salesforce web UI:
1. Go to: `https://test.salesforce.com`
2. Username: `david@customer_simulation25.org.staging`
3. Password: `your_password` (without security token)
4. If this works, the password is correct

### 5. Get Fresh Security Token

Try resetting your security token:
1. Setup → Reset My Security Token
2. Check email
3. Copy fresh token
4. Update `.env` with new token

### 6. Double-Check Connected App Settings

Even though you've enabled everything, double-check these are **saved**:

1. External Client App → Edit
2. **Flow Enablement**:
   - ✅ Enable Authorization Code and Credentials Flow
   - ✅ Require user credentials in the POST body
3. **Security**:
   - ✅ Require secret for Web Server Flow
4. **Status**: Must be **"Active"**
5. **Click "Save"** (even if you think it's saved)

### 7. Check OAuth Scopes

Verify your Connected App has these scopes:
- `api` (Manage user data via APIs)
- `refresh_token` (Perform requests on your behalf at any time)
- `openid` (optional)

### 8. Check for IP Restrictions

Even with "Relax IP restrictions", verify:
1. External Client App → Edit → OAuth Policies
2. **IP Relaxation**: Should be "Relax IP restrictions"
3. If there's an IP whitelist, make sure your IP is listed OR restriction is relaxed

## Most Likely Issues

1. **Consumer Key/Secret mismatch** (most common)
   - Values in `.env` don't exactly match Connected App
   - Extra spaces or truncated values

2. **Security token incorrect**
   - Token expired or wrong
   - Password + token concatenation issue

3. **Connected App settings not saved/propagated**
   - Settings look correct but not actually applied
   - Need to save again and wait longer

4. **Username format**
   - Wrong username or domain suffix

## Quick Test Commands

### Test with masked credentials:
```bash
cd broker
echo "Consumer Key: ${SALESFORCE_CLIENT_ID:0:10}...${SALESFORCE_CLIENT_ID: -5}"
echo "Username: $SALESFORCE_USERNAME"
echo "Password length: ${#SALESFORCE_PASSWORD} chars"
echo "Token length: ${#SALESFORCE_SECURITY_TOKEN} chars"
```

This will help verify the `.env` values are being read correctly.

