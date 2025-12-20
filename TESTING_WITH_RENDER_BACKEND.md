# Testing Local Frontend with Render Backend

This guide shows you how to connect your local frontend to your deployed Render backend.

## Step 1: Get Your Render Backend URL

1. Go to your Render dashboard
2. Click on your `coursemate-backend` web service
3. Copy the URL (e.g., `https://coursemate-backend.onrender.com`)

## Step 2: Create Environment Variables File

Create a `.env.local` file in the **root** of your project (same level as `package.json`):

```bash
# Render Backend URL (for Next.js rewrites and server-side)
BACKEND_URL=https://coursemate-backend.onrender.com

# Public variables (accessible in browser - REQUIRED for client-side code)
NEXT_PUBLIC_BACKEND_URL=https://coursemate-backend.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://coursemate-backend.onrender.com
NEXT_PUBLIC_API_URL=https://coursemate-backend.onrender.com
```

**Important:** 
- `NEXT_PUBLIC_*` variables are required for client-side code (like conversationService and Socket.IO)
- Replace `https://coursemate-backend.onrender.com` with your actual Render backend URL
- Make sure to use `https://` (not `http://`) for Render

**Important Notes:**
- Replace `https://coursemate-backend.onrender.com` with your actual Render backend URL
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose these variables to the browser
- `.env.local` is gitignored, so it won't be committed

## Step 3: Verify CORS Configuration

Make sure your Render backend allows requests from `http://localhost:3000` (or whatever port your frontend runs on).

The backend should already be configured to allow localhost, but verify in `backend/app/__init__.py` that your local frontend URL is in the CORS origins list.

## Step 4: Restart Your Frontend

After creating/updating `.env.local`:

```bash
# Stop your current frontend server (Ctrl+C)
# Then restart it
npm run dev
# or
pnpm dev
```

**Important:** Next.js only reads environment variables at startup, so you must restart after changing `.env.local`.

## Step 5: Test the Connection

### Test 1: Health Check
Open your browser console and run:
```javascript
fetch('https://coursemate-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should return: `{"status": "healthy"}` or similar

### Test 2: Root Endpoint
Visit in browser: `https://coursemate-backend.onrender.com/`

Should show: `Flask backend is working!`

### Test 3: Frontend Login
1. Start your local frontend: `npm run dev` or `pnpm dev`
2. Try to log in or register
3. Check browser console for any CORS errors
4. Check Network tab to see if requests are going to Render backend

## Troubleshooting

### CORS Errors

**Error:** `Access to fetch at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:**
1. Check that `http://localhost:3000` (or your frontend port) is in the CORS origins in `backend/app/__init__.py`
2. Update the backend and redeploy
3. Make sure `FRONTEND_URL` in Render is set to `http://localhost:3000` (or your port)

### Environment Variables Not Working

**Symptoms:** Frontend still uses localhost backend

**Solution:**
1. Make sure `.env.local` is in the project root (not in a subdirectory)
2. Restart your Next.js dev server completely
3. Check that variable names match exactly (case-sensitive)
4. For Next.js, use `NEXT_PUBLIC_` prefix for browser-accessible variables

### Socket.IO Connection Issues

**Error:** WebSocket connection fails or `wss://` connection error

**Solution:**
1. Make sure `NEXT_PUBLIC_BACKEND_URL` is set in `.env.local` (required for client-side)
2. The URL should use `https://` (Render uses HTTPS)
3. Socket.IO will automatically use `wss://` for secure WebSocket connections
4. Restart frontend after adding the variable
5. Check browser console for connection errors
6. Verify the backend is running and accessible

### HTTP 500 Errors

**Error:** `HTTP 500: Internal Server Error` when calling API endpoints

**Solution:**
1. **Check Render logs:**
   - Go to your Render web service dashboard
   - Click **"Logs"** tab
   - Look for error messages and stack traces
   - The logs will show the actual error causing the 500

2. **Common causes:**
   - Database connection issues (check DATABASE_URL)
   - Missing environment variables
   - Database schema issues (run migrations)
   - Import errors or missing dependencies

3. **Test the endpoint directly:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-backend.onrender.com/api/conversations/COURSE_ID/conversations
   ```

4. **Check authentication:**
   - Make sure you're logged in
   - Verify the JWT token is valid
   - Check token expiration

### Backend Not Responding

**Symptoms:** Requests timeout or return 502/503

**Solution:**
1. Check Render dashboard - is the service "Live"?
2. Check Render logs for errors
3. Free tier services spin down after 15 min - first request may take 30 seconds
4. Test backend directly: `curl https://your-backend.onrender.com/api/health`

## Quick Test Checklist

- [ ] `.env.local` file created with Render backend URL
- [ ] Frontend restarted after adding environment variables
- [ ] Backend is "Live" in Render dashboard
- [ ] Health check endpoint works: `https://your-backend.onrender.com/api/health`
- [ ] CORS allows `http://localhost:3000` (or your port)
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows requests going to Render backend (not localhost)

## Example .env.local File

```bash
# Render Backend Configuration
BACKEND_URL=https://coursemate-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://coursemate-backend.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://coursemate-backend.onrender.com
NEXT_PUBLIC_API_URL=https://coursemate-backend.onrender.com

# Optional: Keep local backend for fallback
# BACKEND_URL=http://localhost:5173
```

## Switching Between Local and Render Backend

To switch back to local backend, just change the URLs in `.env.local`:

```bash
# For local backend
BACKEND_URL=http://localhost:5173
NEXT_PUBLIC_BACKEND_URL=http://localhost:5173
NEXT_PUBLIC_API_BASE_URL=http://localhost:5173
NEXT_PUBLIC_API_URL=http://localhost:5173
```

Remember to restart your frontend after changing!

