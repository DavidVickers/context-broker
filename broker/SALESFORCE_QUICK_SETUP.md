# Quick Setup: Salesforce Connection

## 🚀 Fast Track Setup (5 minutes)

### 1. Get Security Token
- Salesforce Setup → Search "Reset My Security Token" → Click → Check Email

### 2. Create External Client App
- Setup → App Manager → **New External Client App**
- Name: `Context Broker API`
- Distribution State: `Local`
- Enable OAuth ✅
- Callback URL: `http://localhost:3001/oauth/callback`
- Scopes: 
  - `Access unique user identifiers (OpenId)`
  - `Manage user data via APIs (api)`
  - `Perform requests on your behalf at any time (refresh_token, offline_access)`
- Require Secret for Web Server Flow ✅
- Require Secret for Refresh Token Flow ✅
- OAuth Policies: `All users may self-authorize` + `Relax IP restrictions` (for dev)
- Save → Manage Consumer Details → Copy **Consumer Key** & **Consumer Secret**

**Note**: If you see "New Connected App" instead of "External Client App", use that option - your org may still use the legacy interface.

### 3. Create `.env` file in `broker/` directory:
```bash
SALESFORCE_CLIENT_ID=<paste_consumer_key>
SALESFORCE_CLIENT_SECRET=<paste_consumer_secret>
SALESFORCE_USERNAME=your_username@example.com
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=<paste_security_token>
SALESFORCE_LOGIN_URL=https://test.salesforce.com  # or https://login.salesforce.com
PORT=3001
NODE_ENV=development
```

### 4. Test Connection
```bash
cd broker
npm run dev
```

Look for: `✅ Successfully authenticated with Salesforce`

Or test with:
```bash
curl http://localhost:3001/api/health
```

**For detailed instructions**, see `SALESFORCE_SETUP.md`

