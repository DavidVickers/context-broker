# Service Account Authentication for Form Submissions

## ✅ Fixed!

The broker now **automatically authenticates using Connected App credentials** for form submissions. User OAuth sessions are optional.

## How It Works

### Priority Order:

1. **User OAuth Session** (if `contextId` provided)
   - Used when form is submitted with a user session
   - Allows user-specific data/context

2. **Service Account Connection** (automatic fallback)
   - Uses `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` from `.env`
   - Authenticates with `SALESFORCE_USERNAME` and `SALESFORCE_PASSWORD`
   - **Always available** for anonymous form submissions

3. **Auto-initialization**
   - If connection doesn't exist, broker initializes it on-demand
   - No manual OAuth flow needed

## Required Environment Variables

```bash
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_USERNAME=your_service_account@example.com
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_token  # Optional if using Trusted IP Ranges
SALESFORCE_LOGIN_URL=https://login.salesforce.com  # or https://test.salesforce.com
```

## What Changed

**Before:**
- Form submissions required user OAuth sessions
- Failed if no `contextId` with active session
- Required manual OAuth flow

**After:**
- Form submissions work with spot with Connected App credentials
- Falls back to service account automatically
- User OAuth sessions are optional (for enhanced features)
- No manual steps needed

## Testing

```bash
# Test form submission without OAuth session
curl -X POST "http://localhost:3001/api/forms/test-drive-form/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234"
    }
  }'
```

Should work **without** providing `contextId`!

## Benefits

✅ **Anonymous submissions work** - no user login required
✅ **Always authenticated** - service account handles all form submissions
✅ **Scalable** - single service account for all form submissions
✅ **Secure** - credentials stored in `.env`, never exposed

