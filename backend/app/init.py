from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    # CORS(app, resources={r"/api/*": {"origins": "http://192.168.1.198:3001"}}, supports_credentials=True)
    CORS(app,
         resources={r"/api/*": {
             "origins": ["http://192.168.1.198:3001", "http://172.31.215.88:3001", "http://localhost:3001", "http://localhost:3000"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
             "expose_headers": ["Content-Type", "X-Total-Count"],
             "supports_credentials": True,
             "max_age": 3600
         }},
         supports_credentials=True)
    app.config.from_object("app.config.Config")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

    @app.route("/")
    def index():
        return "Flask backend is working!"

    return app
