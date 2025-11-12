# CourseMate

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)

## 🚀 Quick Start

**New to the project? Follow these steps to get up and running:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShubhanYenuganti/coursemate-v1.git
   cd coursemate-v1
   ```

2. **Set up AWS RDS PostgreSQL** (see [Database Configuration](#1-database-setup-aws-rds-postgresql))
   - Create an RDS PostgreSQL instance
   - Enable pgvector extension
   - Note your connection string

3. **Configure backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip3 install -r requirements.txt
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up AWS S3** (see [AWS S3 Configuration](#5-aws-s3-configuration-required))
   - Create S3 bucket
   - Configure IAM user
   - Set up CORS policy

5. **Configure services** (see [Configuration](#configuration))
   - Google OAuth (required)
   - OpenAI API key (required)
   - Gmail SMTP (required for email verification)

6. **Initialize database**
   ```bash
   python create_tables.py
   ```

7. **Install frontend dependencies**
   ```bash
   cd ..
   pnpm install
   ```

8. **Run the application**
   ```bash
   pnpm run dev:all
   ```

9. **Open** `http://localhost:3001` in your browser

> **⚠️ Important**: This project requires AWS services:
> - **AWS RDS PostgreSQL** with pgvector extension for database operations
> - **AWS S3** for file storage (documents, images, uploads)
> - Local alternatives are not supported

## ✨ Features

- **Course Management**: Create, organize, and manage courses with materials and assignments
- **AI-Powered Chat**: Integrated AI assistant for course-related queries using LlamaIndex and OpenAI
- **Real-time Communication**: Video calls, messaging, and notifications using Socket.IO and PeerJS
- **Smart Calendar**: Google Calendar integration with automatic event syncing
- **Task Management**: Create and track assignments with deadline reminders
- **Community Features**: Discussion forums, peer collaboration, and social learning
- **Goal Tracking**: Set and monitor academic goals with progress visualization
- **Document Processing**: Upload and process PDFs, DOCX files with vector embeddings
- **Authentication**: Secure JWT-based auth with Google OAuth integration

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 (React 18)
- **UI Components**: Radix UI, Tailwind CSS
- **Rich Text Editor**: TipTap
- **Real-time**: Socket.IO Client, PeerJS
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **PDF Handling**: PDF.js

### Backend
- **Framework**: Flask (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Flask-JWT-Extended, Authlib (Google OAuth)
- **Real-time**: Flask-SocketIO with eventlet
- **AI/ML**: LlamaIndex, OpenAI API
- **Vector Database**: pgvector (PostgreSQL extension)
- **Email**: Flask-Mail
- **File Storage**: AWS S3

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **pnpm**: 10.11.1 or higher (recommended) or npm
- **Git**: Latest version
- **AWS Account**: For RDS PostgreSQL and S3

### Required AWS Services
- **AWS RDS PostgreSQL**: 13 or higher with pgvector extension (required)
- **AWS S3**: For file storage (required)

### Additional Requirements
- OpenAI API key (for AI features)
- Google Cloud Console project (for OAuth and Calendar integration)
- Gmail account with App Password (for email verification)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ShubhanYenuganti/coursemate-v1.git
cd coursemate-v1
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd backend
python3 -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Create Environment Variables

Create a `.env` file in the `backend` directory. You can use the provided `.env.example` as a template:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual values (see [Configuration](#configuration) section for detailed setup):

```bash
# =============================================================================
# DATABASE CONFIGURATION (AWS RDS PostgreSQL - Required)
# =============================================================================
# PostgreSQL connection string from AWS RDS
# Format: postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/coursemate
DATABASE_URL=postgresql://coursemate_admin:your_password@your-rds-endpoint.region.rds.amazonaws.com:5432/coursemate

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
# Secret key for Flask session management (use a strong random string)
SECRET_KEY=your-super-secret-key-change-this-in-production

# JWT secret key for token signing (use a different strong random string)
JWT_SECRET_KEY=your-jwt-secret-key-change-this-in-production

# JWT token expiration times
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=30

# =============================================================================
# FLASK CONFIGURATION
# =============================================================================
FLASK_APP=wsgi.py
FLASK_ENV=development
FLASK_RUN_PORT=5000

# =============================================================================
# OPENAI CONFIGURATION
# =============================================================================
# OpenAI API key for AI features (LlamaIndex, embeddings, chat)
# Get it from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key

# =============================================================================
# GOOGLE OAUTH & CALENDAR CONFIGURATION
# =============================================================================
# Get these from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
# SMTP server settings for sending emails (verification, notifications)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=465
MAIL_USE_TLS=False
MAIL_USE_SSL=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-specific-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# =============================================================================
# FRONTEND CONFIGURATION
# =============================================================================
# Frontend URL for CORS and OAuth redirects
FRONTEND_URL=http://localhost:3001

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
# Whether to require email verification for new users (True or False)
REQUIRE_EMAIL_VERIFICATION=True

# =============================================================================
# FILE STORAGE CONFIGURATION (AWS S3 - Required)
# =============================================================================
# Storage backend: Must be S3
FILE_STORAGE=S3

# AWS S3 Configuration
AWS_STORAGE_BUCKET_NAME=coursemate-files
S3_KEY=your-aws-access-key-id
S3_SECRET=your-aws-secret-access-key
S3_REGION=us-east-1
```

> **⚠️ Important Security Notes:**
> - Never commit your `.env` file to version control
> - Generate strong random strings for `SECRET_KEY` and `JWT_SECRET_KEY`
> - Use different keys for development and production
> - For production, use AWS RDS with proper VPC configuration
> - Restrict RDS security group to only your application's IP addresses

### 3. Frontend Setup

```bash
# Navigate to root directory
cd ..

# Install dependencies using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

## ⚙️ Configuration

Before running the application, you need to configure the following services. Complete ALL steps in this section.

### 1. Database Setup (AWS RDS PostgreSQL)

#### Create RDS PostgreSQL Instance

1. **Sign in to AWS Console** and navigate to RDS
2. **Create Database**:
   ```
   Engine: PostgreSQL
   Version: 13 or higher
   Template: Free tier (for testing) or Production
   DB Instance Identifier: coursemate-db
   Master Username: coursemate_admin
   Master Password: [Strong password]
   DB Instance Class: db.t3.micro (or larger)
   Storage: 20 GB (adjust as needed)
   Storage Autoscaling: Enable
   ```

3. **Network & Security**:
   ```
   VPC: Default or custom
   Subnet group: Default
   Public access: Yes (for development) or No (for production with VPC)
   VPC Security Group: Create new
   Database port: 5432
   ```

4. **Database Options**:
   ```
   Initial database name: coursemate
   Parameter group: default.postgres13 (or higher)
   Enable automatic backups: Yes
   Backup retention: 7 days
   Enable encryption: Yes (recommended)
   ```

5. **Wait for Creation** (takes 5-10 minutes)

#### Configure Security Group

1. Select your database instance
2. Click on the VPC security group link
3. Edit inbound rules:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: Your IP address (for development)
         or Application security group (for production)
   ```

#### Enable pgvector Extension

```bash
# Install PostgreSQL client if not already installed
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Connect to your RDS instance
psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U coursemate_admin \
     -d coursemate \
     -p 5432

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
\dx
```

#### Update .env with RDS Connection String

```bash
DATABASE_URL=postgresql://coursemate_admin:your_password@your-rds-endpoint.region.rds.amazonaws.com:5432/coursemate
```

### 2. Google OAuth & Calendar API Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Enable APIs**:
   - Navigate to "APIs & Services" → "Library"
   - Search and enable: **Google+ API**
   - Search and enable: **Google Calendar API**

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: CourseMate
     - User support email: your-email@gmail.com
     - Developer contact: your-email@gmail.com
   - Application type: **Web application**
   - Name: CourseMate OAuth Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5000`
     - Your production backend URL
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/oauth/google/callback`
     - `http://localhost:5000/api/calendar/oauth/callback`
     - Your production URLs (if applicable)

5. **Copy Credentials to .env**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_DISCOVERY_URL=https://accounts.google.com/.well-known/openid-configuration
   ```

### 3. Email Configuration (Gmail SMTP)

1. **Enable 2-Factor Authentication**:
   - Go to Google Account Settings → Security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Select app: Mail
   - Select device: Other (Custom name)
   - Name it: "CourseMate Backend"
   - Click "Generate"
   - Copy the 16-character password

3. **Add to .env**:
   ```bash
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=465
   MAIL_USE_SSL=True
   MAIL_USE_TLS=False
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=abcd efgh ijkl mnop  # The 16-character app password
   MAIL_DEFAULT_SENDER=your-email@gmail.com
   ```

### 4. OpenAI API Configuration

1. **Sign up at [OpenAI Platform](https://platform.openai.com/)**
2. **Navigate to API Keys**:
   - Click on your profile → "View API keys"
   - Click "Create new secret key"
   - Name it: "CourseMate"
   - Copy the key (you won't see it again!)

3. **Add to .env**:
   ```bash
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
   ```

4. **Set up billing** (required for API usage):
   - Add payment method in Settings → Billing
   - Set usage limits to avoid unexpected charges

### 5. AWS S3 Configuration (Required)

1. **Create S3 Bucket**:
   - Go to [S3 Console](https://s3.console.aws.amazon.com/)
   - Create bucket with unique name: `coursemate-files` (must be globally unique)
   - Region: Same as your RDS instance for optimal performance
   - Block public access: Keep enabled (files accessed via signed URLs)
   - Enable versioning (recommended)
   - Enable encryption (recommended)

2. **Create IAM User for S3 Access**:
   - Go to IAM Console → Users → Add user
   - Username: `coursemate-s3-user`
   - Access type: Programmatic access
   - Attach policy: `AmazonS3FullAccess` (or create custom policy with read/write permissions)
   - Save Access Key ID and Secret Access Key

3. **Configure CORS for your bucket** (required for file uploads from browser):
   - Go to your S3 bucket → Permissions → CORS
   - Add the following configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["http://localhost:3001", "https://your-production-domain.com"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

4. **Add to .env**:
   ```bash
   FILE_STORAGE=S3
   AWS_STORAGE_BUCKET_NAME=coursemate-files
   S3_KEY=AKIAIOSFODNN7EXAMPLE
   S3_SECRET=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   S3_REGION=us-east-1
   ```

### 6. Generate Secure Keys

Generate strong secret keys for production:

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add these to your `.env` file.

### 7. Initialize the Database

After completing all configuration steps above, initialize the database:

```bash
cd backend
source venv/bin/activate  # Make sure virtual environment is activated

# Run migrations to create tables
python create_tables.py

# Or use Flask-Migrate
flask db upgrade
```

## 🏃 Running the Application

### Option 1: Run Both Frontend and Backend Together

```bash
# From the root directory
pnpm run dev:all
```

This will start:
- Frontend on `http://localhost:3001`
- Backend on `http://localhost:5000`

### Option 2: Run Separately

#### Backend Only

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python3 run.py

# Or using Flask CLI
flask run
```

The backend API will be available at `http://localhost:5000`

#### Frontend Only

```bash
# From root directory
pnpm run dev
```

The frontend will be available at `http://localhost:3001`

### Verify Installation

1. Open your browser to `http://localhost:3001`
2. You should see the CourseMate landing page
3. Try creating an account or logging in with Google
4. Check backend health: `http://localhost:5000/api/health`

## 📁 Project Structure

```
coursemate-v1/
├── app/                          # Next.js pages and app router
│   ├── (auth)/                   # Authentication pages
│   ├── calendar/                 # Calendar features
│   ├── call/                     # Video call functionality
│   ├── career-prep/              # Career preparation resources
│   ├── chat/                     # AI chat interface
│   ├── courses/                  # Course management
│   ├── dashboard/                # User dashboard
│   ├── onboarding/               # User onboarding flow
│   ├── resources/                # Learning resources
│   ├── context/                  # React contexts (Auth, Socket, Call)
│   └── components/               # App-specific components
│
├── backend/                      # Flask backend
│   ├── app/
│   │   ├── __init__.py          # App factory
│   │   ├── config.py            # Configuration
│   │   ├── extensions.py        # Flask extensions
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── task.py
│   │   │   ├── message.py
│   │   │   └── ...
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.py          # Authentication
│   │   │   ├── courses.py       # Course CRUD
│   │   │   ├── chat.py          # AI chat
│   │   │   ├── oauth.py         # Google OAuth
│   │   │   ├── calendar.py      # Calendar sync
│   │   │   ├── tasks.py         # Task management
│   │   │   ├── goals.py         # Goal tracking
│   │   │   └── ...
│   │   └── api/                 # Additional API modules
│   │       └── community.py     # Community features
│   ├── migrations/              # Database migrations
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Development server
│   └── wsgi.py                  # Production WSGI entry
│
├── components/                   # Reusable React components
│   ├── ui/                      # Shadcn UI components
│   ├── auth/                    # Auth components
│   ├── courses/                 # Course components
│   └── dashboard/               # Dashboard components
│
├── contexts/                     # Global React contexts
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions
├── public/                       # Static assets
├── styles/                       # Global styles
│
├── components.json               # Shadcn UI config
├── next.config.mjs              # Next.js configuration
├── package.json                 # Node.js dependencies
├── pnpm-lock.yaml               # pnpm lock file
├── tailwind.config.ts           # Tailwind CSS config
└── tsconfig.json                # TypeScript config
```

## 📜 Available Scripts

### Frontend Scripts

```bash
# Development server (port 3001)
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm run start

# Run backend only
pnpm run backend

# Run both frontend and backend concurrently
pnpm run dev:all
```

### Backend Scripts

```bash
# Run development server
python3 run.py

# Or using Flask CLI
flask run

# Database migrations
flask db migrate -m "Migration message"
flask db upgrade
flask db downgrade

# Create tables directly
python create_tables.py

# Run tests
pytest
pytest --cov  # With coverage report
```

## 🔌 API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: Your deployed backend URL

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/oauth/google` - Google OAuth login
- `POST /api/auth/verify-email` - Verify email address

#### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

#### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Chat (AI Assistant)
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/conversations` - Get chat history

#### Calendar
- `GET /api/calendar/events` - Get calendar events
- `POST /api/calendar/sync` - Sync with Google Calendar

#### Goals
- `GET /api/goals` - Get user goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal progress

#### Community
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create new post
- `POST /api/community/posts/:id/comments` - Add comment

### WebSocket Events

The application uses Socket.IO for real-time features:

- `connect` - Client connection established
- `message` - Chat messages
- `notification` - Real-time notifications
- `call:offer` - WebRTC call offers
- `call:answer` - WebRTC call answers
- `user:online` - User online status
