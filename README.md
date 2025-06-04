# CourseMate

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/neonpancake30-3775s-projects/v0-course-mate)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/xRY89o7e49y)

# CourseMate

A modern course management and collaboration platform.

## Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 13+
- pip (Python package manager)
- npm (Node.js package manager)

## Getting Started

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coursemate-v1/backend
   ```

2. **Set up a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the `backend` directory:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/coursemate
   JWT_SECRET_KEY=your-secret-key-here
   FLASK_APP=wsgi.py
   FLASK_ENV=development
   ```

5. **Set up the database**
   ```bash
   # Create and initialize the database
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

6. **Run the backend server**
   ```bash
   flask run
   ```

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
coursemate-v1/
├── backend/               # Flask backend
│   ├── app/               # Application package
│   │   ├── __init__.py    # Application factory
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── config.py      # Configuration
│   ├── migrations/        # Database migrations
│   ├── requirements.txt   # Python dependencies
│   └── wsgi.py           # WSGI entry point
└── frontend/              # Next.js frontend
    ├── components/        # React components
    ├── pages/             # Next.js pages
    ├── public/            # Static files
    └── package.json       # Node.js dependencies
```

## Available Scripts

### Backend
- `flask run` - Start the Flask development server
- `flask db migrate` - Create a new migration
- `flask db upgrade` - Apply database migrations

### Frontend
- `npm run dev` - Start the Next.js development server
- `npm run build` - Build for production
- `npm start` - Start the production server

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Secret key for JWT token generation
- `FLASK_APP` - Entry point for Flask application
- `FLASK_ENV` - Application environment (development/production)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/neonpancake30-3775s-projects/v0-course-mate](https://vercel.com/neonpancake30-3775s-projects/v0-course-mate)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/xRY89o7e49y](https://v0.dev/chat/projects/xRY89o7e49y)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
