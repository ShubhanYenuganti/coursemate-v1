from flask import Blueprint, redirect, url_for, request, jsonify, current_app
from authlib.integrations.flask_client import OAuth
from app.models.user import User
from app.extensions import db
from flask_jwt_extended import create_access_token
from datetime import timedelta

oauth_bp = Blueprint('oauth', __name__)
oauth = OAuth()

def register_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
        client_kwargs={
            "scope": "openid email profile"
        },
    )

@oauth_bp.route("/api/auth/google")
def google_login():
    redirect_uri = url_for('oauth.google_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@oauth_bp.route("/api/auth/google/callback")
def google_callback():
    token = oauth.google.authorize_access_token()
    
    if not token or "access_token" not in token:
        return jsonify({"error": "Failed to retrieve token"}), 400

    user_info = oauth.google.userinfo()

    if not user_info or "email" not in user_info:
        return jsonify({"error": "Failed to retrieve user information"}), 400

    email = user_info["email"]
    name = user_info.get("name")

    # Check if user exists
    user = User.query.filter_by(email=email).first()

    if not user:
        # New user → create
        user = User(
            email=email,
            name=name,
            role='student',
            email_verified=True,
            password_hash=None,  # OAuth users don't have passwords
        )
        db.session.add(user)
        
    db.session.commit()

    # Generate your own JWTs
    access_token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role},
        expires_delta=timedelta(hours=1)
    )
    refresh_token = create_access_token(
        identity=user.id,
        expires_delta=timedelta(days=30)
    )

    redirect_url = f"http://localhost:3001/token-handler?access_token={access_token}&refresh_token={refresh_token}"
    return redirect(redirect_url)