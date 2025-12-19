# Backend Hosting Guide - Render Deployment

This guide provides detailed step-by-step instructions for hosting your Flask backend on Render.com.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Render Deployment Steps](#render-deployment-steps)
3. [Post-Deployment Configuration](#post-deployment-configuration)
4. [Troubleshooting](#troubleshooting)
5. [Production Checklist](#production-checklist)

---

## Prerequisites

Before deploying, ensure you have:

1. **Git repository** with your code pushed to GitHub/GitLab/Bitbucket
2. **Render account** (sign up at [render.com](https://render.com))
3. **Environment variables** ready (see list below)
4. **Domain name** (optional, but recommended for production)

### Required Environment Variables

**Important:** Always use the exact variable names shown below. These match what your code expects in `backend/app/config.py`. If your local `.env` file uses different names, update it to match these names.

Your backend needs these environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=30

# Flask
FLASK_ENV=production
FLASK_APP=wsgi.py
FLASK_RUN_PORT=5000

# File Storage (S3 recommended for production)
# Note: The code uses S3_KEY and S3_SECRET (not AWS_ACCESS_KEY_ID)
FILE_STORAGE=S3
AWS_STORAGE_BUCKET_NAME=your-bucket-name
S3_KEY=your-aws-access-key-id
S3_SECRET=your-aws-secret-access-key
S3_REGION=us-east-1

# Email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration

# Frontend
FRONTEND_URL=https://your-frontend-domain.com

# OpenAI (if using AI features)
OPENAI_API_KEY=your-openai-key

# Security
REQUIRE_EMAIL_VERIFICATION=True
```

---

## Render Deployment Steps

### Why Render?

- **Free tier available** (with limitations)
- **Easy Git-based deployments** - automatic deployments on push
- **Built-in PostgreSQL** - easy database setup
- **Automatic SSL certificates** - HTTPS enabled by default
- **Simple interface** - user-friendly dashboard

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

**Explanation:** Signing up with GitHub makes it easier to connect your repository later and enables automatic deployments.

### Step 2: Create PostgreSQL Database

1. In Render dashboard, click **"+ New"** → **"PostgreSQL"**
2. Fill in the database configuration:
   - **Name:** `coursemate-db` (or your preferred name)
   - **Database:** `coursemate` (or your preferred database name)
   - **User:** `coursemate_user` (or your preferred username)
   - **Region:** Choose the region closest to you or your users
   - **PostgreSQL Version:** 14 or higher (15 recommended)
   - **Plan:** 
     - **Free** - For testing/development (90 days, then $7/month)
     - **Starter** - $7/month (recommended for production)
     - **Standard** - $20/month (for higher traffic)
3. Click **"Create Database"**
4. Wait for provisioning (~2 minutes)
5. Once created, go to the database dashboard
6. Click on **"Connections"** tab
7. Copy the **"Internal Database URL"** (for use within Render)
8. Also note the **"External Database URL"** (for use outside Render or local development)

**Explanation:** 
- Render provides both internal and external database URLs
- Use the **Internal Database URL** when connecting from your Render web service (faster, no network charges)
- Use the **External Database URL** for local development or external tools
- The internal URL format: `postgresql://user:password@hostname:5432/database`
- Keep this URL secure - it contains your database credentials

### Step 3: Create Web Service

1. In Render dashboard, click **"+ New"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if not already connected
   - Authorize Render to access your repositories
   - Select your repository (`coursemate-v1`)
3. Configure the service:
   - **Name:** `coursemate-backend` (or your preferred name)
   - **Environment:** `Python 3`
   - **Region:** Same region as your database (for better performance)
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `bash render-start.sh`

**Explanation:**
- **Root Directory:** Tells Render where your Python code is located (the `backend` folder)
- **Build Command:** Installs all Python dependencies from `requirements.txt`
- **Start Command:** Uses the `render-start.sh` script which:
  - Automatically runs database migrations
  - Starts the Gunicorn production server
  - Handles errors gracefully

**Alternative Start Command** (if you prefer to run migrations manually):
```bash
gunicorn --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 120 --worker-class eventlet wsgi:app
```

### Step 4: Add Environment Variables

**Important:** Use the exact variable names shown below. These match what your code expects in `backend/app/config.py`. If your local `.env` file uses different names (like `AWS_ACCESS_KEY_ID` instead of `S3_KEY`), use the names from this guide in Render.

1. In your web service configuration, scroll down to **"Environment Variables"** section
2. Click **"Add Environment Variable"** for each variable
3. Add all required variables (see Prerequisites section above)
4. For `DATABASE_URL`, use the **Internal Database URL** from Step 2
5. Set `PORT` to `10000` (Render's default, or use `$PORT` - Render sets this automatically)

**Key Variables to Set:**
```bash
FLASK_ENV=production
DATABASE_URL=<Internal Database URL from Step 2>
PORT=10000
SECRET_KEY=<generate secure key>
JWT_SECRET_KEY=<generate secure key>
FRONTEND_URL=https://your-frontend-domain.com
```

**⚠️ Important about FRONTEND_URL:**
- **You can use any value** - The code now dynamically uses `FRONTEND_URL` for:
  - OAuth redirects (fixed in `backend/app/routes/oauth.py`)
  - Email verification links (already using `FRONTEND_URL`)
  - CORS origins (now dynamically includes `FRONTEND_URL`)
- If your frontend isn't deployed yet, you can use:
  - `http://localhost:3001` (for local testing)
  - `https://placeholder.com` (temporary placeholder)
  - Your actual frontend URL once deployed (e.g., `https://your-app.vercel.app`)
- **The code will automatically work with whatever value you set** - no hardcoded localhost issues!

**Generate Secret Keys:**
```bash
# Run this locally to generate secure keys
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Run this command twice to generate two different keys for `SECRET_KEY` and `JWT_SECRET_KEY`.

**Important Notes:**
- Never commit these values to Git
- Use different keys for development and production
- Keep your keys secure - if compromised, regenerate them immediately

### Step 5: Configure Auto-Deploy

1. In the web service configuration, find **"Auto-Deploy"** section
2. Enable **"Auto-Deploy"** (should be enabled by default)
   - This deploys automatically on every push to your main branch
3. Scroll to **"Health Check Path"** (in Advanced settings)
4. Set **"Health Check Path"** to `/api/health`
   - This allows Render to monitor your service health

**Explanation:**
- Auto-deploy means you don't need to manually trigger deployments
- Every push to your main branch triggers a new deployment
- Health checks help Render detect if your service is running correctly
- If health checks fail, Render will attempt to restart your service

### Step 6: Deploy

1. Review all your settings
2. Click **"Create Web Service"** at the bottom
3. Render will start building and deploying:
   - **Build phase:** Installs dependencies (2-5 minutes)
   - **Deploy phase:** Starts your application (1-2 minutes)
4. Watch the **"Logs"** tab for real-time build and deployment progress
5. Once deployed successfully, you'll see:
   - **Status:** Live
   - **URL:** `https://coursemate-backend.onrender.com` (or your custom name)

**Explanation:**
- First deployment takes longer (5-10 minutes) as Render sets up everything
- Subsequent deployments are faster (2-5 minutes)
- Watch the logs to catch any errors early
- The URL format is: `https://<service-name>.onrender.com`

### Step 7: Enable pgvector Extension (Required)

**Important:** Your application uses the `vector` type for AI embeddings, which requires the `pgvector` extension. The startup script tries to enable it automatically, but if it fails, you need to enable it manually.

**Option A: Automatic (via startup script)**
The `render-start.sh` script automatically tries to enable pgvector before running migrations. Check the logs to see if it succeeded.

**Option B: Manual (if automatic fails)**
1. Go to your web service dashboard
2. Click **"Shell"** tab
3. Run:
   ```bash
   python3 -c "
   from app import create_app
   from app.extensions import db
   from sqlalchemy import text
   app = create_app()
   with app.app_context():
       db.session.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
       db.session.commit()
       print('pgvector extension enabled')
   "
   ```

**Option C: Direct SQL via Render PostgreSQL Dashboard (RECOMMENDED)**
1. Go to your **PostgreSQL database** dashboard in Render (not the web service)
2. Click on your database service
3. Go to **"Info"** tab
4. Find **"Internal Database URL"** or **"External Connection"**
5. **Option 1 - Using Render's built-in connection:**
   - Click **"Connect"** button
   - If available, use the **"psql"** option
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
6. **Option 2 - Using external connection:**
   - Copy the **External Connection** string
   - Connect using `psql` from your local machine:
     ```bash
     psql "postgresql://user:password@host:port/database"
     ```
   - Then run: `CREATE EXTENSION IF NOT EXISTS vector;`
7. **Option 3 - Using Render Shell with direct psql:**
   - Go to your **PostgreSQL database** dashboard
   - Click **"Shell"** tab (if available)
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

**Verify it's enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Important Notes:**
- Render PostgreSQL **does support pgvector**, but you may need to enable it manually
- The database user might not have superuser privileges to create extensions via Python
- Enabling via direct SQL connection usually works better
- Once enabled, the extension persists and you won't need to enable it again

### Step 8: Verify Database Migrations

The `render-start.sh` script automatically runs migrations, but you can verify:

**Option A: Check Logs**
1. Go to your web service dashboard
2. Click **"Logs"** tab
3. Look for messages like:
   ```
   Running database migrations...
   INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
   INFO  [alembic.runtime.migration] Will assume transactional DDL.
   INFO  [alembic.runtime.migration] Running upgrade -> <revision>, <message>
   ```

**Option B: Use Render Shell**
1. Go to your web service dashboard
2. Click **"Shell"** tab
3. Run:
   ```bash
   flask db upgrade
   ```
4. This will show the current migration status

**Explanation:**
- Migrations ensure your database schema matches your models
- The startup script runs migrations automatically on every deployment
- If migrations fail, check the logs for errors
- You can also run migrations manually via the Shell

### Step 9: Test Your Deployment

1. **Health Check:**
   ```bash
   curl https://coursemate-backend.onrender.com/api/health
   ```
   Should return: `{"status": "healthy"}` or similar

2. **Test API Endpoint:**
   ```bash
   curl https://coursemate-backend.onrender.com/
   ```
   Should return: `Flask backend is working!`

3. **Test Authentication (if configured):**
   ```bash
   curl -X POST https://coursemate-backend.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

### Step 10: Free Tier Limitations

**Important Notes About Render Free Tier:**
- **Spin-down:** Services spin down after 15 minutes of inactivity
- **Cold start:** First request after spin-down takes ~30 seconds
- **Resources:** Limited to 512MB RAM
- **Database:** Free PostgreSQL expires after 90 days, then $7/month
- **Bandwidth:** Limited bandwidth on free tier

**Recommendations:**
- For production, upgrade to **Starter plan** ($7/month) for:
  - Always-on service (no spin-down)
  - More resources (512MB RAM, 0.5 CPU)
  - Better performance
- Use free tier for:
  - Development/testing
  - Low-traffic personal projects
  - Learning and experimentation

---

## Post-Deployment Configuration

### 1. Update Frontend API URL

Update your frontend to point to the new backend URL:

```typescript
// In your frontend API service file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coursemate-backend.onrender.com';
```

Or in your `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://coursemate-backend.onrender.com
```

### 2. Update CORS Settings

Ensure your backend CORS includes your production frontend URL:

1. Edit `backend/app/__init__.py`
2. Update the CORS origins list:

```python
CORS(app,
     resources={
         r"/api/*": {
             "origins": [
                 "https://your-production-frontend.com",
                 "https://your-production-frontend.vercel.app",
                 "http://localhost:3001",  # Keep for local dev
                 "http://localhost:3000"
             ],
             # ... rest of config
         }
     })
```

3. Redeploy your service (push to main branch or click "Manual Deploy")

### 3. Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   - `https://coursemate-backend.onrender.com/api/oauth/google/callback`
   - (Use your actual Render backend URL)

**Explanation:**
- Google OAuth requires exact URL matches
- Add both your Render URL and any custom domains you set up
- Keep localhost URLs for development

### 4. Set Up Custom Domain (Optional)

1. In your Render web service dashboard
2. Go to **"Settings"** tab
3. Scroll to **"Custom Domains"** section
4. Click **"Add Custom Domain"**
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Render will provide DNS records to add:
   - **CNAME record:** Point to `coursemate-backend.onrender.com`
   - Or **A record:** Use the provided IP address
7. Add the DNS records to your domain provider
8. Wait for DNS propagation (5 minutes to 48 hours)
9. Render automatically provisions SSL certificate

**Explanation:**
- Custom domains make your API URL more professional
- SSL is automatically provided by Render (Let's Encrypt)
- DNS changes can take time to propagate globally

### 5. Configure Monitoring (Recommended)

**Render Built-in Monitoring:**
- View logs in real-time
- Monitor service health
- View metrics (CPU, memory, requests)

**External Monitoring (Optional):**
- **Sentry:** Error tracking and performance monitoring
- **Uptime Robot:** Uptime monitoring
- **LogRocket:** Session replay and error tracking

### 6. Set Up Backups

**Database Backups:**
1. Go to your PostgreSQL database dashboard
2. Go to **"Backups"** tab
3. Render automatically creates daily backups on paid plans
4. Free tier: Manual backups only

**Application Backups:**
- Your code is in Git (already backed up)
- Environment variables: Export and store securely
- Database: Use Render's backup feature

---

## Troubleshooting

### Issue: Application Won't Start

**Symptoms:** Deployment succeeds but app returns 502/503 errors

**Solutions:**
1. **Check logs:**
   - Go to your service → **"Logs"** tab
   - Look for error messages
   - Common errors:
     - Import errors
     - Missing environment variables
     - Database connection failures

2. **Verify start command:**
   - Ensure `render-start.sh` exists and is executable
   - Or use direct command: `gunicorn --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 120 --worker-class eventlet wsgi:app`

3. **Check if gunicorn is installed:**
   - Verify `gunicorn>=21.2.0` is in `requirements.txt`
   - Check build logs for installation errors

4. **Verify wsgi.py exists:**
   - Ensure `backend/wsgi.py` exists
   - Content should be:
     ```python
     from app.init import create_app
     app = create_app()
     ```

### Issue: pgvector Extension Error

**Symptoms:** `psycopg2.errors.UndefinedObject: type "vector" does not exist`

**Solutions:**
1. **Enable pgvector extension manually:**
   - Go to your Render web service → **Shell** tab
   - Run:
     ```bash
     python3 -c "
     from app import create_app
     from app.extensions import db
     from sqlalchemy import text
     app = create_app()
     with app.app_context():
         db.session.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
         db.session.commit()
     "
     ```

2. **Or use Render PostgreSQL dashboard:**
   - Go to your PostgreSQL database dashboard
   - Click **"Connect"** → Use external connection
   - Connect via psql and run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Verify it's enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

4. **Then rerun migrations:**
   ```bash
   flask db upgrade
   ```

**Note:** The startup script tries to enable it automatically, but if it fails due to permissions, you'll need to enable it manually first.

### Issue: Database Connection Errors

**Symptoms:** `OperationalError: could not connect to server` or `psycopg2.OperationalError`

**Solutions:**
1. **Verify DATABASE_URL:**
   - Check environment variable is set correctly
   - Use **Internal Database URL** (not external)
   - Format: `postgresql://user:password@host:port/database`

2. **Check database is running:**
   - Go to PostgreSQL service dashboard
   - Status should be "Available"
   - If paused, click "Resume"

3. **Verify database credentials:**
   - Check username, password, and database name match
   - Test connection using Render Shell:
     ```bash
     psql $DATABASE_URL
     ```

4. **Check network connectivity:**
   - Ensure web service and database are in same region
   - Use internal database URL (faster, no network charges)

### Issue: Socket.IO Not Working

**Symptoms:** WebSocket connections fail, real-time features don't work

**Solutions:**
1. **Use eventlet worker:**
   - Ensure start command includes: `--worker-class eventlet`
   - Or use `render-start.sh` which includes this

2. **Verify eventlet is installed:**
   - Check `requirements.txt` includes `eventlet>=0.33.0`

3. **Check CORS for Socket.IO:**
   - In `backend/app/__init__.py`, ensure:
     ```python
     socketio.init_app(app, cors_allowed_origins="*")
     ```

4. **Update frontend Socket.IO URL:**
   - Point to your Render backend URL
   - Use HTTPS in production

### Issue: CORS Errors

**Symptoms:** Frontend can't make requests, browser shows CORS policy errors

**Solutions:**
1. **Update CORS origins:**
   - Edit `backend/app/__init__.py`
   - Add your production frontend URL to origins list
   - Include protocol (https://)

2. **Verify FRONTEND_URL:**
   - Check environment variable is set
   - Should match your actual frontend domain

3. **Check credentials:**
   - If using cookies/auth headers, ensure:
     ```python
     CORS(app, supports_credentials=True)
     ```

4. **Redeploy after changes:**
   - Push changes to Git or click "Manual Deploy"

### Issue: Environment Variables Not Loading

**Symptoms:** App uses default values instead of environment variables

**Solutions:**
1. **Verify variables are set:**
   - Go to service → **"Environment"** tab
   - Check all variables are present
   - Check for typos in variable names (case-sensitive)

2. **Restart service:**
   - After adding variables, redeploy
   - Click "Manual Deploy" or push to Git

3. **Check variable names:**
   - Must match exactly (case-sensitive)
   - No extra spaces
   - Use underscores, not hyphens

### Issue: File Uploads Not Working

**Symptoms:** Files fail to upload or can't be accessed

**Solutions:**
1. **If using S3:**
   - Verify S3 credentials are correct
   - Check bucket name matches
   - Verify bucket CORS configuration
   - Check S3 bucket permissions

2. **If using local storage:**
   - Not recommended for production (files are ephemeral)
   - Switch to S3 for production

3. **Check FILE_STORAGE variable:**
   - Should be `S3` for production
   - Verify all S3-related variables are set

### Issue: Slow Response Times

**Symptoms:** API requests are slow

**Solutions:**
1. **Free tier spin-down:**
   - Free tier services spin down after 15 min inactivity
   - First request after spin-down takes ~30 seconds (cold start)
   - **Solution:** Upgrade to paid plan for always-on service

2. **Increase workers:**
   - Update start command to use more workers:
     ```bash
     gunicorn --bind 0.0.0.0:$PORT --workers 8 --threads 2 ...
     ```
   - Note: More workers = more memory usage

3. **Database performance:**
   - Ensure database and web service are in same region
   - Use internal database URL
   - Consider upgrading database plan for better performance

4. **Optimize application:**
   - Add database indexes
   - Optimize queries
   - Use connection pooling
   - Cache frequently accessed data

### Issue: Build Failures

**Symptoms:** Deployment fails during build phase

**Solutions:**
1. **Check build logs:**
   - Go to service → **"Logs"** tab
   - Look for error messages during build

2. **Common causes:**
   - Missing dependencies in `requirements.txt`
   - Python version mismatch
   - Compilation errors (native extensions)
   - Network issues during pip install

3. **Fix Python version:**
   - Add `runtime.txt` with: `python-3.12.0`
   - Or specify in build command

4. **Check requirements.txt:**
   - Ensure all dependencies are listed
   - Pin versions for stability
   - Test locally: `pip install -r requirements.txt`

### Getting Help

1. **Check Render Documentation:**
   - [Render Docs](https://render.com/docs)
   - [Python on Render](https://render.com/docs/python)

2. **Check Application Logs:**
   - Always check logs first
   - Look for error stack traces
   - Check both build and runtime logs

3. **Render Support:**
   - Free tier: Community support
   - Paid plans: Email support
   - [Render Community](https://community.render.com)

4. **Debug Locally:**
   - Test changes locally before deploying
   - Use same environment variables
   - Test with production database (external URL)

---

## Production Checklist

Before going live, ensure:

- [ ] All environment variables are set correctly
- [ ] Database is backed up (paid plans have automatic backups)
- [ ] CORS is configured with production frontend URL
- [ ] SSL/HTTPS is enabled (automatic on Render)
- [ ] Health check endpoint works: `/api/health`
- [ ] Database migrations are run successfully
- [ ] Frontend is updated with new API URL
- [ ] Google OAuth redirect URIs are updated
- [ ] Secret keys are strong and unique
- [ ] `FLASK_ENV=production` is set
- [ ] `DEBUG=False` in production (if applicable)
- [ ] File storage is configured (S3 recommended)
- [ ] Email service is configured and tested
- [ ] Monitoring is set up (optional but recommended)
- [ ] Custom domain is configured (optional)
- [ ] Service is upgraded from free tier (recommended for production)

---

## Cost Information

### Free Tier
- **Web Service:** Free (spins down after 15 min)
- **PostgreSQL:** Free for 90 days, then $7/month
- **Limitations:** 512MB RAM, spins down, slower cold starts

### Starter Plan (Recommended for Production)
- **Web Service:** $7/month
  - Always-on (no spin-down)
  - 512MB RAM, 0.5 CPU
  - Better performance
- **PostgreSQL:** $7/month
  - 1GB storage
  - Daily backups
  - Better performance

### Total Cost
- **Free tier:** $0 (for 90 days), then $7/month for database
- **Starter:** ~$14/month (web service + database)
- **Standard:** ~$40/month (better performance, more resources)

---

## Next Steps

1. ✅ Deploy backend to Render (you're here!)
2. Deploy frontend (Vercel/Netlify recommended)
3. Update frontend API URL
4. Test end-to-end functionality
5. Set up monitoring (Sentry recommended)
6. Configure custom domain (optional)
7. Set up backups
8. Upgrade to paid plan for production (recommended)

Good luck with your deployment! 🚀
