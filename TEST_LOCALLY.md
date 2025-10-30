# Local Testing Guide

## Quick Start - Test the Fog City Website Locally

### Prerequisites Check
Make sure you have:
- Node.js (v18+ recommended)
- npm installed

### Step 1: Install Dependencies

**Terminal 1 - Broker:**
```bash
cd broker
npm install
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
```

### Step 2: Configure Environment Variables

**Broker** - Create `broker/.env` (if it doesn't exist):
```env
# Optional - Broker will work without Salesforce for basic testing
SALESFORCE_CLIENT_ID=your_client_id_here
SALESFORCE_CLIENT_SECRET=your_client_secret_here
SALESFORCE_USERNAME=your_username@example.com
SALESFORCE_SECURITY_TOKEN=your_security_token
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# Required
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend** - Create `frontend/.env.local`:
```env
REACT_APP_BROKER_API_URL=http://localhost:3001
```

### Step 3: Start the Servers

**Terminal 1 - Start Broker:**
```bash
cd broker
npm run dev
```

You should see:
```
✅ Salesforce connection initialized (or warning if not configured)
🚀 Broker server running on port 3001
📡 Frontend URL: http://localhost:3000
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm start
```

Browser should automatically open to `http://localhost:3000`

### Step 4: Test What Works Now

#### ✅ What You Can Test Immediately:

1. **Website Navigation**
   - Click through pages: Home → Inventory → Service → Fleet → About
   - Verify navigation works smoothly
   - Check professional styling is applied

2. **Session Management**
   - Open browser DevTools → Application → Local Storage
   - You should see session stored: `context_broker_session_id`
   - Page refresh should maintain session

3. **UI Agent System** (Observability)
   - Open DevTools → Console
   - You should see: "Agent UI Service initialized: ctx_..."
   - Check Network tab for POST requests to `/api/agent/ui/event`

4. **Agent Chat Interface**
   - Try typing in agent chat on any page
   - Messages will attempt to call broker API
   - Even without Salesforce, you'll see fallback responses

5. **Health Check**
   - Visit: `http://localhost:3001/api/health`
   - Should return: `{ "status": "ok", ... }`

#### ⚠️ What Requires Salesforce Setup:

1. **Real Agent Responses**
   - Currently returns fallback messages
   - Need Salesforce agent configured for real responses

2. **Form Submissions**
   - Forms require Salesforce `Form_Definition__c` records
   - Can test UI but submission will fail

### Step 5: Check Console for Errors

**Broker Terminal:**
- Should see session creation logs
- API request logs for each interaction

**Frontend Console (Browser DevTools):**
- Should see: "Agent UI Service initialized"
- Session creation messages
- No CORS errors

### Quick Test Checklist

- [ ] Broker starts without errors (check Terminal 1)
- [ ] Frontend starts and opens browser (Terminal 2)
- [ ] Website loads with professional styling
- [ ] Navigation works (Home, Inventory, Service, Fleet, About)
- [ ] Agent chat appears on all pages
- [ ] Can type in agent chat input
- [ ] Session ID in localStorage (DevTools → Application)
- [ ] No CORS errors in browser console
- [ ] UI Agent service initialized (check console)

### Troubleshooting

**Port Already in Use:**
```bash
# Check what's using port 3001
lsof -i :3001

# Or change port in broker/.env
PORT=3002
```

**Frontend Can't Reach Broker:**
- Check `REACT_APP_BROKER_API_URL` in `frontend/.env.local`
- Verify broker is running on correct port
- Check CORS settings in broker

**Module Not Found Errors:**
- Run `npm install` in both directories
- Delete `node_modules` and reinstall if needed

**TypeScript Errors:**
- Check that `tsconfig.json` exists in both directories
- Run `npm run build` in broker to compile TypeScript

### Next Steps After Testing

1. **Connect Real Salesforce Agents:**
   - Set up Salesforce Connected App
   - Configure agent endpoints in broker
   - Test real agent responses

2. **Add Form Definitions:**
   - Create `Form_Definition__c` records in Salesforce
   - Test dynamic form rendering
   - Test form submissions

3. **Deploy to Production:**
   - GitHub Pages for frontend
   - Heroku for broker

---

**Ready to test? Run these commands:**

```bash
# Terminal 1
cd broker && npm install && npm run dev

# Terminal 2 (new terminal)
cd frontend && npm install && npm start
```

Then visit: **http://localhost:3000**

