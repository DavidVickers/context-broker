# Fix: "Salesforce credentials not configured"

## Problem

The broker shows:
```
⚠️  Salesforce credentials not configured - continuing without Salesforce
```

This means one or more required environment variables are missing or empty.

## Required Variables

All four of these must be set in `broker/.env`:

1. ✅ `SALESFORCE_CLIENT_ID` - Your Consumer Key from External Client App
2. ✅ `SALESFORCE_CLIENT_SECRET` - Your Consumer Secret from External Client App  
3. ✅ `SALESFORCE_USERNAME` - Your Salesforce username
4. ❌ `SALESFORCE_SECURITY_TOKEN` - **This is missing!**

## Quick Fix

### 1. Get Your Security Token

1. Login to Salesforce (Setup)
2. Search for **"Reset My Security Token"**
3. Click **"Reset My Security Token"**
4. Check your email for the security token
5. Copy it (long alphanumeric string)

### 2. Add to `.env` File

Edit `broker/.env` and make sure you have:

```bash
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_USERNAME=your_username@example.com.sandbox
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=ABC123xyz789...paste_security_token_here
SALESFORCE_LOGIN_URL=https://test.salesforce.com
```

**Important**: Make sure `SALESFORCE_SECURITY_TOKEN` is on its own line and has no extra spaces.

### 3. Restart the Broker

After saving `.env`:

```bash
cd broker
npm run dev
```

## Verify All Variables Are Set

Run this to check:
```bash
cd broker
node -e "require('dotenv').config(); console.log('CLIENT_ID:', process.env.SALESFORCE_CLIENT_ID ? 'SET' : 'NOT SET'); console.log('CLIENT_SECRET:', process.env.SALESFORCE_CLIENT_SECRET ? 'SET' : 'NOT SET'); console.log('USERNAME:', process.env.SALESFORCE_USERNAME ? 'SET' : 'NOT SET'); console.log('SECURITY_TOKEN:', process.env.SALESFORCE_SECURITY_TOKEN ? 'SET' : 'NOT SET');"
```

All four should show **"SET"**.

## Common Issues

### Empty Values
- Make sure values don't have extra spaces
- No quotes around values
- No trailing/leading whitespace

### Wrong Format
- Username should include `.sandbox` if it's a sandbox org
- Security token should be just the token (not password+token)
- Login URL should match your org type (test.salesforce.com for sandbox)

### File Not Loading
- Make sure `.env` is in the `broker/` directory (same level as `package.json`)
- Restart the broker after changing `.env`
- Check for typos in variable names (all uppercase, underscores)

