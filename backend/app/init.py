from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object("app.config.Config")
    
    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
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

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api/users')

    @app.route("/")
    def index():
        return "Flask backend is working!"
        
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    return app
