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
                
                # Skip events that were created by this application to avoid circular sync
                extended_props = item.get("extendedProperties", {})
                private_props = extended_props.get("private", {})
                if private_props.get("source") == "coursemate-app":
                    current_app.logger.info(f"Skipping application-created event: {item.get('id')} - {item.get('summary')}")
                    continue
                
                # Also skip events that already exist in our database with sync_status "Synced"
                # (these are likely events created by our app before the metadata fix)
                existing_synced = Goal.query.filter_by(google_event_id=item["id"], sync_status="Synced").first()
                if existing_synced:
                    current_app.logger.info(f"Skipping already synced event: {item.get('id')} - {item.get('summary')}")
                    continue
                
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

def get_or_create_calendar(service, cal_name):
    """Return calendarId for `cal_name`; create it if missing."""
    if not cal_name:
        cal_name = "CourseMate Tasks"  # Default calendar name
    
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

def sync_task_to_google_calendar(user: User, task: Goal, course_title: str = None):
    """
    Sync a task to Google Calendar. If the task already has a google_event_id,
    update the existing event. Otherwise, create a new event.
    """
    try:
        refresh_google_token(user)
        if not user.google_access_token:
            current_app.logger.warning("No Google access token for user %s", user.id)
            return False
        
        # Get course title if not provided
        if not course_title:
            course = Course.query.get(task.course_id)
            course_title = course.title if course else str(task.course_id)
        
        # Build credentials
        creds = Credentials(
            token=user.google_access_token,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=current_app.config["GOOGLE_CLIENT_ID"],
            client_secret=current_app.config["GOOGLE_CLIENT_SECRET"],
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        
        # Get or create calendar for this course
        calendar_id = get_or_create_calendar(service, course_title)
        
        # Prepare event data
        summary = task.task_title or "Untitled Task"
        description = task.task_descr or ""
        
        # Add subtask information to description if available
        # Get all subtasks for this task to include in the description
        all_subtasks = Goal.query.filter_by(task_id=task.task_id, user_id=user.id).all()
        if all_subtasks and len(all_subtasks) > 1:  # Only add subtasks section if there are multiple subtasks
            if description:
                description += "\n\nSubtasks:\n"
            else:
                description = "Subtasks:\n"
            
            for subtask in all_subtasks:
                status = "✓" if subtask.subtask_completed else "○"
                description += f"• {status} {subtask.subtask_descr}\n"
        elif task.subtask_descr and task.subtask_descr != task.task_descr:
            # Single subtask case
            if description:
                description += "\n\nSubtasks:\n"
            else:
                description = "Subtasks:\n"
            status = "✓" if task.subtask_completed else "○"
            description += f"• {status} {task.subtask_descr}\n"
        
        # Parse due date
        if not task.due_date:
            current_app.logger.warning("Task %s has no due date, skipping Google Calendar sync", task.task_id)
            return False
        
        # Convert to date for all-day event
        if isinstance(task.due_date, datetime):
            start_date = task.due_date.date()
        else:
            start_date = task.due_date
        end_date = start_date + timedelta(days=1)
        
        event_body = {
            "summary": summary,
            "description": description,
            "start": {"date": start_date.isoformat()},
            "end": {"date": end_date.isoformat()},
            "extendedProperties": {
                "private": {
                    "source": "coursemate-app",
                    "task_id": task.task_id,
                    "goal_id": task.goal_id
                }
            }
        }
        
        # Check if task already has a Google Calendar event
        if task.google_event_id and task.sync_status == "Synced":
            try:
                # Update existing event
                updated_event = service.events().update(
                    calendarId=calendar_id,
                    eventId=task.google_event_id,
                    body=event_body
                ).execute()
                
                # Update ALL task rows with the same task_id with Google Calendar info
                all_task_rows = Goal.query.filter_by(task_id=task.task_id, user_id=user.id).all()
                for task_row in all_task_rows:
                    task_row.google_event_id = updated_event["id"]
                    task_row.google_calendar_id = calendar_id
                    task_row.sync_status = "Synced"
                    task_row.updated_at = datetime.now(timezone.utc)
                
                # Commit the database changes
                db.session.commit()
                
                current_app.logger.info("Updated Google Calendar event %s for task %s", 
                                      updated_event["id"], task.task_id)
                return True
            except HttpError as e:
                if e.resp.status == 404:
                    # Event not found, create new one
                    current_app.logger.warning("Google Calendar event %s not found, creating new event", 
                                             task.google_event_id)
                    task.google_event_id = None
                    task.sync_status = None
                else:
                    current_app.logger.error("Failed to update Google Calendar event: %s", str(e))
                    return False
        
        # Always delete any existing events for this task first to avoid duplicates
        try:
            # First, try to delete the specific event if we have its ID
            if task.google_event_id:
                try:
                    service.events().delete(
                        calendarId=task.google_calendar_id or calendar_id,
                        eventId=task.google_event_id
                    ).execute()
                    current_app.logger.info("Deleted existing Google Calendar event %s for task %s", 
                                          task.google_event_id, task.task_id)
                except HttpError as e:
                    if e.resp.status != 404:  # Ignore 404 errors
                        current_app.logger.warning("Error deleting specific event %s: %s", task.google_event_id, str(e))
            
            # Also search for any other events that might belong to this task
            all_calendars = service.calendarList().list().execute()
            for cal in all_calendars.get("items", []):
                cal_id = cal["id"]
                try:
                    # Search for events with our metadata
                    events = service.events().list(
                        calendarId=cal_id,
                        q=task.task_title,  # Search by task title
                        timeMin=(datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
                        timeMax=(datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                        singleEvents=True
                    ).execute()
                    
                    for event in events.get("items", []):
                        # Check if this event belongs to our task
                        event_props = event.get("extendedProperties", {}).get("private", {})
                        if (event_props.get("task_id") == task.task_id or 
                            event_props.get("source") == "coursemate-app" and 
                            event.get("summary") == task.task_title):
                            # Delete this event (skip if it's the one we already deleted)
                            if event["id"] != task.google_event_id:
                                service.events().delete(
                                    calendarId=cal_id,
                                    eventId=event["id"]
                                ).execute()
                                current_app.logger.info("Deleted duplicate Google Calendar event %s for task %s", 
                                                      event["id"], task.task_id)
                except HttpError as e:
                    if e.resp.status != 404:  # Ignore 404 errors
                        current_app.logger.warning("Error checking calendar %s: %s", cal_id, str(e))
        except Exception as e:
            current_app.logger.warning("Error cleaning up existing events: %s", str(e))
        
        # Clear the stored event ID since we're creating a new one
        # Update ALL task rows with the same task_id to clear Google Calendar info
        all_task_rows = Goal.query.filter_by(task_id=task.task_id, user_id=user.id).all()
        for task_row in all_task_rows:
            task_row.google_event_id = None
            task_row.sync_status = None
            task_row.updated_at = datetime.now(timezone.utc)
        
        # Commit the database changes
        db.session.commit()
        
        # Create new event
        try:
            new_event = service.events().insert(
                calendarId=calendar_id,
                body=event_body
            ).execute()
            
            # Update ALL task rows with the same task_id with Google Calendar info
            all_task_rows = Goal.query.filter_by(task_id=task.task_id, user_id=user.id).all()
            for task_row in all_task_rows:
                task_row.google_event_id = new_event["id"]
                task_row.google_calendar_id = calendar_id
                task_row.sync_status = "Synced"
                task_row.updated_at = datetime.now(timezone.utc)
            
            # Commit the database changes
            db.session.commit()
            
            current_app.logger.info("Created Google Calendar event %s for task %s", 
                                  new_event["id"], task.task_id)
            return True
            
        except HttpError as e:
            current_app.logger.error("Failed to create Google Calendar event: %s", str(e))
            return False
            
    except Exception as e:
        current_app.logger.exception("Error syncing task to Google Calendar: %s", str(e))
        return False

def delete_task_from_google_calendar(user: User, task: Goal):
    """
    Delete a task's corresponding event from Google Calendar.
    """
    try:
        if not task.google_event_id or task.sync_status != "Synced":
            return True  # Nothing to delete
        
        refresh_google_token(user)
        if not user.google_access_token:
            current_app.logger.warning("No Google access token for user %s", user.id)
            return False
        
        # Build credentials
        creds = Credentials(
            token=user.google_access_token,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=current_app.config["GOOGLE_CLIENT_ID"],
            client_secret=current_app.config["GOOGLE_CLIENT_SECRET"],
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        
        try:
            service.events().delete(
                calendarId=task.google_calendar_id or "primary",
                eventId=task.google_event_id
            ).execute()
            
            current_app.logger.info("Deleted Google Calendar event %s for task %s", 
                                  task.google_event_id, task.task_id)
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                # Event already deleted
                current_app.logger.info("Google Calendar event %s already deleted", task.google_event_id)
                return True
            else:
                current_app.logger.error("Failed to delete Google Calendar event: %s", str(e))
                return False
                
    except Exception as e:
        current_app.logger.exception("Error deleting task from Google Calendar: %s", str(e))
        return False

@calendar_bp.route("/api/calendar/sync", methods=["POST"])
@jwt_required()
def trigger_google_calendar_sync():
    """Trigger Google Calendar sync with full_sync=False (incremental sync)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if not user.google_access_token:
            return jsonify({"error": "Google Calendar not connected"}), 400
        
        # Trigger incremental sync
        sync_google_events(user, full_sync=False)
        
        return jsonify({"message": "Google Calendar sync completed successfully"}), 200
        
    except Exception as e:
        current_app.logger.exception("Error during Google Calendar sync: %s", str(e))
        return jsonify({"error": f"Sync failed: {str(e)}"}), 500
