# Deployment Files for Render

This document explains the deployment files that have been created to help you host your backend on Render.com.

## 📁 Files Created

### 1. `BACKEND_HOSTING_GUIDE.md`
**Purpose:** Comprehensive step-by-step guide for hosting on Render
**Contents:**
- Detailed Render deployment instructions
- Prerequisites and environment variables
- Post-deployment configuration
- Troubleshooting guide
- Production checklist

### 2. `DEPLOYMENT_QUICK_START.md`
**Purpose:** Quick reference for fast deployment
**Contents:**
- Condensed 5-minute deployment guide
- Pre-deployment checklist
- Common commands
- Quick troubleshooting

### 3. `backend/render-start.sh`
**Purpose:** Startup script for Render.com
**Features:**
- Automatically runs database migrations
- Starts Gunicorn server with eventlet worker
- Handles errors gracefully
**Usage:** Set as Start Command in Render: `bash render-start.sh`

### 4. `backend/gunicorn.conf.py`
**Purpose:** Production server configuration file
**Usage:** Optional - can be used with: `gunicorn -c gunicorn.conf.py wsgi:app`
**Features:**
- Auto-detects optimal worker count
- Configures eventlet for Socket.IO
- Sets timeouts and logging

### 5. `backend/runtime.txt`
**Purpose:** Specifies Python version for Render
**Current:** Python 3.12.0
**Usage:** Render uses this to determine Python version

### 6. `backend/requirements.txt` (Updated)
**Added:** `gunicorn>=21.2.0` for production server

## 🚀 How to Use

### Deploy to Render:

1. **Follow the guide:** `BACKEND_HOSTING_GUIDE.md`
2. **Use render-start.sh:** Set as Start Command in Render
3. **Add environment variables:** See Prerequisites section
4. **Deploy:** Render auto-deploys on push to main branch

### The render-start.sh Script:

The startup script does the following:
1. Runs database migrations automatically (`flask db upgrade`)
2. Starts the Gunicorn production server
3. Uses eventlet worker for Socket.IO support
4. Handles errors gracefully

This means you don't need to manually run migrations - they happen automatically on every deployment!

## 📝 Environment Variables Needed

See `BACKEND_HOSTING_GUIDE.md` → Prerequisites section for the complete list.

**Key variables:**
- `DATABASE_URL` - PostgreSQL connection string (use Internal URL from Render)
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `FRONTEND_URL` - Your frontend domain
- `FILE_STORAGE` - Set to "S3" for production
- AWS S3 credentials (if using S3)
- Email configuration
- Google OAuth credentials
- OpenAI API key (if using AI features)

## ✅ Next Steps

1. **Read the guide:** `BACKEND_HOSTING_GUIDE.md`
2. **Follow the steps** for Render deployment
3. **Test your deployment**
4. **Update your frontend** to use the new API URL

## 🔍 File Locations

```
backend/
├── render-start.sh            # Render startup script (used as Start Command)
├── gunicorn.conf.py           # Gunicorn configuration (optional)
├── runtime.txt                # Python version
└── requirements.txt           # Updated with gunicorn

Root:
├── BACKEND_HOSTING_GUIDE.md   # Comprehensive Render guide
├── DEPLOYMENT_QUICK_START.md  # Quick reference
└── DEPLOYMENT_FILES_README.md # This file
```

## 💡 Tips

1. **Use render-start.sh** - It handles migrations automatically
2. **Check logs** - Always check logs when troubleshooting
3. **Update CORS** - Don't forget to add your production frontend URL
4. **Test locally first** - Make sure everything works before deploying
5. **Use Internal Database URL** - Faster and no network charges
6. **Upgrade to paid plan** - For production (always-on, better performance)

## 🎯 Render-Specific Features

- **Automatic Deployments:** Deploys on every push to main branch
- **Built-in PostgreSQL:** Easy database setup
- **Automatic SSL:** HTTPS enabled by default
- **Health Checks:** Automatic service monitoring
- **Shell Access:** Run commands via Render dashboard
- **Logs:** Real-time log viewing

Good luck with your deployment! 🚀
