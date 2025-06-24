from flask import Flask
from flask_cors import CORS
from app.extensions import db, migrate, jwt, mail
from flask import jsonify


def create_app():
    app = Flask(__name__)
    
    # Load configuration
    from app.config import Config
    app.config.from_object(Config)
    
    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Configure CORS
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
    
    # Global error handler to return JSON errors with CORS headers
    @app.errorhandler(Exception)
    def handle_exception(e):
        response = jsonify(message=str(e))
        response.status_code = 500
        return response

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.courses import courses_bp
    from app.routes.health import health_bp
    from app.routes.oauth import oauth_bp, register_oauth
    from app.routes.calendar import calendar_bp, register_calendar_oauth
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(health_bp)
    register_oauth(app)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(calendar_bp)
    register_calendar_oauth(app)

    @app.route("/")
    def index():
        return "Flask backend is working!"
        
    # Import models to ensure they're registered with SQLAlchemy
    from app.models.user import User
    from app.models.course import Course
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    return app
