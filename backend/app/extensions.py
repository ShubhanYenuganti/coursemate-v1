from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_socketio import SocketIO

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
# Initialize Socket.IO with eventlet for production (works with Gunicorn + eventlet)
# For development, threading mode is fine, but eventlet is required for production WebSocket support
socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet', logger=True, engineio_logger=True)