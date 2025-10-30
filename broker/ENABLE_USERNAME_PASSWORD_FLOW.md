# Enable Username-Password OAuth Flow in Salesforce

## 🎯 FOUND THE ISSUE!

Your Salesforce org has **Username-Password OAuth Flow disabled** at the org level. This is why you're getting `invalid_grant: authentication failure` and seeing no login attempts in Login History.

**Login History shows**: "Username-Password Flow Disabled"

## Where to Enable It

### Option 1: OAuth and OpenID Connect Settings (Most Common)

1. **Setup → Quick Find** → Search: `OAuth and OpenID Connect Settings`
2. Click **Edit** (or "OAuth and OpenID Connect Settings" if it's a link)
3. Look for a checkbox that says:
   - ✅ **"Allow OAuth Username-Password Flows"**
   - OR **"Enable Username-Password OAuth Flow"**
   - OR **"Enable OAuth Username-Password Authentication"**
4. **Check the box**
5. **Save**

### Option 2: Session Settings

1. **Setup → Security → Session Settings**
2. Look for **OAuth** section
3. Find **"Allow OAuth Username-Password Flows"**
4. **Enable** it
5. **Save**

### Option 3: Security Settings

1. **Setup → Security → Network Access** (or related security settings)
2. Look for OAuth-related settings
3. Enable Username-Password flow

### Option 4: If Setting Not Found

Some orgs have this permanently disabled for security policy. In that case:
- Contact your Salesforce Administrator
- OR use an alternative flow (see below)

## After Enabling

1. **Wait 1-2 minutes** for changes to propagate
2. **Test again**: `./test-oauth.sh`
3. Should get access token instead of `invalid_grant`

## Alternative: Use More Secure Flow

If you can't enable Username-Password flow, or want a more secure approach:

### Use JWT Bearer Flow
- Requires certificate/key pair
- More secure (no password transmission)
- See `JWT_BEARER_FLOW.md` for implementation

### Use Authorization Code Flow with Refresh Token
- One-time browser authorization
- Store refresh token
- Use refresh token for subsequent authentications
- See `AUTHORIZATION_CODE_FLOW.md` for implementation

