# Quick Start: Deploy Your Backend to Render in 5 Minutes

This is a condensed guide. For detailed explanations, see [BACKEND_HOSTING_GUIDE.md](./BACKEND_HOSTING_GUIDE.md).

## 🚀 Render Deployment

### Step 1: Create Account & Database
1. Go to [render.com](https://render.com) → Sign up with GitHub
2. **"+ New"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `coursemate-db`
   - **Database:** `coursemate`
   - **Region:** Choose closest to you
   - **Plan:** Free (or Starter $7/month for production)
4. Copy the **Internal Database URL** from Connections tab

### Step 2: Create Web Service
1. **"+ New"** → **"Web Service"**
2. Connect GitHub repo → Select `coursemate-v1`
3. Configure:
   - **Name:** `coursemate-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `bash render-start.sh`
   - **Region:** Same as database

### Step 3: Add Environment Variables
Go to **Environment** section and add:
```bash
FLASK_ENV=production
DATABASE_URL=<Internal Database URL from Step 1>
PORT=10000
SECRET_KEY=<generate: python3 -c "import secrets; print(secrets.token_urlsafe(32))">
JWT_SECRET_KEY=<generate another one>
FRONTEND_URL=https://your-frontend-domain.com
FILE_STORAGE=S3
AWS_STORAGE_BUCKET_NAME=your-bucket-name
S3_KEY=your-aws-access-key-id
S3_SECRET=your-aws-secret-access-key
S3_REGION=us-east-1
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration
OPENAI_API_KEY=your-openai-key
REQUIRE_EMAIL_VERIFICATION=True
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Wait ~5 minutes for first deployment
3. Watch logs for any errors
4. Your backend will be live at: `https://coursemate-backend.onrender.com`

**Note:** The `render-start.sh` script automatically runs database migrations on startup.

### Step 5: Verify Deployment
```bash
# Health check
curl https://coursemate-backend.onrender.com/api/health

# Test root endpoint
curl https://coursemate-backend.onrender.com/
```

**Done!** Your backend is live! 🎉

---

## 📋 Pre-Deployment Checklist

- [ ] All environment variables set
- [ ] `gunicorn` added to `requirements.txt` ✅ (already done)
- [ ] `render-start.sh` exists ✅ (already done)
- [ ] Database migrations ready
- [ ] CORS updated with production frontend URL
- [ ] Google OAuth redirect URIs updated
- [ ] Frontend API URL updated
- [ ] Test health endpoint: `https://your-backend.onrender.com/api/health`

---

## 🔧 Common Commands

### Generate Secret Keys
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Test Your Deployment
```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Test login
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### View Logs
- **Render Dashboard:** Service → Logs tab

### Run Commands in Render Environment
1. Go to your service → **Shell** tab
2. Run commands like:
   ```bash
   flask db upgrade
   flask db current
   python -c "from app import db; print('OK')"
   ```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| 502/503 errors | Check logs, verify start command, ensure `gunicorn` in requirements.txt |
| Database connection fails | Verify `DATABASE_URL` uses Internal URL, check database is running |
| CORS errors | Update CORS origins in `backend/app/__init__.py` |
| Socket.IO not working | Verify `--worker-class eventlet` in render-start.sh |
| Slow responses | Free tier spins down after 15 min (upgrade to paid for always-on) |
| Environment variables not loading | Redeploy after adding variables, check variable names |

---

## 📚 Next Steps

1. ✅ Deploy backend (you're here!)
2. Deploy frontend (Vercel/Netlify)
3. Update frontend API URL
4. Test end-to-end
5. Set up monitoring (Sentry)
6. Configure custom domain (optional)
7. Upgrade to paid plan for production (recommended)

For detailed explanations, see [BACKEND_HOSTING_GUIDE.md](./BACKEND_HOSTING_GUIDE.md)
