# How to Check Broker Terminal Logs

## Quick Answer

**The broker logs appear in the terminal where you started the broker server.**

## Finding Your Broker Terminal

### 1. Look for the Terminal Window
- **macOS**: Check your terminal app windows/tabs
- Look for a terminal showing:
  ```
  🚀 Broker server running on port 3001
  📡 Frontend URL: http://localhost:3000
  🌍 Environment: development
  ```

### 2. Check Process Output
The broker is running with `nodemon`. The logs appear in real-time in the terminal where you ran:
```bash
cd broker
npm run dev
```

## What Logs to Look For

### SSE Connection Logs (Real-time Streaming)
```
📡 Dev client connected to event stream
📡 Setting up EventStore subscription for SSE client
➕ Adding subscriber, total subscribers: 1
✅ EventStore subscription active, X existing events in store
👥 Active subscribers: 1
```

### Event Reception Logs
```
📨 UI Event received: state.snapshot from ctx_...
✅ Event stored successfully in EventStore
🔔 Notifying 1 subscribers of event: state.snapshot
📢 Calling subscriber 1/1
📤 Sending event to SSE client: state.snapshot (evt_...)
✅ Subscriber 1 notified successfully
```

### Problem Indicators
If you see:
```
⚠️ No subscribers to notify! Event will be stored but not streamed.
```
This means events are being stored but the SSE connection isn't subscribed.

## If You Can't Find the Terminal

### Option 1: Restart the Broker (New Terminal)
```bash
cd "/Users/david.vickers/Coding/CONTEXT BROKER/broker"
npm run dev
```

This will start a new broker process and show logs in your current terminal.

### Option 2: Kill and Restart
```bash
# Find the broker process
lsof -ti:3001

# Kill it (if needed)
kill -9 $(lsof -ti:3001)

# Start fresh
cd "/Users/david.vickers/Coding/CONTEXT BROKER/broker"
npm run dev
```

### Option 3: Check All Node Processes
```bash
ps aux | grep node | grep broker
```

## Viewing Logs in Real-Time

Once you find the terminal:

1. **Navigate your website** - Events should appear immediately
2. **Watch for these patterns**:
   - `📨 UI Event received` = Event arrived at broker
   - `🔔 Notifying X subscribers` = Event being sent to SSE clients
   - `📤 Sending event to SSE client` = Event being streamed
   - `⚠️ No subscribers` = SSE connection issue

## Common Issues

### "No subscribers to notify"
- **Cause**: SSE connection not established or subscription failed
- **Fix**: Check if dev-events.html shows "Connected (Live)" status
- **Verify**: Look for `📡 Dev client connected to event stream` in logs

### Events stored but not streaming
- **Check**: Subscriber count with `👥 Active subscribers: X`
- **If 0**: SSE subscription isn't working
- **If 1+**: Subscription exists but events might not be reaching client

## Tips

- Keep the broker terminal visible while testing
- Scroll up to see connection establishment logs
- Look for error messages (❌ or ⚠️)
- Check timestamps to see if events are recent




