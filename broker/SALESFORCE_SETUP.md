# Salesforce Connection Setup Guide

This guide will help you connect the broker to your Salesforce org (sandbox or production).

## Step 1: Security Token (Optional if using Trusted IP Ranges)

**If your IP is in Salesforce's Trusted IP Ranges**, you don't need a security token. Skip to Step 2.

**If your IP is NOT in Trusted IP Ranges**, get your security token:

1. **Login to Salesforce** (Production or Sandbox)
2. Go to **Setup** (gear icon → Setup)
3. Search for **"Reset My Security Token"** in Quick Find
4. Click **"Reset My Security Token"**
5. Check your email for the security token
6. **Copy the token** (it's a long alphanumeric string like `ABC123xyz789...`)

**About Trusted IP Ranges**:
- Setup → Security → Network Access → Trusted IP Ranges
- If your IP is listed here, you can authenticate without a security token
- This is common for corporate networks or VPNs

**Important Notes**: 
- Security token is appended to your password for authentication (only if not using Trusted IP Ranges)
- If you change your password, you'll get a new token automatically
- For sandbox orgs, you may need to enable "My Domain" first

## Step 2: Create an External Client App

Salesforce now uses **External Client Apps** (the next generation of Connected Apps) for OAuth integration.

**Note**: If you don't see "New External Client App" in your org, look for "New Connected App" - your org may still use the legacy interface. The process is similar but field names may vary slightly.

1. **In Salesforce Setup**, navigate to **App Manager**:
   - Setup → **App Manager** → **New External Client App**
   - (If "New External Client App" is not available, use **"New Connected App"**)

2. **Basic Information Section**:
   - **External Client App Name** (or **Connected App Name** in legacy): `Context Broker API`
   - **API Name**: `Context_Broker_API` (auto-generated based on the name)
   - **Contact Email**: Your email address
   - **Description** (optional): `API connection for Context Broker service`
   - **Distribution State**: Select **"Local"** (for use within your organization)

3. **Enable OAuth Section**:
   - ✅ **Enable OAuth** (or **Enable OAuth Settings** in legacy): Check this box
   - **Callback URL**: `http://localhost:3001/oauth/callback`
     - (For production/Heroku: `https://your-app.herokuapp.com/oauth/callback`)
   - **⚠️ Expected Warning**: Salesforce will show "Cannot reach this URL" - this is **normal and OK** for localhost
     - Salesforce cannot verify localhost URLs, but it won't affect our username/password authentication flow
     - For local development, you can ignore this warning or use `http://localhost` as a workaround
     - Click **"Continue"** or **"Save"** anyway - the callback URL is only needed for OAuth redirect flows, not username/password flows
   - **Selected OAuth Scopes** - Add these scopes (move from Available to Selected):
     - ✅ **Access unique user identifiers (OpenId)** (in External Client Apps)
     - ✅ **Manage user data via APIs (api)** - Full access via API
       - (In legacy Connected Apps, this may be listed as **"Full access (api)"**)
     - ✅ **Perform requests on your behalf at any time (refresh_token, offline_access)**
   - ✅ **Require Secret for Web Server Flow** (or **Require Secret for Username-Password Flows** in legacy): Check this
   - ✅ **Require Secret for Refresh Token Flow**: Check this

4. **OAuth Policies** (scroll down or in separate section):
   - **Permitted Users**: Select **"All users may self-authorize"** (for development)
   - **IP Relaxation**: Select **"Relax IP restrictions"** (for development)
   - **Refresh Token Policy**: Select **"Refresh token is valid until revoked"**

5. **Click "Save"** (may take a few moments to process)

6. **Get Consumer Key and Secret**:
   - After saving, you'll be redirected to the app detail page
   - Click **"Manage Consumer Details"** button (or **"View Consumer Details"**)
   - Click **"Click to reveal"** for Consumer Secret
   - **Copy both values immediately** (you'll need these for `.env`):
     - **Consumer Key** (this is your `SALESFORCE_CLIENT_ID`)
     - **Consumer Secret** (this is your `SALESFORCE_CLIENT_SECRET`)
   
   **⚠️ Important**: 
   - Copy the Consumer Secret **immediately** - you can only view it once!
   - If you get a timeout error when accessing credentials, see `TROUBLESHOOTING_CLIENT_CREDENTIALS.md`
   - Common fixes: Clear browser cache, try different browser, or regenerate by recreating the app

**⚠️ Important Notes**:
- **Security**: For production environments, restrict IP addresses and limit permitted users
- **Consumer Secret**: Copy this immediately - you can only view it once! If you lose it, you'll need to regenerate it
- **Legacy vs New**: Both "External Client App" and "Connected App" work the same way for this integration

## Step 3: Configure Environment Variables

1. **Navigate to broker directory**:
   ```bash
   cd broker
   ```

2. **Create `.env` file**:
   ```bash
   # If .env.example exists:
   cp .env.example .env
   
   # Or create manually:
   touch .env
   ```

3. **Edit `.env` file** and add your Salesforce credentials:
   ```bash
   # Salesforce OAuth Configuration
   SALESFORCE_CLIENT_ID=3MVG9...your_consumer_key_here
   SALESFORCE_CLIENT_SECRET=ABC123...your_consumer_secret_here
   SALESFORCE_USERNAME=your_username@example.com.sandbox  # Include .sandbox for sandbox
   SALESFORCE_PASSWORD=your_password
   
   # Security Token (OPTIONAL - only needed if IP is NOT in Trusted IP Ranges)
   # Leave empty if your IP is in Trusted IP Ranges:
   SALESFORCE_SECURITY_TOKEN=
   # Or add token if IP is not trusted:
   # SALESFORCE_SECURITY_TOKEN=ABC123xyz789...your_security_token
   
   # For Sandbox:
   SALESFORCE_LOGIN_URL=https://test.salesforce.com
   
   # For Production:
   # SALESFORCE_LOGIN_URL=https://login.salesforce.com
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

**Important Notes**:
- **Password**: Just your Salesforce password (no spaces)
- **Security Token**: 
  - **Optional** if your IP is in Salesforce's Trusted IP Ranges
  - **Required** if your IP is NOT in Trusted IP Ranges
  - Leave empty (`SALESFORCE_SECURITY_TOKEN=`) if using Trusted IP Ranges
  - If not using Trusted IP Ranges, append token to password automatically
- **Username**: For sandbox orgs, include the full username (e.g., `user@example.com.sandbox`)
- **Never commit `.env`** to git (it should be in `.gitignore`)

## Step 4: Test the Connection

1. **Start the broker** (if not already running):
   ```bash
   cd broker
   npm run dev
   ```

2. **Watch the console output**:
   You should see:
   ```
   ✅ Successfully authenticated with Salesforce
   📋 Instance URL: https://your-instance.salesforce.com
   👤 User ID: 005...
   🚀 Broker running on http://localhost:3001
   ```

   **If you see errors**:
   - `⚠️ Salesforce credentials not configured` → Check your `.env` file exists and has all values
   - `❌ Salesforce authentication failed` → See Troubleshooting section below

3. **Test the health endpoint**:
   ```bash
   curl http://localhost:3001/api/health
   ```

   **Expected Response**:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "services": {
       "broker": "operational",
       "salesforce": "connected"
     },
     "version": "1.0.0"
   }
   ```

4. **Test querying a form** (if you've created a Form_Definition__c record):
   ```bash
   curl http://localhost:3001/api/forms/test-drive-form
   ```

   **Expected Response** (if form exists):
   ```json
   {
     "formId": "test-drive-form",
     "name": "Test Drive Form",
     "fields": [...],
     "mappings": {...},
     "agentConfig": {...}
   }
   ```

   **Expected Response** (if form doesn't exist):
   ```json
   {
     "error": "Form not found"
   }
   ```

## Step 5: Create Form Definition Objects (Required)

Before forms can work, you need to create the Custom Objects in Salesforce:

### Option A: Deploy via Salesforce CLI (Recommended)

1. **Authenticate**:
   ```bash
   cd salesforce
   sfdx auth:web:login -a myorg
   ```

2. **Deploy Custom Objects**:
   ```bash
   sfdx project deploy start
   ```

### Option B: Manual Setup in Salesforce UI

1. **Create Form_Definition__c Custom Object**:
   - Setup → Object Manager → Create → Custom Object
   - Label: `Form Definition`
   - Plural Label: `Form Definitions`
   - ✅ Allow Reports
   - ✅ Allow Activities
   - Save

2. **Add Fields to Form_Definition__c**:
   - **Form_Id__c** (Text, 255, Unique, Required)
   - **Fields_JSON__c** (Long Text Area, 131072)
   - **Mapping_Rules__c** (Long Text Area, 131072)
   - **Active__c** (Checkbox, Default: True)

3. **Create Form_Submission__c Custom Object**:
   - Setup → Object Manager → Create → Custom Object
   - Label: `Form Submission`
   - Plural Label: `Form Submissions`
   - Save

4. **Add Fields to Form_Submission__c**:
   - **Form_Id__c** (Text, 255)
   - **Context_ID__c** (Text, 255)
   - **Session_ID__c** (Text, 255)
   - **Submission_Data__c** (Long Text Area, 131072)
   - **Submitted_At__c** (Date/Time)

## ⚠️ CRITICAL: Username-Password Flow Must Be Enabled

**Before configuring authentication**, your Salesforce org must have Username-Password OAuth Flow enabled at the org level:

1. **Setup → Quick Find** → Search: `OAuth and OpenID Connect Settings`
2. Click **Edit**
3. Look for: ✅ **"Allow OAuth Username-Password Flows"**
4. **Check it** and **Save**

**If this setting is disabled**, you'll get `invalid_grant: authentication failure` and no login attempts will appear in Login History.

**Alternative**: Use the more secure Authorization Code Flow (see below).

## Troubleshooting

### "Invalid username, password, security token" error
- Double-check your password (no extra spaces)
- Verify security token is correct (reset if needed)
- Password + Security Token = full password (concatenated, no space)

### "Invalid client_id" error
- Verify Consumer Key is correct (copy from External Client App / Connected App)
- Check External Client App / Connected App is active
- Ensure OAuth is enabled on the app
- Verify you're using the correct Consumer Key (not the Consumer Secret)

### "IP restriction" error
- In External Client App / Connected App settings, check **"Relax IP restrictions"** for development
- Or add your IP address to the IP restrictions list
- Under OAuth Policies → IP Relaxation, select "Relax IP restrictions"

### Sandbox vs Production
- **Production**: Use `https://login.salesforce.com`
- **Sandbox**: Use `https://test.salesforce.com`
- Make sure you're using the correct login URL for your org type

## Deleting an External Client App

If you need to delete an External Client App / Connected App:

1. **Setup → App Manager**
2. Find the app → Click dropdown (▼) → **View**
3. Click **Delete** → Confirm

**Common Issues**:
- **Can't delete**: App may be set as default for a profile. Change default app in Profiles/Permission Sets first.
- **Permission error**: Need "Manage Connected Apps" permission (System Admin typically has this).

**Alternative**: Instead of deleting, you can **deactivate** by editing the app and unchecking "Enable OAuth".

For detailed steps, see `DELETE_APP.md`.

## Next Steps

Once connected:
1. Create a test form definition in Salesforce
2. Test form loading: `GET http://localhost:3001/api/forms/{formId}`
3. Test form submission with contextId

