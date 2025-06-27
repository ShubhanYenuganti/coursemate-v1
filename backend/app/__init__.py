from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, migrate, jwt, mail
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
        
    # Configure CORS with specific origins like in init.py
    CORS(app,
         resources={
             r"/api/*": {
                 "origins": [
                     "http://192.168.1.198:3001",
                     "http://172.31.215.88:3001", 
                     "http://localhost:3001",
                     "http://localhost:3000"
                 ],
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
    from .routes.chat import chat_bp
    from .routes.oauth import oauth_bp, register_oauth
    from .routes.messages import messages_bp
    from .routes.goals import goals_bp
    from .routes.calendar import calendar_bp, register_calendar_oauth

    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(chat_bp)
    register_oauth(app)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(calendar_bp)
    register_calendar_oauth(app)
    
    # Global error handler to return JSON errors with CORS headers
    @app.errorhandler(Exception)
    def handle_exception(e):
        from flask import jsonify
        response = jsonify(message=str(e))
        response.status_code = 500
        return response

    @app.route("/")
    def index():
        return "Flask backend is working!"
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    # Log the current storage backend being used
    storage_backend = app.config.get('FILE_STORAGE', 'LOCAL').upper()
    print("==========================================", flush=True)
    print(f"✅ Storage backend configured: {storage_backend}", flush=True)
    print("==========================================", flush=True)

    return app 