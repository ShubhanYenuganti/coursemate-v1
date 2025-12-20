#!/bin/bash
# Startup script for Render.com
# This script runs database migrations and then starts the server
# Note: pgvector extension must be enabled manually in the PostgreSQL database

set -e  # Exit on error

echo "Starting Coursemate Backend..."

# Run database migrations
echo "Running database migrations..."
flask db upgrade || echo "Migration failed or already up to date"

# Start the server
# IMPORTANT: Use 1 worker for Socket.IO - multiple workers don't share Socket.IO state
# For Socket.IO to work properly, we need a single worker with eventlet
echo "Starting Gunicorn server with Socket.IO support..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 1000 --timeout 120 --worker-class eventlet --worker-connections 1000 wsgi:app

