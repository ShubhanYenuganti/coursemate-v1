from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, migrate, jwt, mail, socketio
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)

    # Configure Socket.IO CORS - allow frontend URL and localhost for development
    # For production, use specific origins; for development, allow all
    socketio_cors_origins = cors_origins.copy() if cors_origins else "*"
    socketio.init_app(
        app, 
        cors_allowed_origins=socketio_cors_origins, 
        logger=True, 
        engineio_logger=True,
        async_mode='eventlet',
        ping_timeout=60,
        ping_interval=25
    )
    print(f"✅ Socket.IO initialized with CORS origins: {socketio_cors_origins}", flush=True)
    
    # Import models to ensure they're registered with SQLAlchemy
    from . import models    
        
    # Configure CORS with specific origins
    # Dynamically include FRONTEND_URL from config, plus localhost for local development
    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:3000')
    cors_origins = [
        frontend_url,  # Use FRONTEND_URL from environment (works for production or localhost)
        "http://192.168.1.198:3001",  # Local network IPs for development
        "http://172.31.215.88:3001",
        "http://192.168.86.41:3001", 
        "http://localhost:3001",
        "http://localhost:3000"
    ]
    # Remove duplicates while preserving order
    cors_origins = list(dict.fromkeys(cors_origins))
    
    CORS(app,
         resources={
             r"/api/*": {
                 "origins": cors_origins,
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
                 "expose_headers": ["Content-Type", "X-Total-Count"],
                 "supports_credentials": True,
                 "max_age": 3600
             }
         },
         supports_credentials=True)

    # JWT Error Handler for debugging
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        print(f"JWT INVALID TOKEN ERROR: {error_string}")
        return {"error": "Invalid token"}, 422

    @jwt.unauthorized_loader
    def unauthorized_callback(error_string):
        print(f"JWT UNAUTHORIZED ERROR: {error_string}")
        return {"error": "Missing token"}, 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"JWT EXPIRED TOKEN ERROR: {jwt_payload}")
        return {"error": "Token has expired"}, 401

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.courses import courses_bp
    from .routes.users import users_bp
    from .routes.health import health_bp
    from .routes.uploads import uploads_bp
    from .routes.oauth import oauth_bp, register_oauth
    from .routes.messages import messages_bp
    from .routes.friends import friends_bp
    from .routes.embeddings import embeddings_bp
    from .routes.notifications import notifications_bp
    from .routes.materials import materials_bp
    from .routes.conversations import conversations_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(uploads_bp)
    register_oauth(app)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(embeddings_bp, url_prefix='/api/embeddings')
    app.register_blueprint(notifications_bp)
    app.register_blueprint(materials_bp, url_prefix='/api/materials')
    app.register_blueprint(conversations_bp)

    # Ensure SocketIO handlers from blueprints are recognized
    # (This is implicitly handled by importing the blueprints before socketio runs,
    # but let's make sure our friends blueprint is imported where socketio can see it)
    from .routes import friends
    
    # Global error handler to return JSON errors with CORS headers
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        print(traceback.format_exc())
        from flask import jsonify
        response = jsonify(message=str(e))
        response.status_code = 500
        return response

    @app.route("/")
    def index():
        return "Flask backend is working!"

    # Import models to ensure they're registered with SQLAlchemy
    from .models.course import Course
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        # Reset calendar_sync_in_progress for all users on startup
        from .models.user import User
        db.session.query(User).update({User.calendar_sync_in_progress: False})
        db.session.commit()

    # Log the current storage backend being used
    storage_backend = app.config.get('FILE_STORAGE', 'LOCAL').upper()
    print("==========================================", flush=True)
    print(f"✅ Storage backend configured: {storage_backend}", flush=True)
    print("==========================================", flush=True)

    return app 