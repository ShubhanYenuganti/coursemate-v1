from flask import Blueprint, redirect, url_for, request, jsonify, current_app
from authlib.integrations.flask_client import OAuth
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app.models.user import User
from app.extensions import db
from datetime import datetime, timedelta
import requests

calendar_bp = Blueprint('calendar', __name__)
oauth = OAuth()

def register_calendar_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name="google_calendar",
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        server_metadata_url=app.config['GOOGLE_DISCOVERY_URL'],
        client_kwargs={
            "scope": "openid email profile https://www.googleapis.com/auth/calendar"
        },
    )

@calendar_bp.route("/api/calendar/auth")
def calendar_auth():
    token = request.args.get("token")
    if not token:
        return jsonify({"msg": "Missing token in query parameters"}), 401

    try:
        decoded = decode_token(token)
        user_id = decoded["sub"]  # user_id that was encoded in the token
    except Exception as e:
        return jsonify({"msg": "Invalid or expired token", "details": str(e)}), 401

    # You can now use user_id to look up the user in the DB
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    redirect_uri = url_for('calendar.calendar_callback', _external=True)
    return oauth.google_calendar.authorize_redirect(
        redirect_uri,
        access_type="offline",
        prompt="consent"
    )

@calendar_bp.route("/api/calendar/callback")
def calendar_callback():    
    token = oauth.google_calendar.authorize_access_token()
    if not token or "access_token" not in token:
        return jsonify({"error": "Failed to retrieve token"}), 400
    
    user_info = oauth.google_calendar.userinfo()
    if not user_info or "email" not in user_info:
        return jsonify({"error": "Failed to retrieve user information"}), 400
    
    email = user_info["email"]
    name = user_info.get("name")

    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.google_access_token = token["access_token"]
    user.google_refresh_token = token["refresh_token"]
    user.token_expiry = datetime.now() + timedelta(seconds=token["expires_in"])
    db.session.commit()

    return redirect("http://localhost:3001/calendar")

# Helper: Refresh token if expired
def refresh_google_token(user: User):
    if not user.google_refresh_token:
        raise ValueError("No refresh token found")
    
    if user.token_expiry and user.token_expiry > datetime.now():
        return # Token is still valid

    # Token is expired, refresh it
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
        "refresh_token": user.google_refresh_token,
        "grant_type": "refresh_token"
    }

    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        raise ValueError("Failed to refresh token")
    
    new_token = response.json()
    user.google_access_token = new_token["access_token"]
    user.token_expiry = datetime.now() + timedelta(seconds=new_token["expires_in"])
    db.session.commit()
    
# Use Google Calendar API to Post a new event to user's calendar
@calendar_bp.route("/api/calendar/events", methods=["POST"])
@jwt_required()
def create_event():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    refresh_google_token(user)
    
    if not user.google_access_token:
        return jsonify({"error": "No access token found"}), 400
    
    try: 
        refresh_google_token(user)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    event_data = request.json
    required_fields = {"summary", "start", "end"}
    
    if not required_fields.issubset(event_data):
        return jsonify({"error": "Missing required fields"}), 400
    
    event_payload = {
        "summary": event_data["summary"],
        "description": event_data.get("description", ""),
        "start": {
            "dateTime": event_data["start"],
            "timeZone": event_data.get("timeZone", "America/New_York")
        },
        "end": {
            "dateTime": event_data["end"],
            "timeZone": event_data.get("timeZone", "America/New_York")
        },
    }
    
    headers = {
        "Authorization": f"Bearer {user.google_access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        json=event_payload,
        headers=headers
    )
    
    if response.status_code == 200:
        return jsonify({"message": "Event created successfully"}), 200
    else:
        return jsonify({"error": "Failed to create event"}), response.status_code
    
# Sample JSON Request Body for creating an event
# {
#   "summary": "Mentorship Session",
#   "description": "1:1 mentor meeting",
#   "start": "2025-06-17T15:00:00Z",
#   "end": "2025-06-17T16:00:00Z",
#   "timeZone": "America/Los_Angeles"
# }
