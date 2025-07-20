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
from sqlalchemy import asc
import requests
import pytz
from typing import Optional
import uuid

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
    """Refresh Google OAuth access token using refresh token"""
    if not user.google_refresh_token:
        print(f"❌ No refresh token found for user {user.id}")
        raise ValueError("No refresh token found")
    
    if user.token_expiry and user.token_expiry > datetime.now(timezone.utc):
        print(f"✅ Token still valid for user {user.id}, expiry: {user.token_expiry}")
        return # Token is still valid

    print(f"🔄 Refreshing token for user {user.id}")
    
    # Token is expired, refresh it
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
        "refresh_token": user.google_refresh_token,
        "grant_type": "refresh_token"
    }

    try:
        response = requests.post(token_url, data=data)
        print(f"🔍 Token refresh response status: {response.status_code}")
        
        if response.status_code == 200:
            new_token = response.json()
            user.google_access_token = new_token["access_token"]
            user.token_expiry = (datetime.now(timezone.utc)
                                + timedelta(seconds=new_token["expires_in"]))
            db.session.commit()
            print(f"✅ Successfully refreshed token for user {user.id}")
        else:
            error_data = response.json() if response.content else {}
            error_message = error_data.get('error_description', error_data.get('error', 'Unknown error'))
            print(f"❌ Failed to refresh token for user {user.id}: {response.status_code}")
            print(f"❌ Error details: {error_message}")
            print(f"❌ Response content: {response.text}")
            
            # Handle specific error cases
            if response.status_code == 400:
                if 'invalid_grant' in error_message.lower():
                    print(f"⚠️  Invalid grant - user {user.id} needs to re-authenticate")
                    # Clear the invalid refresh token
                    user.google_refresh_token = None
                    user.google_access_token = None
                    user.token_expiry = None
                    db.session.commit()
                    raise ValueError("Invalid grant - user needs to re-authenticate")
                elif 'invalid_client' in error_message.lower():
                    print(f"⚠️  Invalid client credentials for user {user.id}")
                    raise ValueError("Invalid client credentials")
                else:
                    print(f"⚠️  Unknown 400 error for user {user.id}: {error_message}")
                    raise ValueError(f"Token refresh failed: {error_message}")
            else:
                raise ValueError(f"Token refresh failed with status {response.status_code}: {error_message}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during token refresh for user {user.id}: {str(e)}")
        raise ValueError(f"Network error during token refresh: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error during token refresh for user {user.id}: {str(e)}")
        raise ValueError(f"Unexpected error during token refresh: {str(e)}")
    
    
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
    
    token_map = user.google_sync_tokens or {}
    processed_calendars = 0
    total_events_processed = 0
    total_events_created = 0
    total_events_updated = 0
    total_events_deleted = 0
    
    for cal in calendars:
        cal_id = cal["id"]
        cal_name = cal.get("summary", "Untitled")
        cal_color = cal.get("backgroundColor", "#4285f4")  # Default Google Calendar blue
        
        have_token = cal_id in token_map and not full_sync
        
        if not full_sync and not have_token:
            current_app.logger.info(f"Skipping calendar {cal_name} (no sync token for incremental sync)")
            continue
        
        current_app.logger.info(f"Processing calendar: {cal_name} ({'incremental' if have_token else 'full'} sync)")
        processed_calendars += 1
        
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
        calendar_events_processed = 0
        calendar_events_created = 0
        calendar_events_updated = 0
        calendar_events_deleted = 0
        
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
            
            events = feed.get("items", [])
            if not events and have_token:
                current_app.logger.info(f"No changes detected for calendar: {cal_name}")
                # Store the sync token even if no changes
                new_token = feed.get("nextSyncToken")
                if new_token:
                    token_map[cal_id] = new_token
                    user.google_sync_tokens = token_map
                    db.session.commit()
                break
            
            # Pre-fetch all existing events for this batch to reduce database queries
            event_ids = [item.get('id') for item in events if item.get('id')]
            existing_events = {}
            if event_ids:
                # Use the index for efficient lookup
                existing_goals = Goal.query.filter(
                    Goal.google_event_id.in_(event_ids),
                    Goal.user_id == user.id
                ).all()
                existing_events = {goal.google_event_id: goal for goal in existing_goals}
            
            for item in events:
                calendar_events_processed += 1
                total_events_processed += 1
                
                event_id = item.get('id')
                if not event_id:
                    continue
                
                # Log the event being processed
                current_app.logger.info(f"Processing event: {event_id} - {item.get('summary')} - Status: {item.get('status')}")
                
                # Skip events that were created by this application to avoid circular sync
                extended_props = item.get("extendedProperties", {})
                private_props = extended_props.get("private", {})
                if private_props.get("source") == "coursemate-app":
                    current_app.logger.info(f"Skipping application-created event: {event_id} - {item.get('summary')}")
                    continue
                
                # Also skip events that already exist in our database with sync_status "Synced"
                # (these are likely events created by our app before the metadata fix)
                existing_synced = Goal.query.filter_by(google_event_id=event_id, sync_status="Synced").first()
                if existing_synced:
                    current_app.logger.info(f"Skipping already synced event: {event_id} - {item.get('summary')}")
                    continue
                
                # Handle deleted events
                if item.get("status") == "cancelled":
                    existing_rows = existing_events.get(event_id)
                    if existing_rows:
                        current_app.logger.info(f"Deleting rows for cancelled event: {event_id}")
                        db.session.delete(existing_rows)
                        calendar_events_deleted += 1
                        total_events_deleted += 1
                    continue
                
                # Check if event exists using the pre-fetched data
                existing_goal = existing_events.get(event_id)
                
                if existing_goal:
                    # Update existing goal
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
                        existing_goal.goal_descr != new_goal_descr or
                        existing_goal.task_descr != new_task_descr or
                        existing_goal.due_date != new_due_date or
                        existing_goal.start_time != new_start_time or
                        existing_goal.end_time != new_end_time
                    )
                    
                    if has_changes:
                        current_app.logger.info(f"Updating existing goal for event: {event_id} - {item.get('summary')}")
                        # Update fields if needed
                        existing_goal.goal_descr = new_goal_descr
                        existing_goal.task_descr = new_task_descr
                        existing_goal.due_date = new_due_date
                        existing_goal.start_time = new_start_time
                        existing_goal.end_time = new_end_time
                        existing_goal.updated_at = datetime.now(timezone.utc)
                        calendar_events_updated += 1
                        total_events_updated += 1
                    else:
                        current_app.logger.debug(f"No changes detected for event: {event_id} - {item.get('summary')}")
                else:
                    # Create new goal
                    current_app.logger.info(f"Creating new goal for event: {event_id} - {item.get('summary')}")
                    goal = convert_google_event_to_goal(user.id, course_id, event=item, calendar_name=cal_name, calendar_color=cal_color)
                    db.session.add(goal)
                    calendar_events_created += 1
                    total_events_created += 1
            
            # Commit all changes for this batch at once (faster with index)
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
        
        current_app.logger.info(f"Calendar {cal_name}: {calendar_events_processed} processed, {calendar_events_created} created, {calendar_events_updated} updated, {calendar_events_deleted} deleted")
    
    current_app.logger.info(f"Sync completed: {processed_calendars} calendars processed, {total_events_processed} total events ({total_events_created} created, {total_events_updated} updated, {total_events_deleted} deleted)")
    # Index on Goal.google_event_id provides optimal sync performance for lookups.
    


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
    """Ensure a Google Calendar course exists for the user and return its combo_id"""
    stub_id = f"google-calendar-{user.id}"
    
    # Check if course already exists by combo_id
    course = Course.query.filter_by(combo_id=stub_id, user_id=user.id).first()
    if course is None:
        # Create the Google Calendar course
        course = Course(
            combo_id=stub_id,  # Use combo_id as primary key
            id=str(uuid.uuid4()),  # Generate a unique id
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
        print(f"✅ Created Google Calendar course with combo_id: {stub_id}")
    else:
        print(f"✅ Found existing Google Calendar course with combo_id: {stub_id}")
    
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

def sync_subtask_to_google_calendar(user: User, subtask: Goal, course_title: Optional[str] = None):
    """
    Sync a subtask to Google Calendar as an individual event. 
    Each subtask gets its own event with the subtask description as the title.
    """
    try:
        print(f"🔄 Starting Google Calendar sync for subtask {subtask.subtask_id} (Task: {subtask.task_title})")
        
        try:
            refresh_google_token(user)
        except ValueError as e:
            if "needs to re-authenticate" in str(e):
                print(f"❌ User {user.id} needs to re-authenticate with Google Calendar")
                return False
            elif "Invalid client credentials" in str(e):
                print(f"❌ Invalid Google OAuth client credentials")
                return False
            else:
                print(f"❌ Token refresh failed: {str(e)}")
                return False
        
        if not user.google_access_token:
            print(f"❌ No Google access token for user {user.id}")
            return False
        
        # Get course title if not provided
        if not course_title:
            # Try to find the course by combo_id first, then by id
            course = Course.query.filter_by(combo_id=subtask.course_id, user_id=user.id).first()
            if not course:
                # Fallback to searching by id
                course = Course.query.filter_by(id=subtask.course_id, user_id=user.id).first()
            
            if course:
                course_title = course.title
            else:
                print(f"⚠️  Course not found for course_id: {subtask.course_id}, using fallback title")
                course_title = f"Course {subtask.course_id}"
        
        # Convert UTC times to local timezone for Google Calendar
        local_tz = pytz.timezone('America/New_York')  # Default timezone
        
        if not subtask.start_time or not subtask.end_time:
            print(f"⚠️  Skipping subtask {subtask.subtask_id}: No start/end times")
            return False
        
        # Convert UTC to local time
        start_time_local = subtask.start_time.replace(tzinfo=timezone.utc).astimezone(local_tz)
        end_time_local = subtask.end_time.replace(tzinfo=timezone.utc).astimezone(local_tz)
        
        # Format for Google Calendar API
        start_time_str = start_time_local.isoformat()
        end_time_str = end_time_local.isoformat()
        
        # Create event description with task due date, goal, and course info
        description_parts = []
        if subtask.task_due_date:
            task_due_str = subtask.task_due_date.strftime('%Y-%m-%d')
            description_parts.append(f"Task Due: {task_due_str}")
        if subtask.goal_descr:
            description_parts.append(f"Goal: {subtask.goal_descr}")
        if course_title:
            description_parts.append(f"Course: {course_title}")
        
        event_description = "\n".join(description_parts) if description_parts else "CourseMate Task"
        
        # Build credentials and service
        credentials = Credentials(
            token=user.google_access_token,
            refresh_token=user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=current_app.config["GOOGLE_CLIENT_ID"],
            client_secret=current_app.config["GOOGLE_CLIENT_SECRET"],
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        
        service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
        
        # Get or create calendar for this course
        calendar_id = get_or_create_calendar(service, course_title)
        
        # Check if event already exists
        existing_event = None
        if subtask.google_event_id:
            try:
                existing_event = service.events().get(
                    calendarId=calendar_id,
                    eventId=subtask.google_event_id
                ).execute()
            except HttpError as e:
                if e.resp.status == 404:
                    print(f"⚠️  Event {subtask.google_event_id} not found, will create new")
                    existing_event = None
                else:
                    raise
        
        # Prepare event data
        event_data = {
            'summary': subtask.subtask_descr,
            'description': event_description,
            'start': {
                'dateTime': start_time_str,
                'timeZone': str(local_tz)
            },
            'end': {
                'dateTime': end_time_str,
                'timeZone': str(local_tz)
            },
            'extendedProperties': {
                'private': {
                    'source': 'coursemate-app',
                    'subtask_id': subtask.subtask_id,
                    'task_id': subtask.task_id
                }
            }
        }
        
        if existing_event:
            # Update existing event
            updated_event = service.events().update(
                calendarId=calendar_id,
                eventId=subtask.google_event_id,
                body=event_data
            ).execute()
            
            print(f"✅ Calendar event updated: {subtask.subtask_descr} (Event ID: {updated_event['id']})")
            
            # Update database with new event ID (in case it changed)
            subtask.google_event_id = updated_event['id']
            subtask.google_calendar_id = calendar_id
            subtask.sync_status = "Synced"
            db.session.commit()
            
        else:
            # Create new event
            new_event = service.events().insert(
                calendarId=calendar_id,
                body=event_data
            ).execute()
            
            print(f"✅ Calendar event created: {subtask.subtask_descr} (Event ID: {new_event['id']})")
            
            # Update database
            subtask.google_event_id = new_event['id']
            subtask.google_calendar_id = calendar_id
            subtask.sync_status = "Synced"
            db.session.commit()
        
        return True
        
    except HttpError as e:
        print(f"❌ Google Calendar API error for subtask {subtask.subtask_id}: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error syncing subtask {subtask.subtask_id}: {str(e)}")
        return False

def sync_task_to_google_calendar(user: User, task: Goal, course_title: Optional[str] = None):
    """
    Sync a task to Google Calendar by syncing all its subtasks as individual events.
    This function now delegates to sync_subtask_to_google_calendar for each subtask.
    """
    try:
        # Get all subtasks for this task
        all_subtasks = Goal.query.filter_by(task_id=task.task_id, user_id=user.id).order_by(asc(Goal.subtask_order)).all()
        
        if not all_subtasks:
            current_app.logger.warning("Task %s has no subtasks, skipping Google Calendar sync", task.task_id)
            return False
        
        # Get course title if not provided
        if not course_title:
            course = Course.query.get(task.course_id)
            course_title = course.title if course else str(task.course_id)
        
        # Sync each subtask as an individual event
        success_count = 0
        for subtask in all_subtasks:
            if sync_subtask_to_google_calendar(user, subtask, course_title):
                success_count += 1
        
        current_app.logger.info("Synced %d/%d subtasks for task %s to Google Calendar", 
                               success_count, len(all_subtasks), task.task_id)
        return success_count > 0
        
    except Exception as e:
        current_app.logger.exception("Error syncing task subtasks to Google Calendar: %s", str(e))
        return False

def delete_task_from_google_calendar(user: User, task):
    """
    Delete a task's corresponding event from Google Calendar.
    task can be either a Goal object or a simple object with google_event_id and google_calendar_id attributes.
    """
    try:
        # Extract event ID and calendar ID from task object
        google_event_id = getattr(task, 'google_event_id', None)
        google_calendar_id = getattr(task, 'google_calendar_id', None)
        
        if not google_event_id:
            print(f"ℹ️  No Google Calendar event ID found for deletion")
            return True  # Nothing to delete
        
        print(f"🗑️  Attempting to delete Google Calendar event {google_event_id} from calendar {google_calendar_id or 'primary'}")
        
        refresh_google_token(user)
        if not user.google_access_token:
            print(f"❌ No Google access token for user {user.id}")
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
        
        # Try to delete from the specific calendar first
        calendar_to_try = google_calendar_id or "primary"
        try:
            service.events().delete(
                calendarId=calendar_to_try,
                eventId=google_event_id
            ).execute()
            
            print(f"✅ Successfully deleted Google Calendar event: {google_event_id} from {calendar_to_try}")
            return True
            
        except HttpError as e:
            if e.resp.status == 404:
                print(f"⚠️  Event {google_event_id} not found in calendar {calendar_to_try}, searching other calendars...")
                
                # If not found in the specific calendar, search all calendars
                try:
                    calendar_list = service.calendarList().list().execute()
                    calendars = calendar_list.get("items", [])
                    
                    for cal in calendars:
                        cal_id = cal["id"]
                        try:
                            # Try to delete from this calendar
                            service.events().delete(
                                calendarId=cal_id,
                                eventId=google_event_id
                            ).execute()
                            print(f"✅ Successfully deleted Google Calendar event: {google_event_id} from calendar {cal_id}")
                            return True
                        except HttpError as inner_e:
                            if inner_e.resp.status == 404:
                                continue  # Event not in this calendar, try next
                            else:
                                print(f"❌ Error deleting from calendar {cal_id}: {str(inner_e)}")
                                break
                    
                    print(f"ℹ️  Event {google_event_id} not found in any calendar")
                    return True  # Consider it deleted if not found anywhere
                    
                except Exception as search_e:
                    print(f"❌ Error searching calendars: {str(search_e)}")
                    return False
            else:
                print(f"❌ Failed to delete Google Calendar event {google_event_id}: {str(e)}")
                return False
                
    except Exception as e:
        print(f"❌ Error deleting task from Google Calendar: {str(e)}")
        return False

def check_user_google_auth_status(user: User) -> dict:
    """
    Check if a user has valid Google Calendar authentication.
    Returns a dict with status and message.
    """
    if not user.google_refresh_token:
        return {
            "status": "needs_auth",
            "message": "User has not connected Google Calendar"
        }
    
    try:
        refresh_google_token(user)
        return {
            "status": "authenticated",
            "message": "User has valid Google Calendar access"
        }
    except ValueError as e:
        if "needs to re-authenticate" in str(e):
            return {
                "status": "needs_reauth",
                "message": "User needs to re-authenticate with Google Calendar"
            }
        elif "Invalid client credentials" in str(e):
            return {
                "status": "config_error",
                "message": "Google OAuth configuration error"
            }
        else:
            return {
                "status": "error",
                "message": f"Authentication error: {str(e)}"
            }

@calendar_bp.route("/api/calendar/auth-status", methods=["GET"])
@jwt_required()
def check_google_auth_status():
    """Check the current user's Google Calendar authentication status"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        auth_status = check_user_google_auth_status(user)
        
        return jsonify({
            "user_id": user_id,
            "has_refresh_token": bool(user.google_refresh_token),
            "has_access_token": bool(user.google_access_token),
            "token_expiry": user.token_expiry.isoformat() if user.token_expiry else None,
            "auth_status": auth_status
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking auth status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/api/calendar/sync", methods=["POST"])
@jwt_required()
def trigger_google_calendar_sync():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if not user.google_access_token:
            return jsonify({"error": "Google Calendar not connected"}), 400

        user.calendar_sync_in_progress = True
        db.session.commit()
        try:
            sync_google_events(user, full_sync=False)
        finally:
            user.calendar_sync_in_progress = False
            db.session.commit()

        return jsonify({"message": "Google Calendar sync completed successfully"}), 200
    except Exception as e:
        user.calendar_sync_in_progress = False
        db.session.commit()
        current_app.logger.exception("Error during Google Calendar sync: %s", str(e))
        return jsonify({"error": f"Sync failed: {str(e)}"}), 500

@calendar_bp.route("/api/calendar/sync-status", methods=["GET"])
@jwt_required()
def get_sync_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"calendar_sync_in_progress": user.calendar_sync_in_progress}), 200

def cleanup_orphaned_google_calendar_events():
    """Clean up Google Calendar events that reference non-existent courses"""
    try:
        # Find all Google Calendar events
        google_events = Goal.query.filter_by(goal_id="Google Calendar").all()
        orphaned_count = 0
        
        for event in google_events:
            # Check if the referenced course exists
            course = Course.query.filter_by(combo_id=event.course_id, user_id=event.user_id).first()
            if not course:
                # Course doesn't exist, delete the event
                print(f"🗑️  Deleting orphaned Google Calendar event: {event.google_event_id} (course_id: {event.course_id})")
                db.session.delete(event)
                orphaned_count += 1
        
        if orphaned_count > 0:
            db.session.commit()
            print(f"✅ Cleaned up {orphaned_count} orphaned Google Calendar events")
        else:
            print("✅ No orphaned Google Calendar events found")
        
        return orphaned_count
        
    except Exception as e:
        print(f"❌ Error cleaning up orphaned events: {str(e)}")
        db.session.rollback()
        return 0

@calendar_bp.route("/api/calendar/cleanup", methods=["POST"])
@jwt_required()
def cleanup_google_calendar_events():
    """Clean up orphaned Google Calendar events"""
    try:
        orphaned_count = cleanup_orphaned_google_calendar_events()
        
        return jsonify({
            "message": f"Cleanup completed",
            "orphaned_events_removed": orphaned_count
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error during cleanup: {str(e)}")
        return jsonify({"error": str(e)}), 500
