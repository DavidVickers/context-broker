# 🚀 Quick Local Testing Guide

## Start Testing Now

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Start Broker:**
```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER/broker"
npm run dev
```

Wait for: `🚀 Broker server running on port 3001`

**Terminal 2 - Start Frontend:**
```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER/frontend"
npm start
```

Browser will automatically open to `http://localhost:3000`

### Option 2: Use the Script

```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER"
./START_TESTING.sh
```

## What to Test

### ✅ Visual Tests
1. **Homepage**
   - Professional styling (dark header, clean layout)
   - Navigation bar works
   - Feature cards display properly
   - No emoji icons (using text labels instead)

2. **Navigation**
   - Click: Home → Inventory → Service → Fleet → About
   - All pages load smoothly
   - Agent sidebar appears on each page

3. **Inventory Page**
   - Vehicle cards display
   - Filters section looks clean
   - Agent chat on right side

### ✅ Functional Tests
1. **Session Management**
   - Open DevTools → Application → Local Storage
   - Should see: `context_broker_session_id` and `context_broker_form_id`
   - Refresh page - session should persist

2. **Agent Chat**
   - Type a message in any agent chat
   - Click "Send"
   - Should see message appear (even if agent response is fallback)

3. **Console Check**
   - Open DevTools → Console
   - Should see: "Agent UI Service initialized: ctx_..."
   - No red errors (yellow warnings OK)

### ✅ Network Tests
1. **Health Check**
   - Visit: http://localhost:3001/api/health
   - Should return JSON with status: "ok"

2. **API Calls**
   - Open DevTools → Network tab
   - Interact with site
   - Should see POST requests to `/api/agent/ui/event`
   - Should see POST requests to `/api/sessions`
   - Should see POST requests to `/api/forms/.../agent/query`

## Expected Results

### ✅ Works Without Salesforce:
- Website loads and displays
- Navigation works
- Session creation
- UI Agent observability
- Agent chat UI (will show fallback responses)

### ⚠️ Requires Salesforce:
- Real agent responses (currently fallback messages)
- Form submissions
- Dynamic form rendering from Salesforce

## Quick Troubleshooting

**Broker won't start:**
- Check port 3001 is free: `lsof -i :3001`
- Check broker/.env exists (created automatically)

**Frontend won't start:**
- Check port 3000 is free
- Check frontend/.env.local exists (with `REACT_APP_BROKER_API_URL=http://localhost:3001`)

**CORS errors:**
- Verify `FRONTEND_URL=http://localhost:3000` in broker/.env
- Restart broker after changing .env

**Cannot connect to broker:**
- Verify broker is running (check Terminal 1)
- Check http://localhost:3001/api/health works
- Verify `REACT_APP_BROKER_API_URL` in frontend/.env.local

## What You Should See

### Browser (localhost:3000)
- Professional dark navigation bar
- Clean, modern layout
- Agent chat sidebars on each page
- Smooth navigation between pages

### Broker Terminal
- Session creation logs
- API request logs
- Route matching logs

### Browser Console
- "Agent UI Service initialized"
- Session creation messages
- Event publishing logs
- No red errors

## Next Steps After Testing

1. ✅ **Visual confirmation** - Site looks professional
2. ✅ **Navigation works** - All pages accessible
3. ✅ **Session management** - Context IDs being created
4. ⏭️ **Connect Salesforce** - For real agent responses
5. ⏭️ **Add form definitions** - For dynamic forms

---

**Ready? Run these commands:**

```bash
# Terminal 1
cd "/Users/david.vickers/Coding/CONTEXT BROKER/broker" && npm run dev

# Terminal 2  
cd "/Users/david.vickers/Coding/CONTEXT BROKER/frontend" && npm start
```

Then visit: **http://localhost:3000** 🌐

