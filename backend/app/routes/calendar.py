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
            "showDeleted": True,
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
                # Log the event being processed
                current_app.logger.info(f"Processing event: {item.get('id')} - {item.get('summary')} - Status: {item.get('status')}")
                
                # Handle deleted events
                if item.get("status") == "cancelled":
                    existing_rows = Goal.query.filter_by(google_event_id=item["id"]).all()
                    if existing_rows:
                        current_app.logger.info(f"Deleting {len(existing_rows)} rows for cancelled event: {item.get('id')}")
                        for existing in existing_rows:
                            db.session.delete(existing)
                        db.session.commit()
                    continue
                
                existing_rows = Goal.query.filter_by(google_event_id=item["id"]).all()
                if existing_rows:
                    for existing in existing_rows:
                        # Check if there are actual changes to avoid unnecessary updates
                        start_raw = item["start"].get("dateTime") or item["start"].get("date")
                        end_raw = item["end"].get("dateTime") or item["end"].get("date")
                        
                        # Parse new times for comparison
                        if "T" in end_raw:
                            new_due_date = isoparse(end_raw).astimezone(timezone.utc)
                        else:
                            new_due_date = isoparse(end_raw + "T00:00:00Z").astimezone(timezone.utc)
                        
                        if "T" in start_raw:
                            new_start_time = isoparse(start_raw).astimezone(timezone.utc)
                        else:
                            new_start_time = isoparse(start_raw + "T00:00:00Z").astimezone(timezone.utc)
                        
                        if "T" in end_raw:
                            new_end_time = isoparse(end_raw).astimezone(timezone.utc)
                        else:
                            new_end_time = isoparse(end_raw + "T00:00:00Z").astimezone(timezone.utc)
                        
                        new_task_descr = item.get("description", "")
                        new_goal_descr = f"Imported from {cal_name}"
                        
                        # Check if any fields have actually changed
                        has_changes = (
                            existing.goal_descr != new_goal_descr or
                            existing.task_descr != new_task_descr or
                            existing.due_date != new_due_date or
                            existing.start_time != new_start_time or
                            existing.end_time != new_end_time
                        )
                        
                        if has_changes:
                            current_app.logger.info(f"Updating existing goal for event: {item.get('id')} - {item.get('summary')}")
                            # Update fields if needed
                            existing.goal_descr = new_goal_descr
                            existing.task_descr = new_task_descr
                            existing.due_date = new_due_date
                            existing.start_time = new_start_time
                            existing.end_time = new_end_time
                            existing.updated_at = datetime.now(timezone.utc)
                        else:
                            current_app.logger.debug(f"No changes detected for event: {item.get('id')} - {item.get('summary')}")
                else:
                    # Create new goal
                    current_app.logger.info(f"Creating new goal for event: {item.get('id')} - {item.get('summary')}")
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
        # Commit all changes for this calendar at once (faster for incremental sync)
        db.session.commit()
    # RECOMMENDATION: Ensure an index exists on Goal.google_event_id for optimal sync performance.
    


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

@calendar_bp.route("/api/calendar/events/<goal_id>", methods=["POST"])
@jwt_required()
def create_event(goal_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    refresh_google_token(user)
    
    # pull incremental updates so local DB matches Google
    try:
        sync_google_events(user, full_sync=False)
    except Exception as e:
        current_app.logger.exception("Incremental sync failed")
        return jsonify({"error": str(e)}), 500

    goal = Goal.query.get(goal_id)
    if not goal or goal.user_id != current_user_id:
        return jsonify({"msg": "Goal not found"}), 404

    if (goal.sync_status or "").lower() == "synced" or goal.goal_id == "Google Calendar":
        return jsonify({"msg": "Event already synced"}), 200

    # Auth credentials
    creds = Credentials(
        token=user.google_access_token,
        refresh_token=user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=current_app.config["GOOGLE_CLIENT_ID"],
        client_secret=current_app.config["GOOGLE_CLIENT_SECRET"],
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)

    # Input data
    data = request.get_json(force=True)
    summary = data.get("task_title")
    description = data.get("task_descr") or goal.task_descr or ""
    due_str = data.get("due_date")
    course_title = data.get("course_title")

    if not summary or not due_str or not course_title:
        return jsonify({"error": "task_title, due_date, and course_title required"}), 400

    # Parse date
    try:
        start_date = isoparse(due_str).date()
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid ISO format for due_date"}), 400
    end_date = start_date + timedelta(days=1)

    calendar_id = get_or_create_calendar(service, course_title)

    event_body = {
        "summary": summary,
        "description": description,
        "start": {"date": start_date.isoformat()},
        "end": {"date": end_date.isoformat()},
    }

    try:
        event = service.events().insert(calendarId=calendar_id, body=event_body).execute()
    except HttpError as e:
        if e.resp.status == 409:
            return jsonify({"msg": "Duplicate event"}), 409
        return jsonify({"error": str(e)}), 500

    goal.sync_status = "Synced"
    goal.google_event_id = event["id"]
    goal.google_calendar_id = calendar_id
    db.session.commit()
    


    return jsonify({"event_id": event["id"], "calendar_id": calendar_id}), 201

def get_or_create_calendar(service, cal_name):
    """Return calendarId for `cal_name`; create it if missing."""
    page_token = None
    while True:
        feed = service.calendarList().list(pageToken=page_token).execute()
        for item in feed.get("items", []):
            if item.get("summary") == cal_name:
                return item["id"]
        page_token = feed.get("nextPageToken")
        if not page_token:
            break

    new_cal = service.calendars().insert(
        body={"summary": cal_name}
    ).execute()
    return new_cal["id"]
