# IMPORTANT: Monkey patch eventlet BEFORE any other imports
# This must be the first import to avoid monkey patching errors
import eventlet
eventlet.monkey_patch()

from app.init import create_app
from app.extensions import socketio

app = create_app()

# Export socketio for Gunicorn to use with eventlet
# This is required for WebSocket support in production
socketio_instance = socketio

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
