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
    
    # Import models to ensure they're registered with SQLAlchemy
    from . import models    
        
    # Configure CORS with specific origins FIRST (before Socket.IO)
    # Dynamically include FRONTEND_URL from config, plus localhost for local development
    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:3000')
    cors_origins = [
        frontend_url,  # Use FRONTEND_URL from environment (works for production or localhost)
        "http://192.168.1.198:3001",  # Local network IPs for development
        "http://172.31.215.88:3001",
        "http://192.168.86.41:3001", 
        "http://localhost:3001",  # Common Next.js dev port
        "http://localhost:3000",  # Common Next.js dev port
        "http://127.0.0.1:3001",  # Alternative localhost format
        "http://127.0.0.1:3000",  # Alternative localhost format
    ]
    # Remove duplicates while preserving order
    cors_origins = list(dict.fromkeys(cors_origins))
    print(f"✅ CORS origins configured: {cors_origins}", flush=True)
    
    # Configure CORS for both API and Socket.IO endpoints
    # IMPORTANT: Socket.IO needs wildcard (*) for polling to work with Render
    CORS(app,
         resources={
             r"/api/*": {
                 "origins": cors_origins,
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
                 "expose_headers": ["Content-Type", "X-Total-Count"],
                 "supports_credentials": True,
                 "max_age": 3600
             },
             r"/socket.io/*": {
                 "origins": "*",  # Allow all origins for Socket.IO (required for Render)
                 "methods": ["GET", "POST", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                 "supports_credentials": False,  # Cannot be true with wildcard origin
                 "max_age": 3600
             }
         },
         supports_credentials=True)

    # Configure Socket.IO CORS - Use wildcard for Render compatibility
    # Socket.IO polling transport has issues with specific origins on Render
    socketio_cors_origins = "*"  # Allow all origins for Socket.IO
    
    # Add a before_request handler to handle OPTIONS (CORS preflight)
    # This MUST run before JWT checks to allow preflight through
    @app.before_request
    def handle_preflight():
        from flask import request, make_response
        if request.method == 'OPTIONS':
            response = make_response('', 200)  # Return 200 OK instead of empty response
            origin = request.headers.get('Origin')
            # Allow if origin is in our list or if we allow all
            if origin and (origin in cors_origins or not cors_origins):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Max-Age'] = '3600'
            print(f"[CORS Preflight] Origin: {origin}, Path: {request.path}", flush=True)
            return response
    
    # Initialize Socket.IO - Use wildcard CORS for Render compatibility
    socketio.init_app(
        app, 
        cors_allowed_origins="*",  # Allow all origins (required for Render)
        logger=True, 
        engineio_logger=True,
        async_mode='eventlet',
        ping_timeout=60,
        ping_interval=25,
        allow_upgrades=True,
        transports=['polling', 'websocket']
    )
    print("✅ Socket.IO initialized with CORS origins: * (all origins)", flush=True)
    print("✅ Socket.IO async_mode: eventlet", flush=True)
    print("✅ Socket.IO transports: polling, websocket", flush=True)
    print("✅ Socket.IO CORS credentials: enabled", flush=True)

    # JWT Error Handler for debugging
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        print(f"JWT INVALID TOKEN ERROR: {error_string}", flush=True)
        return {"error": "Invalid token"}, 422

    @jwt.unauthorized_loader
    def unauthorized_callback(error_string):
        print(f"JWT UNAUTHORIZED ERROR: {error_string}", flush=True)
        return {"error": "Missing token"}, 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"JWT EXPIRED TOKEN ERROR: {jwt_payload}", flush=True)
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
    
    # Add after_request handler to add CORS headers to all responses
    @app.after_request
    def after_request(response):
        from flask import request
        origin = request.headers.get('Origin')
        
        # Add CORS headers for all API and Socket.IO endpoints
        if origin and (origin in cors_origins or not cors_origins):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        
        return response
    
    # Global error handler to return JSON errors with CORS headers
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        print(traceback.format_exc())
        from flask import jsonify, request
        response = jsonify(message=str(e))
        response.status_code = 500
        # Add CORS headers even for errors
        origin = request.headers.get('Origin')
        if origin and (origin in cors_origins or not cors_origins):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
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