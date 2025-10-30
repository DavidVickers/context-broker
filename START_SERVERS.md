# 🚀 Quick Start Guide - Start Both Servers

## The Issue
- **Frontend** must be running on port 3000
- **Broker** must be running on port 3001

## Quick Start Commands

### Terminal 1 - Start Broker:
```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER/broker"
npm run dev
```

Wait for: `🚀 Broker server running on port 3001`

### Terminal 2 - Start Frontend:
```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER/frontend"
npm start
```

Browser will automatically open to: **http://localhost:3000**

---

## URLs to Access

✅ **Main Website**: http://localhost:3000
✅ **Dev Event Monitor**: http://localhost:3001/dev-events.html
✅ **Broker Health**: http://localhost:3001/api/health

---

## Note About URLs

The React app runs on **http://localhost:3000** (not `/context-broker`)

The `/context-broker` path is only used when deployed to GitHub Pages. Locally, React dev server serves from root (`/`).

---

## Troubleshooting

**If port 3000 is in use:**
```bash
lsof -ti :3000 | xargs kill -9
```

**If port 3001 is in use:**
```bash
./kill-port-3001.sh
```

**If frontend won't start:**
- Check you're in the `frontend` directory
- Run `npm install` first
- Check for errors in terminal

**If broker won't start:**
- Check you're in the `broker` directory  
- Run `npm install` first
- Check for errors in terminal

---

## Both Running?

✅ Broker: http://localhost:3001/api/health (should return JSON)
✅ Frontend: http://localhost:3000 (should show Fog City website)

