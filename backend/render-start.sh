#!/bin/bash
# Startup script for Render.com
# This script enables pgvector extension, runs database migrations, and then starts the server

set -e  # Exit on error

echo "Starting Coursemate Backend..."

# Enable pgvector extension (required for vector type)
echo "Enabling pgvector extension..."
python3 -c "
from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text('CREATE EXTENSION IF NOT EXISTS vector;'))
        db.session.commit()
        print('✅ pgvector extension enabled')
    except Exception as e:
        print(f'⚠️  Warning: Could not enable pgvector extension: {e}')
        print('   You may need to enable it manually via Render Shell')
        db.session.rollback()
"

# Run database migrations
echo "Running database migrations..."
flask db upgrade || echo "Migration failed or already up to date"

# Start the server
echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 120 --worker-class eventlet wsgi:app

