from flask import Blueprint, redirect, url_for, request, jsonify, current_app
from authlib.integrations.flask_client import OAuth
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app.models.user import User
from app.extensions import db
from datetime import datetime, timedelta, timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from app.models.goal import Goal
from dateutil.parser import isoparse
from datetime import timezone
from app.models.course import Course
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
    user.token_expiry = (datetime.now(timezone.utc)
                        + timedelta(seconds=token["expires_in"]))    
    db.session.commit()
        
    try:
        sync_google_events(user, full_sync=True)
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("initial Google Calendar sync failed")
        return jsonify({"error": str(e)}), 500

    return redirect("http://localhost:3001/calendar")

# Helper: Refresh token if expired
def refresh_google_token(user: User):
    if not user.google_refresh_token:
        raise ValueError("No refresh token found")
    
    if user.token_expiry and user.token_expiry > datetime.now(timezone.utc):
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
    user.token_expiry = (datetime.now(timezone.utc)
                        + timedelta(seconds=new_token["expires_in"]))
    db.session.commit()
    
    
def sync_google_events(user: User, full_sync: bool = True):
    refresh_google_token(user)
    if not user.google_access_token:
        raise ValueError("No access token found")    
    
    course_id = ensure_google_calendar_course(user)
    
    credentials = Credentials(
                        token=user.google_access_token,
                        refresh_token=user.google_refresh_token,
                        token_uri="https://oauth2.googleapis.com/token",
                        client_id=current_app.config["GOOGLE_CLIENT_ID"],
                        client_secret=current_app.config["GOOGLE_CLIENT_SECRET"],
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    
    service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
    calendar_list = service.calendarList().list().execute()
    calendars = calendar_list.get("items", [])
    if not calendars:
        raise ValueError("No calendars found")
    
    for cal in calendars:
        cal_id = cal["id"]
        cal_name = cal.get("summary", "Untitled")
        cal_color = cal.get("backgroundColor", "#4285f4")  # Default Google Calendar blue
        
        token_map = user.google_sync_tokens or {}
        have_token = cal_id in token_map and not full_sync
    
        params = {
            "calendarId": cal_id,
            "maxResults": 2500,
            "singleEvents": True,
            "showDeleted": False,
        }
        
        if have_token:
            params["syncToken"] = token_map[cal_id]
        else:
            params["timeMin"] = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
            params["timeMax"] = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        
        events_resource = service.events()
        while True:
            try:
                feed = events_resource.list(**params).execute()
            except HttpError as e:
                # If the sync token is invalid we get 410 → fall back to full sync
                if e.resp.status == 410:
                    current_app.logger.warning("Sync token reset for %s", cal_name)
                    token_map.pop(cal_id, None)
                    db.session.commit()
                    # restart loop for this calendar with full window
                    have_token = False
                    params.pop("syncToken", None)
                    params["timeMin"] = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
                    params["timeMax"] = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
                    continue
                raise
            
            for item in feed.get("items", []):
                existing = Goal.query.filter_by(google_event_id=item["id"]).first()
                if existing:
                    # Update fields if needed
                    existing.goal_descr = item.get("summary", "Untitled")
                    existing.task_descr = item.get("description", "") # treat task_descr as description of google calendar event
                    
                    # Parse and convert times to UTC
                    start_raw = item["start"].get("dateTime") or item["start"].get("date")
                    end_raw = item["end"].get("dateTime") or item["end"].get("date")
                    
                    if "T" in end_raw:
                        existing.due_date = isoparse(end_raw).astimezone(timezone.utc)
                    else:
                        existing.due_date = isoparse(end_raw + "T00:00:00Z").astimezone(timezone.utc)
                    
                    if "T" in start_raw:
                        existing.start_time = isoparse(start_raw).astimezone(timezone.utc)
                    else:
                        existing.start_time = isoparse(start_raw + "T00:00:00Z").astimezone(timezone.utc)
                    
                    if "T" in end_raw:
                        existing.end_time = isoparse(end_raw).astimezone(timezone.utc)
                    else:
                        existing.end_time = isoparse(end_raw + "T00:00:00Z").astimezone(timezone.utc)
                    
                    existing.updated_at = datetime.now(timezone.utc)
                else:
                    # Create new goal
                    goal = convert_google_event_to_goal(user.id, course_id, event=item, calendar_name=cal_name, calendar_color=cal_color)
                    db.session.add(goal)
            db.session.commit()
            
            page_token = feed.get("nextPageToken")
            if page_token:
                params["pageToken"] = page_token
                continue

            # --- store the new sync token (incremental starts next time) ---
            new_token = feed.get("nextSyncToken")
            if new_token:
                token_map[cal_id] = new_token
                user.google_sync_tokens = token_map
                db.session.commit()
            break


def convert_google_event_to_goal(user_id, course_id, event, calendar_name, calendar_color):
    start_raw = event["start"].get("dateTime") or event["start"].get("date")
    end_raw = event["end"].get("dateTime") or event["end"].get("date")

    if not start_raw or not end_raw:
        raise ValueError(f"Missing start or end time in event: {event.get('id')}")
    
    # Parse and convert to UTC, preserving timezone info
    if "T" in start_raw:
        start_dt = isoparse(start_raw).astimezone(timezone.utc)
    else:
        # All-day event - use midnight UTC
        start_dt = isoparse(start_raw + "T00:00:00Z").astimezone(timezone.utc)
    
    if "T" in end_raw:
        end_dt = isoparse(end_raw).astimezone(timezone.utc)
    else:
        # All-day event - use midnight UTC
        end_dt = isoparse(end_raw + "T00:00:00Z").astimezone(timezone.utc)
    
    # Trim fields to 255 characters
    task_title = event.get("summary", "Untitled Google Event")
    if len(task_title) > 255:
        task_title = task_title[:255]
    
    subtask_descr = event.get("description", "")
    if len(subtask_descr) > 255:
        subtask_descr = subtask_descr[:255]
    
    return Goal(
        user_id=user_id,
        course_id=course_id,
        goal_id="Google Calendar",
        goal_descr=f"Imported from {calendar_name}",
        due_date=end_dt,
        goal_completed=False,
        task_id="Google Calendar",
        task_title=task_title,
        task_descr=event.get("summary", ""),
        task_completed=False,
        subtask_id="Google Calendar",
        subtask_descr=subtask_descr,
        subtask_type="Google Calendar",
        subtask_completed=False,
        google_event_id=event["id"],
        google_etag=event.get("etag"),
        google_source=event.get("organizer", {}).get("email", ""),
        is_external=True,
        start_time=start_dt,
        end_time=end_dt,
        google_calendar_color=calendar_color
    )

def ensure_google_calendar_course(user) -> str:
    stub_id = f"google-calendar-{user.id}"
    course = Course.query.get(stub_id)
    if course is None:                                  # create once
        course = Course(
            id=stub_id,
            user_id=user.id,
            title="Google Calendar",
            subject="External",
            course_code="GCAL",
            semester="N/A",
            description="Automatically-imported Google Calendar events",
            visibility="Private",
            badge="Enrolled",
        )
        db.session.add(course)
        db.session.commit()
    return stub_id
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
