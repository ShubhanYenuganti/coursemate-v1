# WebSocket Connection Debugging Guide

## Current Status
WebSocket connections are still failing even after:
- ✅ Single worker configuration
- ✅ Eventlet async mode
- ✅ CORS configuration
- ✅ Environment variables set

## Latest Changes Made

### 1. Force Polling Only (Temporary)
Changed `SocketContext.tsx` to use **polling only** (no WebSocket upgrade):
- This tests if the issue is WebSocket-specific
- Polling is more reliable on Render's free tier
- If polling works, the issue is Render's WebSocket support

### 2. Enhanced Socket.IO Configuration
- Set CORS to `*` (all origins) for debugging
- Added explicit transport configuration
- Enhanced logging

### 3. Added Test Endpoint
Added `/api/socketio-test` endpoint to verify Socket.IO is accessible.

## Testing Steps

### Step 1: Deploy and Test Polling
1. **Deploy the changes:**
   ```bash
   git add backend/app/__init__.py app/context/SocketContext.tsx backend/app/routes/health.py
   git commit -m "Debug: Force polling mode for Socket.IO connection"
   git push
   ```

2. **Wait for Render to redeploy** (2-5 minutes)

3. **Test in browser:**
   - Open browser console
   - Look for: `[SocketContext] Socket connected: <id>`
   - Check Network tab → Filter by "polling" or "socket.io"

### Step 2: Test Socket.IO Endpoint
Test if Socket.IO endpoint is accessible:

```bash
curl https://coursemate-backend.onrender.com/api/socketio-test
```

Should return:
```json
{
  "status": "ok",
  "socketio_available": true,
  "message": "Socket.IO endpoint is accessible..."
}
```

### Step 3: Check Render Logs
1. Go to Render dashboard → Backend service → Logs
2. Look for:
   - `✅ Socket.IO initialized with CORS: * (all origins)`
   - `✅ Socket.IO async_mode: eventlet`
   - Any Socket.IO connection attempts
   - Any errors

### Step 4: Test Polling Connection Directly
Open browser console and run:

```javascript
// Test if polling endpoint is accessible
fetch('https://coursemate-backend.onrender.com/socket.io/?EIO=4&transport=polling', {
  method: 'GET',
  headers: {
    'Origin': window.location.origin
  }
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

Expected: Should return Socket.IO handshake data (numbers and text).

## If Polling Works

If polling connects successfully:
- ✅ Socket.IO is working
- ❌ WebSocket upgrade is failing
- **Solution:** Keep using polling, or investigate Render's WebSocket support

## If Polling Also Fails

If polling also fails, check:

### 1. Render Service Status
- Is the service "Live"?
- Are there any errors in logs?
- Is the service paused?

### 2. Network/Firewall Issues
- Try from different network
- Check if corporate firewall blocks Socket.IO
- Test from mobile hotspot

### 3. CORS Issues
Check browser console for CORS errors:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

### 4. Authentication Issues
- Is user logged in?
- Is JWT token valid?
- Check if `user.id` exists

### 5. Environment Variables
Verify `.env.local` has:
```bash
NEXT_PUBLIC_BACKEND_URL=https://coursemate-backend.onrender.com
```

And restart frontend after changes.

## Render Free Tier Limitations

**Important:** Render's free tier has known limitations:
- Services spin down after 15 minutes
- First request takes ~30 seconds
- WebSocket support may be limited
- Consider upgrading to paid tier

## Alternative Solutions

### Option 1: Use Polling Permanently
If polling works, you can keep it:
- Less efficient than WebSocket
- But more reliable on Render free tier
- Works for most use cases

### Option 2: Upgrade Render Plan
Paid plans have better WebSocket support:
- No spin-down
- Better connection handling
- More reliable

### Option 3: Use Different Hosting
Consider alternatives:
- **Railway** - Better WebSocket support
- **Fly.io** - Good for WebSockets
- **Heroku** - Reliable but more expensive

### Option 4: Separate Socket.IO Service
Run Socket.IO on a separate service:
- Use Redis adapter for multi-worker support
- Deploy Socket.IO separately
- More complex but more scalable

## Debugging Commands

### Check Socket.IO Client Version
```javascript
// In browser console
import('socket.io-client').then(m => console.log('Socket.IO version:', m.io.version))
```

### Test Connection Manually
```javascript
// In browser console
const io = require('socket.io-client');
const socket = io('https://coursemate-backend.onrender.com', {
  transports: ['polling']
});
socket.on('connect', () => console.log('Connected!', socket.id));
socket.on('connect_error', (e) => console.error('Error:', e));
```

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by "socket.io" or "polling"
3. Look for:
   - Connection attempts
   - Response codes (200 = good, 4xx/5xx = error)
   - Response data

## Expected Console Output (Success)

```
[SocketContext] User is authenticated (<user-id>), creating socket to https://coursemate-backend.onrender.com...
[SocketContext] Event: connect [<socket-id>]
[SocketContext] Socket connected: <socket-id>
```

## Expected Console Output (Failure)

```
[SocketContext] User is authenticated (<user-id>), creating socket to https://coursemate-backend.onrender.com...
[SocketContext] Socket connection error: Error: ...
[SocketContext] Error details: { message: "...", ... }
```

## Next Steps

1. **Deploy and test with polling only**
2. **Check Render logs for errors**
3. **Test Socket.IO test endpoint**
4. **Report back with:**
   - Does polling work?
   - What errors appear in console?
   - What appears in Render logs?
   - What appears in Network tab?

This will help identify the exact issue.

