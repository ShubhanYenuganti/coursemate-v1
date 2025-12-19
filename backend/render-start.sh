#!/bin/bash
# Startup script for Render.com
# This script runs database migrations and then starts the server

set -e  # Exit on error

echo "Starting Coursemate Backend..."

# Run database migrations
echo "Running database migrations..."
flask db upgrade || echo "Migration failed or already up to date"

# Start the server
echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --threads 2 --timeout 120 --worker-class eventlet wsgi:app

