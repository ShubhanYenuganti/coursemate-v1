from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import db, migrate, mail
from flask_jwt_extended import JWTManager
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt = JWTManager(app)

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

    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(uploads_bp)

    # Log the current storage backend being used
    storage_backend = app.config.get('FILE_STORAGE', 'LOCAL').upper()
    print("==========================================", flush=True)
    print(f"✅ Storage backend configured: {storage_backend}", flush=True)
    print("==========================================", flush=True)

    return app 