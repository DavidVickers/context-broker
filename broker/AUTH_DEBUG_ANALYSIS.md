# Authentication Failure Analysis

## Debug Output Analysis

From your debug output:
- ✅ Username: `david@customer_simulation25.org.staging` (correct format for staging org)
- ✅ Login URL: `https://test.salesforce.com` (correct for sandbox/staging)
- ✅ Client ID: Present and formatted correctly
- ✅ Client Secret: Present
- ⚠️ Password length: 13 characters (seems short - might indicate truncation or missing characters)
- ⚠️ Using security token: NO (Trusted IP Ranges)

## Most Likely Issue

**Your IP is probably NOT in Salesforce's Trusted IP Ranges**, even though you thought it was.

The error "authentication failure" with error code N/A typically means:
- Username/password combination is invalid
- **OR** IP is not trusted and security token is required

## Solution: Add Security Token

Since authentication failed without a security token, you need to add one:

### Steps:

1. **Get Security Token from Salesforce**:
   - Login to Salesforce org: `https://test.salesforce.com`
   - Setup → Search "Reset My Security Token"
   - Click "Reset My Security Token"
   - Check your email
   - Copy the token

2. **Add to `.env` file**:
   ```bash
   SALESFORCE_SECURITY_TOKEN=paste_your_token_here
   ```

3. **Restart broker**:
   ```bash
   npm run dev
   ```

## Verify IP is in Trusted IP Ranges

If you want to confirm whether your IP is trusted:

1. **In Salesforce**:
   - Setup → Security → Network Access → Trusted IP Ranges
   - Check if your current IP is listed
   - You can find your IP at: https://whatismyipaddress.com

2. **If not in list**:
   - You MUST use a security token for authentication
   - OR add your IP to Trusted IP Ranges (if you have permission)

## Other Potential Issues

### Username Format
Your username looks correct: `david@customer_simulation25.org.staging`

### Password Issues
- Make sure password doesn't have extra spaces
- Verify password is correct (you can test by logging into Salesforce web UI)
- If password contains special characters, make sure they're not being escaped incorrectly

### Org Type
- Staging orgs are sandboxes, so `test.salesforce.com` is correct
- The `.staging` in your username confirms this is a staging org

## Quick Test

Try logging into Salesforce via the web UI with the same credentials to verify they work:
- URL: `https://test.salesforce.com`
- Username: `david@customer_simulation25.org.staging`
- Password: (same as in .env)

If web login works but API doesn't, it's almost certainly a security token issue.

