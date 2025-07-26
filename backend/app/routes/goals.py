from collections import defaultdict
from flask import Blueprint, request, jsonify, current_app, g
from datetime import date, datetime, timezone, timedelta
import uuid
from app.models.goal import Goal
from app.models.course import Course
from app.init import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from app.routes.calendar import delete_task_from_google_calendar, sync_subtask_to_google_calendar
from app.models.user import User
import threading
import queue
import time
from sqlalchemy import asc

# Background task queue for Google Calendar sync
sync_queue = queue.Queue()
sync_thread = None
app_instance = None  # Store the Flask app instance

def background_sync_worker():
    """Background worker to handle Google Calendar sync tasks"""
    global app_instance
    
    while True:
        try:
            # Get task from queue (blocking)
            task_data = sync_queue.get(timeout=1)
            if task_data is None:  # Shutdown signal
                break
                
            action, user_id, task_id, course_id, google_event_id = task_data
            
            # Use the stored app instance to create context
            if app_instance:
                with app_instance.app_context():
                    try:
                        if action == "delete" and google_event_id:
                            # For deletion, we already have the Google Calendar event ID
                            user = User.query.get(user_id)
                            if user and user.google_access_token:
                                # Create a minimal task object with the event ID for deletion
                                class MinimalTask:
                                    def __init__(self, event_id, calendar_id=None):
                                        self.google_event_id = event_id
                                        self.google_calendar_id = calendar_id
                                        self.task_id = task_id
                                
                                minimal_task = MinimalTask(google_event_id)
                                print(f"Starting deletion of Google Calendar event: {google_event_id} for task {task_id}")
                                result = delete_task_from_google_calendar(user, minimal_task)
                                print(f"Deletion result for task {task_id}: {result}")
                            else:
                                print(f"Cannot delete Google Calendar event: user {user_id} not found or no access token")
                        else:
                            # For sync operations, get user and task from database
                            user = User.query.get(user_id)
                            if not user or not user.google_access_token:
                                print(f"Skipping sync for user {user_id}: no Google access token")
                                continue
                                
                            # Get all subtasks for this task
                            subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
                            if not subtasks:
                                print(f"No subtasks found for task {task_id}, skipping sync")
                                continue
                            
                            course = Course.query.get(course_id) if course_id else None
                            course_title = course.title if course else str(course_id) if course_id else "CourseMate Tasks"
                            
                            print(f"Processing background sync: {action} for task {task_id} with {len(subtasks)} subtasks")
                            
                            if action == "sync":
                                # Add a small delay to allow for automatic subtask creation
                                # This is especially important when syncing after subtask deletion
                                time.sleep(0.2)  # 200ms delay
                                
                                # Refresh subtask data to get the latest state including any auto-created subtasks
                                subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
                                if subtasks:
                                    print(f"🔄 Starting Google Calendar sync for task {task_id} with {len(subtasks)} subtasks")
                                    # Sync each subtask as an individual event
                                    success_count = 0
                                    for subtask in subtasks:
                                        if subtask.start_time and subtask.end_time:  # Only sync subtasks with timing
                                            if sync_subtask_to_google_calendar(user, subtask, course_title):
                                                success_count += 1
                                        else:
                                            print(f"⚠️  Skipping subtask {subtask.subtask_id}: No start/end times")
                                    print(f"✅ Google Calendar sync completed for task {task_id}: {success_count}/{len(subtasks)} subtasks synced")
                                else:
                                    print(f"⚠️  Task {task_id} no longer exists after delay, skipping sync")
                    except Exception as e:
                        print(f"Background sync failed for task {task_id}: {str(e)}")
                    finally:
                        sync_queue.task_done()
            else:
                print("No Flask app instance available for background sync")
                sync_queue.task_done()
                
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Background sync worker error: {str(e)}")
            time.sleep(1)  # Avoid tight loop on errors

def start_background_sync_worker():
    """Start the background sync worker thread"""
    global sync_thread
    if sync_thread is None or not sync_thread.is_alive():
        sync_thread = threading.Thread(target=background_sync_worker, daemon=True)
        sync_thread.start()
        print("Background Google Calendar sync worker started")

def init_background_workers(flask_app=None):
    """Initialize background workers - call this during app startup"""
    global app_instance
    if flask_app:
        app_instance = flask_app
    start_background_sync_worker()

def queue_google_calendar_sync(action, user_id, task_id, course_id=None, google_event_id=None):
    """Queue a Google Calendar sync task for background processing"""
    try:
        start_background_sync_worker()
        sync_queue.put((action, user_id, task_id, course_id, google_event_id))
        print(f"Queued Google Calendar sync: {action} for task {task_id}")
    except Exception as e:
        print(f"Failed to queue Google Calendar sync: {str(e)}")

goals_bp = Blueprint('goals', __name__)

@goals_bp.route('/api/courses/<course_id>/goals', methods=['GET'])
@jwt_required()
def get_course_goals(course_id):
    """Get all goals for a specific course"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if course exists and belongs to the user
        course = Course.query.filter_by(id=course_id, user_id=user_id).first()
        if not course:
            return jsonify({
                'error': 'Course not found or you do not have access'
            }), 404

        # Get all rows for this course using combo_id
        goals = Goal.query.filter_by(course_id=course.combo_id, user_id=user_id).all()
        
        # Group by goal_id to get only unique goals
        unique_goals = {}
        for goal in goals:
            if goal.goal_id not in unique_goals:
                unique_goals[goal.goal_id] = goal
        
        # Calculate progress for each goal
        result = []
        for goal in unique_goals.values():
            goal_dict = goal.to_dict()
            
            # Get all rows for this goal to calculate progress
            goal_rows = [g for g in goals if g.goal_id == goal.goal_id]
            
            # Filter out placeholder tasks
            real_task_rows = [g for g in goal_rows if g.task_id != 'placeholder' and g.task_title]
            
            if real_task_rows:
                # Calculate task and subtask counts
                unique_tasks = {}
                for row in real_task_rows:
                    if row.task_id not in unique_tasks:
                        unique_tasks[row.task_id] = {
                            'completed': row.task_completed,
                            'subtasks': 0,
                            'completed_subtasks': 0
                        }
                    unique_tasks[row.task_id]['subtasks'] += 1
                    if row.subtask_completed:
                        unique_tasks[row.task_id]['completed_subtasks'] += 1
                
                total_tasks = len(unique_tasks)
                completed_tasks = sum(1 for task in unique_tasks.values() if task['completed'])
                total_subtasks = sum(task['subtasks'] for task in unique_tasks.values())
                completed_subtasks = sum(task['completed_subtasks'] for task in unique_tasks.values())
                
                # Calculate progress percentage
                progress = 0
                if total_subtasks > 0:
                    progress = round((completed_subtasks / total_subtasks) * 100)
                
                goal_dict.update({
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'total_subtasks': total_subtasks,
                    'completed_subtasks': completed_subtasks,
                    'progress': progress
                })
            else:
                # No real tasks, set default values
                goal_dict.update({
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'total_subtasks': 0,
                    'completed_subtasks': 0,
                    'progress': 0
                })
            
            result.append(goal_dict)
        
        return jsonify(result), 200
    
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting goals: {str(e)}")
        return jsonify({'error': 'An error occurred while getting goals'}), 500


@goals_bp.route('/api/courses/<course_id>/goals', methods=['POST'])
@jwt_required()
def create_goal(course_id):
    """Create a new goal for a course"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if course exists and belongs to the user
        course = Course.query.filter_by(id=course_id, user_id=user_id).first()
        if not course:
            return jsonify({'error': 'Course not found or you do not have access'}), 404
        
        # Use the combo_id for the Goal model (which references courses.combo_id)
        course_combo_id = course.combo_id
        
        data = request.get_json()
        
        if not data or 'goal_descr' not in data:
            return jsonify({'error': 'Goal description is required'}), 400
        
        # Create a new goal with initial task and subtask
        goal_descr = data['goal_descr']
        due_date = datetime.fromisoformat(data['due_date']) if 'due_date' in data and data['due_date'] else None
        workMinutesPerDay = data['workMinutesPerDay'] if 'workMinutesPerDay' in data and data['workMinutesPerDay'] else None
        frequency = data['frequency'] if 'frequency' in data and data['frequency'] else None
        skip_default_task = data.get('skip_default_task', False)
        
        # Generate IDs
        goal_id = str(uuid.uuid4())
        
        # Create entries for each task and subtask
        rows_to_add = []
        
        if 'tasks' in data and data['tasks']:
            # Process tasks from request
            for task_data in data['tasks']:
                task_id = str(uuid.uuid4())
                task_title = task_data.get('task_title', 'New Task')
                task_descr = task_data.get('task_descr', '')
                
                if 'subtasks' in task_data and task_data['subtasks']:
                    # Process subtasks
                    for subtask_data in task_data['subtasks']:
                        subtask = Goal(
                            user_id=user_id,
                            course_id=course_combo_id,
                            goal_id=goal_id,
                            goal_descr=goal_descr,
                            due_date=due_date,
                            task_id=task_id,
                            task_title=task_title,
                            task_descr=task_descr,
                            subtask_id=str(uuid.uuid4()),
                            subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                            subtask_type=subtask_data.get('subtask_type', 'other'),
                            subtask_order=subtask_data.get('subtask_order', None),
                            workMinutesPerDay=workMinutesPerDay,
                            frequency=frequency
                        )
                        rows_to_add.append(subtask)
                else:
                    # Create a default subtask if none provided
                    subtask = Goal(
                        user_id=user_id,
                        course_id=course_combo_id,
                        goal_id=goal_id,
                        goal_descr=goal_descr,
                        due_date=due_date,
                        task_id=task_id,
                        task_title=task_title,
                        task_descr=task_descr,
                        subtask_id=str(uuid.uuid4()),
                        subtask_descr='Default Subtask',
                        subtask_type='other',
                        subtask_order=0,
                        workMinutesPerDay=workMinutesPerDay,
                        frequency=frequency
                    )
                    rows_to_add.append(subtask)
        elif not skip_default_task:
            # Create default task and subtask if none provided and not skipping default task
            new_goal, _, _ = Goal.create_for_goal(
                user_id=user_id,
                course_id=course_combo_id,
                goal_descr=goal_descr,
                due_date=due_date,
            )
            rows_to_add.append(new_goal)
        else:
            # Create a placeholder row with just the goal information
            placeholder_goal = Goal(
                user_id=user_id,
                course_id=course_combo_id,
                goal_id=goal_id,
                goal_descr=goal_descr,
                due_date=due_date,
                task_id='placeholder',
                task_title='',
                task_descr='',
                subtask_id='placeholder',
                subtask_descr='',
                subtask_type='other',
                workMinutesPerDay=workMinutesPerDay,
                frequency=frequency
            )
            rows_to_add.append(placeholder_goal)
        
        # Add all rows to the database
        for row in rows_to_add:
            db.session.add(row)
        
        db.session.commit()
        
        # Queue Google Calendar sync for any tasks created (excluding placeholders)
        if rows_to_add:
            # Get unique task IDs from created rows (excluding placeholders)
            task_ids = set(row.task_id for row in rows_to_add if row.task_id != 'placeholder')
            for task_id in task_ids:
                queue_google_calendar_sync("sync", user_id, task_id, course_id)
        
        # Return the created rows
        result = [row.to_dict() for row in rows_to_add]
        return jsonify(result), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating goal: {str(e)}")
        return jsonify({'error': 'An error occurred while creating the goal'}), 500


@goals_bp.route('/api/goals/<goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    """Update a goal"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        if not goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        data = request.get_json()
        
        # Update goal fields across all rows
        if 'goal_descr' in data or 'due_date' in data or 'goal_completed' in data:
            for goal in goals:
                if 'goal_descr' in data:
                    goal.goal_descr = data['goal_descr']
                
                if 'due_date' in data:
                    goal.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
                
                if 'goal_completed' in data:
                    goal.goal_completed = data['goal_completed']
                
                goal.updated_at = datetime.utcnow()
        
        # Handle task and subtask updates
        if 'tasks' in data:
            # Get existing task IDs
            existing_task_ids = {goal.task_id for goal in goals}
            
            # Track which tasks are in the update
            updated_task_ids = set()
            
            for task_data in data['tasks']:
                task_id = task_data.get('task_id')
                
                if task_id and task_id in existing_task_ids:
                    # Update existing task
                    updated_task_ids.add(task_id)
                    task_rows = [g for g in goals if g.task_id == task_id]
                    
                    # Update task fields
                    for task_row in task_rows:
                        if 'task_title' in task_data:
                            task_row.task_title = task_data['task_title']
                        if 'task_descr' in task_data:
                            task_row.task_descr = task_data['task_descr']
                        if 'task_completed' in task_data:
                            task_row.task_completed = task_data['task_completed']
                    
                    # Handle subtask updates
                    if 'subtasks' in task_data:
                        # Get existing subtask IDs for this task
                        existing_subtask_ids = {g.subtask_id for g in task_rows}
                        updated_subtask_ids = set()
                        
                        for subtask_data in task_data['subtasks']:
                            subtask_id = subtask_data.get('subtask_id')
                            
                            if subtask_id and subtask_id in existing_subtask_ids:
                                # Update existing subtask
                                updated_subtask_ids.add(subtask_id)
                                subtask_row = next((g for g in task_rows if g.subtask_id == subtask_id), None)
                                
                                if subtask_row:
                                    if 'subtask_descr' in subtask_data:
                                        subtask_row.subtask_descr = subtask_data['subtask_descr']
                                    if 'subtask_type' in subtask_data:
                                        subtask_row.subtask_type = subtask_data['subtask_type']
                                    if 'subtask_completed' in subtask_data:
                                        subtask_row.subtask_completed = subtask_data['subtask_completed']
                            else:
                                # Create new subtask
                                new_subtask = Goal(
                                    user_id=user_id,
                                    course_id=goals[0].course_id,
                                    goal_id=goal_id,
                                    goal_descr=goals[0].goal_descr,
                                    due_date=goals[0].due_date,
                                    goal_completed=goals[0].goal_completed,
                                    task_id=task_id,
                                    task_title=task_rows[0].task_title,
                                    task_descr=task_rows[0].task_descr,
                                    task_completed=task_rows[0].task_completed,
                                    subtask_id=subtask_data.get('subtask_id', str(uuid.uuid4())),
                                    subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                                    subtask_type=subtask_data.get('subtask_type', 'other'),
                                    subtask_completed=subtask_data.get('subtask_completed', False),
                                    subtask_order=subtask_data.get('subtask_order', None)
                                )
                                db.session.add(new_subtask)
                        
                        # Delete subtasks that weren't in the update
                        for g in task_rows:
                            if g.subtask_id not in updated_subtask_ids:
                                db.session.delete(g)
                else:
                    # Create new task with subtasks
                    new_task_id = task_data.get('task_id', str(uuid.uuid4()))
                    
                    if 'subtasks' in task_data and task_data['subtasks']:
                        for subtask_data in task_data['subtasks']:
                            new_subtask = Goal(
                                user_id=user_id,
                                course_id=goals[0].course_id,
                                goal_id=goal_id,
                                goal_descr=goals[0].goal_descr,
                                due_date=goals[0].due_date,
                                goal_completed=goals[0].goal_completed,
                                task_id=new_task_id,
                                task_title=task_data.get('task_title', 'New Task'),
                                task_descr=task_data.get('task_descr', ''),
                                task_completed=task_data.get('task_completed', False),
                                subtask_id=subtask_data.get('subtask_id', str(uuid.uuid4())),
                                subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                                subtask_type=subtask_data.get('subtask_type', 'other'),
                                subtask_completed=subtask_data.get('subtask_completed', False),
                                subtask_order=subtask_data.get('subtask_order', None)
                            )
                            db.session.add(new_subtask)
                    else:
                        # Create task with default subtask
                        new_subtask = Goal(
                            user_id=user_id,
                            course_id=goals[0].course_id,
                            goal_id=goal_id,
                            goal_descr=goals[0].goal_descr,
                            due_date=goals[0].due_date,
                            goal_completed=goals[0].goal_completed,
                            task_id=new_task_id,
                            task_title=task_data.get('task_title', 'New Task'),
                            task_descr=task_data.get('task_descr', ''),
                            task_completed=task_data.get('task_completed', False),
                            subtask_id=str(uuid.uuid4()),
                            subtask_descr='Default Subtask',
                            subtask_type='other',
                            subtask_completed=False,
                            subtask_order=0
                        )
                        db.session.add(new_subtask)
            
            # Instead of deleting tasks that weren't in the update, we'll keep them
            # This allows for incremental additions without losing existing data
            
            # After all updates, check if ALL tasks for the goal are completed (excluding placeholders)
            all_task_ids = set(g.task_id for g in goals if g.task_id != 'placeholder')
            all_tasks_completed = True if all_task_ids else False
            for tid in all_task_ids:
                task_rows = [g for g in goals if g.task_id == tid]
                if not all(g.task_completed for g in task_rows):
                    all_tasks_completed = False
                    break
            for g in goals:
                g.goal_completed = all_tasks_completed
        
        db.session.commit()
        
        # Queue Google Calendar sync for all tasks in this goal if due_date changed
        if 'due_date' in data:
            # Get all unique task IDs for this goal (excluding placeholders)
            task_ids = set(g.task_id for g in goals if g.task_id != 'placeholder')
            for task_id in task_ids:
                queue_google_calendar_sync("sync", user_id, task_id, goals[0].course_id)
        
        # Get the updated rows
        updated_goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        result = [goal.to_dict() for goal in updated_goals]
        
        return jsonify(result), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating goal: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the goal'}), 500


@goals_bp.route('/api/goals/<goal_id>', methods=['DELETE'])
@jwt_required()
def delete_goal(goal_id):
    """Delete a goal"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        if not goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Delete all rows for this goal
        for goal in goals:
            db.session.delete(goal)
        
        db.session.commit()
        
        return jsonify({'message': 'Goal deleted successfully'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting goal: {str(e)}")
        return jsonify({'error': 'An error occurred while deleting the goal'}), 500


@goals_bp.route('/api/goals/<goal_id>/tasks', methods=['GET'])
@jwt_required()
def get_goal_tasks(goal_id):
    """Get all tasks for a specific goal"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal, ordered by subtask_order
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).order_by(asc(Goal.subtask_order)).all()
        
        if not goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Filter out placeholder tasks and empty tasks
        # Keep placeholder rows only if there are no other tasks
        has_real_tasks = any(goal.task_id != 'placeholder' and goal.task_title for goal in goals)
        
        if has_real_tasks:
            # If there are real tasks, filter out placeholders
            filtered_goals = [goal for goal in goals if goal.task_id != 'placeholder' and goal.task_title]
        else:
            # If no real tasks, return empty array (placeholder will be handled by frontend)
            filtered_goals = []
        
        # Return filtered rows
        result = [goal.to_dict() for goal in filtered_goals]
        return jsonify(result), 200
        
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting tasks: {str(e)}")
        return jsonify({'error': 'An error occurred while getting tasks'}), 500


@goals_bp.route('/api/goals/<goal_id>/tasks', methods=['PUT'])
@jwt_required()
def update_goal_tasks(goal_id):
    print("Entered update_goal_tasks for goal_id:", goal_id)
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        if not goals:
            print("No goals found for goal_id:", goal_id)
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        data = request.get_json()
        if not data or 'tasks' not in data:
            print("No tasks in data for goal_id:", goal_id, "data:", data)
            return jsonify({'error': 'Tasks are required'}), 400

        existing_task_ids = {goal.task_id for goal in goals}
        
        # Track which tasks are in the update
        updated_task_ids = set()
        conflicting_subtasks = set()
        bypass = data.get('bypass')

        if not bypass:
            for task_data in data['tasks']:
                task_id = task_data.get('task_id')
                task_rows = [g for g in goals if g.task_id == task_id]
                task_due_date = None

                if 'task_due_date' in task_data and task_data['task_due_date']:
                    try:
                        if isinstance(task_data['task_due_date'], str):
                            if 'T' in task_data['task_due_date']:
                                task_due_date = datetime.fromisoformat(task_data['task_due_date'].replace('Z', '+00:00'))
                            else:
                                task_due_date = datetime.fromisoformat(task_data['task_due_date'] + 'T00:00:00')
                        else:
                            task_due_date = task_data['task_due_date']
                    except Exception as e:
                        current_app.logger.error(f"Error parsing task_due_date: {task_data['task_due_date']}, error: {e}")
                        task_due_date = None
                else:
                    task_due_date = task_rows[0].task_due_date if task_rows and hasattr(task_rows[0], 'task_due_date') else None

                if task_due_date:
                    for subtask_row in task_rows:
                        if getattr(subtask_row, 'task_id', None) == 'placeholder' or getattr(subtask_row, 'subtask_id', None) == 'placeholder':
                            continue
                        start_time = getattr(subtask_row, 'start_time', None)
                        subtask_id = getattr(subtask_row, 'subtask_id', None)
                        if start_time and subtask_id and start_time.date() > task_due_date.date():
                            conflicting_subtasks.add(subtask_id)

            if conflicting_subtasks:
                return jsonify({
                    'conflicting_subtasks': list(conflicting_subtasks),
                    'message': 'Some subtasks have a start_time after the task due date.'
                }), 409

        for task_data in data['tasks']:
            task_id = task_data.get('task_id')
            print('Received task_due_date:', task_data.get('task_due_date'))

            if task_id and task_id in existing_task_ids:
                # Update existing task
                updated_task_ids.add(task_id)
                task_rows = [g for g in goals if g.task_id == task_id]
                
                # Update task fields
                for task_row in task_rows:
                    for field in ['task_title', 'task_descr', 'task_completed']:
                        if field in task_data:
                            setattr(task_row, field, task_data[field])

                    if 'task_due_date' in task_data:
                        if task_data['task_due_date']:
                            try:
                                if isinstance(task_data['task_due_date'], str):
                                    # Handle different date formats
                                    if 'T' in task_data['task_due_date']:
                                        task_row.task_due_date = datetime.fromisoformat(task_data['task_due_date'].replace('Z', '+00:00'))
                                    else:
                                        # Assume YYYY-MM-DD format
                                        task_row.task_due_date = datetime.fromisoformat(task_data['task_due_date'] + 'T00:00:00')
                                else:
                                    task_row.task_due_date = task_data['task_due_date']
                                print(f"Updated task_due_date for task {task_id}: {task_row.task_due_date}")
                            except Exception as e:
                                current_app.logger.error(f"Error parsing task_due_date: {task_data['task_due_date']}, error: {e}")
                                # Keep existing value if parsing fails
                        else:
                            task_row.task_due_date = None
                            print(f"Set task_due_date to None for task {task_id}")

                        subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
                        for subtask in subtasks:
                            subtask.task_due_date = task_row.task_due_date
                            subtask.updated_at = datetime.utcnow()

                        for subtask in subtasks:
                            if subtask.start_time and subtask.end_time:
                                queue_google_calendar_sync("sync", user_id, subtask.task_id, subtask.course_id)
                                print(f"🔄 Queued Google Calendar sync for subtask {subtask.subtask_id}")
                            else:
                                print(f"⚠️  Skipping Google Calendar sync for subtask {subtask.subtask_id}: No start/end times")

                if 'subtasks' in task_data:
                    # Get existing subtask IDs for this task
                    existing_subtask_ids = {g.subtask_id for g in task_rows}
                    updated_subtask_ids = set()
                    
                    for subtask_data in task_data['subtasks']:
                        subtask_id = subtask_data.get('subtask_id')
                        
                        if subtask_id and subtask_id in existing_subtask_ids:
                            # Update existing subtask
                            updated_subtask_ids.add(subtask_id)
                            subtask_row = next((g for g in task_rows if g.subtask_id == subtask_id), None)
                            
                            if subtask_row:
                                for field in ['subtask_descr', 'subtask_type', 'subtask_completed']:
                                    if field in subtask_data:
                                        setattr(subtask_row, field, subtask_data[field])
                        else:
                            # Create new subtask
                            new_subtask = Goal(
                                user_id=user_id,
                                course_id=goals[0].course_id,
                                goal_id=goal_id,
                                goal_descr=goals[0].goal_descr,
                                due_date=goals[0].due_date,
                                goal_completed=goals[0].goal_completed,
                                task_id=task_id,
                                task_title=task_rows[0].task_title,
                                task_descr=task_rows[0].task_descr,
                                task_completed=task_rows[0].task_completed,
                                task_due_date=task_rows[0].task_due_date,
                                subtask_id=subtask_data.get('subtask_id', str(uuid.uuid4())),
                                subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                                subtask_type=subtask_data.get('subtask_type', 'other'),
                                subtask_completed=subtask_data.get('subtask_completed', False),
                                subtask_order=subtask_data.get('subtask_order', None)
                            )
                            print(f"Created new subtask with task_due_date: {task_rows[0].task_due_date}")
                            db.session.add(new_subtask)
                    
                    # Delete subtasks that weren't in the update
                    for g in task_rows:
                        if g.subtask_id not in updated_subtask_ids:
                            db.session.delete(g)
            else:
                # Create new task with subtasks
                new_task_id = task_data.get('task_id', str(uuid.uuid4()))
                
                if 'subtasks' in task_data and task_data['subtasks']:
                    for subtask_data in task_data['subtasks']:
                        new_subtask = Goal(
                            user_id=user_id,
                            course_id=goals[0].course_id,
                            goal_id=goal_id,
                            goal_descr=goals[0].goal_descr,
                            due_date=goals[0].due_date,
                            goal_completed=goals[0].goal_completed,
                            task_id=new_task_id,
                            task_title=task_data.get('task_title', 'New Task'),
                            task_descr=task_data.get('task_descr', ''),
                            task_completed=task_data.get('task_completed', False),
                            task_due_date=task_data.get('task_due_date', None),
                            subtask_id=subtask_data.get('subtask_id', str(uuid.uuid4())),
                            subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                            subtask_type=subtask_data.get('subtask_type', 'other'),
                            subtask_completed=subtask_data.get('subtask_completed', False),
                            subtask_order=subtask_data.get('subtask_order', None)
                        )
                        db.session.add(new_subtask)
                else:
                    # Create task with default subtask
                    new_subtask = Goal(
                        user_id=user_id,
                        course_id=goals[0].course_id,
                        goal_id=goal_id,
                        goal_descr=goals[0].goal_descr,
                        due_date=goals[0].due_date,
                        goal_completed=goals[0].goal_completed,
                        task_id=new_task_id,
                        task_title=task_data.get('task_title', 'New Task'),
                        task_descr=task_data.get('task_descr', ''),
                        task_completed=task_data.get('task_completed', False),
                        task_due_date=task_data.get('task_due_date', None),
                        subtask_id=str(uuid.uuid4()),
                        subtask_descr='Default Subtask',
                        subtask_type='other',
                        subtask_completed=False,
                        subtask_order=0
                    )
                    db.session.add(new_subtask)
        
        # Instead of deleting tasks that weren't in the update, we'll keep them
        # This allows for incremental additions without losing existing data
        
            # After all updates, check if ALL tasks for the goal are completed (excluding placeholders)
            all_task_ids = set(g.task_id for g in goals if g.task_id != 'placeholder')
            all_tasks_completed = True if all_task_ids else False
            for tid in all_task_ids:
                task_rows = [g for g in goals if g.task_id == tid]
                if not all(g.task_completed for g in task_rows):
                    all_tasks_completed = False
                    break
            for g in goals:
                g.goal_completed = all_tasks_completed
        
                    db.session.add(default_subtask)

        all_task_ids = set(g.task_id for g in goals if g.task_id != 'placeholder')
        all_tasks_completed = bool(all_task_ids) and all(
            all(g.task_completed for g in goals if g.task_id == tid)
            for tid in all_task_ids
        )
        for g in goals:
            g.goal_completed = all_tasks_completed

        db.session.commit()
        
        # Queue Google Calendar sync for all updated tasks
        updated_task_ids = set()
        for task_data in data['tasks']:
            task_id = task_data.get('task_id')
            if task_id and task_id in existing_task_ids:
                updated_task_ids.add(task_id)
        
        # Sync all updated tasks to Google Calendar
        for task_id in updated_task_ids:
            queue_google_calendar_sync("sync", user_id, task_id, goals[0].course_id)
        
        # Get the updated rows
        updated_goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        result = [goal.to_dict() for goal in updated_goals]
        
        return jsonify(result), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating tasks: {str(e)}")
        return jsonify({'error': 'An error occurred while updating tasks'}), 500


@goals_bp.route('/api/goals/<goal_id>/save-tasks', methods=['POST'])
@jwt_required()
def save_tasks_and_subtasks(goal_id):
    """Save tasks for a goal (used when creating a new goal with scaffolding)"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if goal exists
        existing_goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        if not existing_goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        data = request.get_json()
        current_app.logger.info(f"Received data for goal {goal_id}: {data}")
        current_app.logger.info(f"Tasks data: {data.get('tasks', [])}")
        for i, task in enumerate(data.get('tasks', [])):
            current_app.logger.info(f"Task {i}: {task}")
            current_app.logger.info(f"Task {i} subtasks: {task.get('subtasks', [])}")
        
        if not data or 'tasks' not in data:
            return jsonify({'error': 'Tasks are required'}), 400
        
        # Instead of deleting existing rows, we'll keep them and just add new ones
        # Get reference goal data from an existing row
        reference_goal = existing_goals[0]
        
        # Create new rows for each task and subtask
        new_rows = []
        
        for task_data in data['tasks']:
            task_id = str(uuid.uuid4())
            task_title = task_data.get('task_title', 'New Task')
            task_descr = task_data.get('task_descr', '')
            task_completed = task_data.get('completed', False)
            task_due_date = task_data.get('scheduledDate', None)
            
            current_app.logger.info(f"Processing task: {task_title}")
            
            if 'subtasks' in task_data and task_data['subtasks']:
                for subtask_data in task_data['subtasks']:
                    subtask_descr = subtask_data.get('subtask_descr', 'New Subtask')
                    subtask_type = subtask_data.get('subtask_type', 'other')
                    subtask_completed = subtask_data.get('subtask_completed', False)
                    
                    current_app.logger.info(f"Adding subtask: {subtask_descr} for task: {task_title}")
                    
                    subtask = Goal(
                        user_id=user_id,
                        course_id=reference_goal.course_id,
                        goal_id=goal_id,
                        goal_descr=reference_goal.goal_descr,
                        due_date=reference_goal.due_date,
                        goal_completed=reference_goal.goal_completed,
                        task_id=task_id,
                        task_title=task_title,
                        task_descr=task_descr,
                        task_completed=task_completed,
                        subtask_id=str(uuid.uuid4()),
                        subtask_descr=subtask_descr,
                        subtask_type=subtask_type,
                        subtask_completed=subtask_completed,
                        task_due_date=task_due_date,
                        subtask_order=subtask_data.get('subtask_order', None)
                    )
                    db.session.add(subtask)
                    new_rows.append(subtask)
            else:
                # Create a placeholder row for a task with no subtasks
                current_app.logger.info(f"No subtasks provided for task: {task_title}, creating placeholder row")
                placeholder = Goal(
                    user_id=user_id,
                    course_id=reference_goal.course_id,
                    goal_id=goal_id,
                    goal_descr=reference_goal.goal_descr,
                    due_date=reference_goal.due_date,
                    goal_completed=reference_goal.goal_completed,
                    task_id=task_id,
                    task_title=task_title,
                    task_descr=task_descr,
                    task_completed=task_completed,
                    subtask_id='placeholder',
                    subtask_descr='',
                    subtask_type='other',
                    subtask_completed=False,
                    task_due_date=task_due_date,
                    subtask_order=0
                )
                db.session.add(placeholder)
                new_rows.append(placeholder)
        
        db.session.commit()
        
        # Return the created rows
        result = [row.to_dict() for row in new_rows]
        return jsonify(result), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving tasks: {str(e)}")
        return jsonify({'error': 'An error occurred while saving tasks'}), 500


@goals_bp.route('/api/goals/<goal_id>/tasks/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(goal_id, task_id):
    """Delete a task and all its subtasks"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if goal exists
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        if not goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Get all rows for this task
        task_rows = Goal.query.filter_by(goal_id=goal_id, task_id=task_id, user_id=user_id).all()
        if not task_rows:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Delete from Google Calendar if the task has a Google Calendar event
        # Queue deletion of all subtask events for this task
        for row in task_rows:
            if row.google_event_id and row.sync_status == "Synced":
                queue_google_calendar_sync("delete", user_id, row.task_id, row.course_id, row.google_event_id)
                print(f"🔄 Queued Google Calendar deletion for task {task_id}")
                break  # Only need to delete once since it's the same event
        
        # Delete all rows for this task
        for row in task_rows:
            db.session.delete(row)
        db.session.commit()
        
        return jsonify({"message": "Task deleted successfully"}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting task: {str(e)}")
        return jsonify({'error': 'An error occurred while deleting the task'}), 500


@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>', methods=['DELETE'])
@jwt_required()
def delete_subtask(subtask_id):
    """Delete a specific subtask"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the subtask
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # Store goal_id and task_id for reference
        goal_id = subtask.goal_id
        task_id = subtask.task_id
        was_completed = subtask.subtask_completed
        
        # Get all rows for this task
        task_rows = Goal.query.filter_by(goal_id=goal_id, task_id=task_id, user_id=user_id).all()
        if not task_rows:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Delete the subtask
        db.session.delete(subtask)
        # Reindex subtask_order for all remaining subtasks of this task
        reindex_subtasks(task_id, user_id)
        db.session.commit()
        
        # If the deleted subtask was completed, check if the task should now be incomplete
        if was_completed:
            remaining_subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
            real_subtasks = [s for s in remaining_subtasks if s.subtask_id != 'placeholder']
            if not real_subtasks or any(not s.subtask_completed for s in real_subtasks):
                for row in remaining_subtasks:
                    row.task_completed = False
                    row.updated_at = datetime.utcnow()
                db.session.commit()
        
        # Queue the specific subtask event deletion from Google Calendar
        if subtask.google_event_id and subtask.sync_status == "Synced":
            queue_google_calendar_sync("delete", user_id, subtask.task_id, subtask.course_id, subtask.google_event_id)
            print(f"🔄 Queued Google Calendar deletion for subtask {subtask.subtask_id}")
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Subtask deleted successfully",
            "deleted_subtask_id": subtask_id
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while deleting the subtask'}), 500

# call this when moving a created subtask elsewhere in the google calendar
@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>', methods=['PUT'])
@jwt_required()
def update_subtask(subtask_id):
    """Update a subtask"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        data = request.get_json()
        
        # Update subtask fields
        if 'subtask_descr' in data:
            subtask.subtask_descr = data['subtask_descr']
        
        if 'subtask_type' in data:
            subtask.subtask_type = data['subtask_type']
        
        if 'subtask_order' in data:
            subtask.subtask_order = data['subtask_order']
        
        # Parse and convert times to UTC for storage
        if 'subtask_start_time' in data:
            try:
                # Parse the ISO string - it's already in UTC from frontend
                start_time = datetime.fromisoformat(data['subtask_start_time'].replace('Z', '+00:00'))
                # Ensure it's in UTC
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                else:
                    start_time = start_time.astimezone(timezone.utc)
                subtask.start_time = start_time
            except Exception as e:
                current_app.logger.error(f"Error parsing start_time: {data['subtask_start_time']}, error: {e}")
        
        if 'subtask_end_time' in data:
            try:
                # Parse the ISO string - it's already in UTC from frontend
                end_time = datetime.fromisoformat(data['subtask_end_time'].replace('Z', '+00:00'))
                # Ensure it's in UTC
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
                else:
                    end_time = end_time.astimezone(timezone.utc)
                subtask.end_time = end_time
            except Exception as e:
                current_app.logger.error(f"Error parsing end_time: {data['subtask_end_time']}, error: {e}")
        
        if 'time_spent_seconds' in data:
            subtask.task_actual_time_seconds = data['time_spent_seconds']
        
        if 'subtask_completed' in data:
            subtask.subtask_completed = data['subtask_completed']
            
            # When subtask is toggled, update both task_completed and subtask_completed for this subtask
            subtask.task_completed = data['subtask_completed']
            subtask.updated_at = datetime.utcnow()
            
            # Now get fresh data for this task after the update
            task_rows = Goal.query.filter_by(task_id=subtask.task_id, user_id=user_id).all()
            
            # Check if all subtasks are completed to update task completion status
            all_subtasks_completed = all(row.subtask_completed for row in task_rows)
            
            # Update task_completed for all rows of this task based on subtask completion
            for row in task_rows:
                row.task_completed = all_subtasks_completed
                row.updated_at = datetime.utcnow()
            
            # Get all rows for this goal
            goal_rows = Goal.query.filter_by(goal_id=subtask.goal_id, user_id=user_id).all()
            
            # Get unique task IDs and their completion status
            task_completion_map = {}
            for row in goal_rows:
                if row.task_id not in task_completion_map:
                    task_completion_map[row.task_id] = row.task_completed
            
            # Check if all tasks are completed
            all_tasks_completed = all(task_completion_map.values())
        
            # Update goal completion status for all rows
            for row in goal_rows:
                row.goal_completed = all_tasks_completed
                row.updated_at = datetime.utcnow()
        
        if 'bypass_due_date' in data:
            subtask.is_conflicting = bool(data.get('bypass_due_date'))
        
        subtask.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Now that the subtask is updated, queue Google Calendar sync
        if subtask.start_time and subtask.end_time:
            queue_google_calendar_sync("sync", user_id, subtask.task_id, subtask.course_id)
            print(f"🔄 Queued Google Calendar sync for updated subtask {subtask.subtask_id}")
        else:
            print(f"⚠️  Skipping Google Calendar sync for subtask {subtask.subtask_id}: No start/end times")
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Subtask updated successfully",
            "subtask": subtask.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the subtask'}), 500

# call this when adding a new subtask
# new -- add a check to flag the subtask as a conflict or not
@goals_bp.route('/api/goals/tasks/<task_id>/subtasks', methods=['POST'])
@jwt_required()
def create_subtask(task_id):
    """Create a new subtask for a task"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if task exists and belongs to the user
        task_rows = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
        
        if not task_rows:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        data = request.get_json()
        
        # Debug logging
        print(f"Creating subtask for task {task_id} with data: {data}")
        
        if not data or 'subtask_descr' not in data:
            return jsonify({'error': 'Subtask description is required'}), 400
        
        # Use the first row to get goal and task info
        task_row = task_rows[0]
        
        # Create a new subtask
        subtask_id = str(uuid.uuid4())
        
        # Handle task_due_date - use the one from request if provided, otherwise use task's due_date
        task_due_date = None
        
        # First, try to get the task_due_date from the placeholder row for this task
        placeholder_row = Goal.query.filter_by(task_id=task_id, user_id=user_id, subtask_id='placeholder').first()
        if placeholder_row and placeholder_row.task_due_date:
            task_due_date = placeholder_row.task_due_date
            print(f"Using task_due_date from placeholder row: {task_due_date}")
        
        # If no placeholder row or no task_due_date in placeholder, use the request data
        if not task_due_date and 'task_due_date' in data and data['task_due_date']:
            try:
                if isinstance(data['task_due_date'], str):
                    # Handle different date formats
                    if 'T' in data['task_due_date']:
                        task_due_date = datetime.fromisoformat(data['task_due_date'].replace('Z', '+00:00'))
                    else:
                        # Assume YYYY-MM-DD format
                        task_due_date = datetime.fromisoformat(data['task_due_date'] + 'T00:00:00')
                else:
                    task_due_date = data['task_due_date']
            except Exception as e:
                current_app.logger.error(f"Error parsing task_due_date: {data['task_due_date']}, error: {e}")
                task_due_date = task_row.task_due_date if hasattr(task_row, 'task_due_date') and task_row.task_due_date else task_row.due_date
        
        # If still no task_due_date, use the task's due_date
        if not task_due_date:
            task_due_date = task_row.task_due_date if hasattr(task_row, 'task_due_date') and task_row.task_due_date else task_row.due_date
        
        # Get all existing subtask orders for this task
        existing_orders = get_subtask_orders_for_task(task_id, user_id)
        if existing_orders:
            subtask_order = max(existing_orders) + 1
        else:
            subtask_order = 0
        
        # Debug logging
        print(f"Task due date: {task_due_date}")
        print(f"Subtask order: {subtask_order}")
        print(f"Task due date type: {type(task_due_date)}")
        print(f"Subtask order type: {type(subtask_order)}")
        
        # Parse and convert times to UTC for storage
        start_time = None
        end_time = None
        
        if data.get('subtask_start_time'):
            try:
                # Parse the ISO string - it's already in UTC from frontend
                start_time = datetime.fromisoformat(data['subtask_start_time'].replace('Z', '+00:00'))
                # Ensure it's in UTC
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                else:
                    start_time = start_time.astimezone(timezone.utc)
            except Exception as e:
                current_app.logger.error(f"Error parsing start_time: {data['subtask_start_time']}, error: {e}")
        
        if data.get('subtask_end_time'):
            try:
                # Parse the ISO string - it's already in UTC from frontend
                end_time = datetime.fromisoformat(data['subtask_end_time'].replace('Z', '+00:00'))
                # Ensure it's in UTC
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
                else:
                    end_time = end_time.astimezone(timezone.utc)
            except Exception as e:
                current_app.logger.error(f"Error parsing end_time: {data['subtask_end_time']}, error: {e}")
        
        new_subtask = Goal(
            user_id=user_id,
            course_id=task_row.course_id,
            goal_id=task_row.goal_id,
            goal_descr=task_row.goal_descr,
            due_date=task_row.due_date,
            task_due_date=task_due_date,
            goal_completed=task_row.goal_completed,
            task_id=task_id,
            task_title=task_row.task_title,
            task_descr=task_row.task_descr,
            task_completed=task_row.task_completed,
            subtask_id=subtask_id,
            subtask_descr=data['subtask_descr'],
            subtask_type=data.get('subtask_type', 'other'),
            subtask_completed=data.get('subtask_completed', False),
            start_time=start_time,
            end_time=end_time,
            subtask_order=subtask_order,
            is_conflicting=data.get('bypass_due_date', False)
        )
        
        db.session.add(new_subtask)
        db.session.commit()
        
        # After commit, update parent task completion if needed
        task_rows = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
        real_subtasks = [row for row in task_rows if row.subtask_id != 'placeholder']
        all_real_subtasks_completed = bool(real_subtasks) and all(row.subtask_completed for row in real_subtasks)
        for row in task_rows:
            row.task_completed = all_real_subtasks_completed
            row.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Now that the subtask is saved, queue Google Calendar sync
        if new_subtask.start_time and new_subtask.end_time:
            queue_google_calendar_sync("sync", user_id, new_subtask.task_id, new_subtask.course_id)
            print(f"🔄 Queued Google Calendar sync for new subtask {new_subtask.subtask_id}")
        else:
            print(f"⚠️  Skipping Google Calendar sync for subtask {new_subtask.subtask_id}: No start/end times")
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Subtask created successfully",
            "subtask": {
                "subtask_id": new_subtask.subtask_id,
                "subtask_descr": new_subtask.subtask_descr,
                "subtask_completed": new_subtask.subtask_completed,
                "subtask_order": new_subtask.subtask_order
            }
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while creating the subtask'}), 500

# Canvas-style time tracking endpoints
@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>/start-engagement', methods=['POST'])
@jwt_required()
def start_subtask_engagement(subtask_id):
    """Start tracking engagement for a subtask (Canvas-style)"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # If this is a resume (we have previous engagement data), accumulate the time
        if subtask.subtask_engagement_start and subtask.subtask_engagement_end and subtask.subtask_total_active_minutes:
            # Calculate time from the previous session
            previous_session_time = subtask.subtask_total_active_minutes
            # Keep the accumulated time and set new start time
            subtask.subtask_total_active_minutes = previous_session_time
        else:
            # First time starting, initialize to 0
            subtask.subtask_total_active_minutes = 0.0
        
        # Set engagement start time to now (for the new session)
        subtask.subtask_engagement_start = datetime.now(timezone.utc)
        subtask.subtask_last_interaction = datetime.now(timezone.utc)
        subtask.subtask_engagement_end = None  # Clear the end time for the new session
        subtask.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": "Subtask engagement started",
            "subtask": subtask.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting subtask engagement: {str(e)}")
        return jsonify({'error': 'An error occurred while starting engagement'}), 500

@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>/update-interaction', methods=['POST'])
@jwt_required()
def update_subtask_interaction(subtask_id):
    """Update last interaction time for a subtask (Canvas-style)"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # Update last interaction time
        subtask.subtask_last_interaction = datetime.now(timezone.utc)
        subtask.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            "message": "Subtask interaction updated",
            "subtask": subtask.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating subtask interaction: {str(e)}")
        return jsonify({'error': 'An error occurred while updating interaction'}), 500

@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>/end-engagement', methods=['POST'])
@jwt_required()
def end_subtask_engagement(subtask_id):
    """End engagement tracking for a subtask and calculate total time (Canvas-style)"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # Set engagement end time to now
        subtask.subtask_engagement_end = datetime.now(timezone.utc)
        subtask.updated_at = datetime.now(timezone.utc)
        
        # Calculate total active time if we have start and end times
        if subtask.subtask_engagement_start and subtask.subtask_engagement_end:
            time_diff = subtask.subtask_engagement_end - subtask.subtask_engagement_start
            current_session_minutes = time_diff.total_seconds() / 60.0  # Convert to minutes
            
            # Accumulate with previous sessions
            previous_total = subtask.subtask_total_active_minutes or 0.0
            subtask.subtask_total_active_minutes = previous_total + current_session_minutes
        
        db.session.commit()
        
        return jsonify({
            "message": "Subtask engagement ended",
            "subtask": subtask.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error ending subtask engagement: {str(e)}")
        return jsonify({'error': 'An error occurred while ending engagement'}), 500

@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>/time-data', methods=['GET'])
@jwt_required()
def get_subtask_time_data(subtask_id):
    """Get Canvas-style time data for a subtask"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # Format the time data similar to Canvas
        time_data = {
            "subtask_id": subtask.subtask_id,
            "subtask_name": subtask.subtask_descr,
            "started": subtask.subtask_engagement_start.isoformat() if subtask.subtask_engagement_start else None,
            "last_changed": subtask.subtask_last_interaction.isoformat() if subtask.subtask_last_interaction else None,
            "total_time_minutes": subtask.subtask_total_active_minutes or 0.0,
            "is_currently_engaged": subtask.subtask_engagement_start and not subtask.subtask_engagement_end
        }
        
        return jsonify(time_data), 200
        
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting subtask time data: {str(e)}")
        return jsonify({'error': 'An error occurred while getting time data'}), 500


@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>/set-completion-time', methods=['POST'])
@jwt_required()
def set_subtask_completion_time(subtask_id):
    """Manually set completion time for a subtask when no engagement tracking was used"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the subtask row
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        # Get completion time from request
        data = request.get_json()
        completion_time_minutes = data.get('completion_time_minutes')
        
        if not completion_time_minutes or completion_time_minutes <= 0:
            return jsonify({'error': 'Valid completion time is required'}), 400
        
        # Set the completion time
        subtask.subtask_total_active_minutes = completion_time_minutes
        subtask.subtask_engagement_start = datetime.now(timezone.utc) - timedelta(minutes=completion_time_minutes)
        subtask.subtask_last_interaction = datetime.now(timezone.utc)
        subtask.subtask_engagement_end = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Completion time set successfully',
            'completion_time_minutes': completion_time_minutes
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error setting completion time: {str(e)}")
        return jsonify({'error': 'An error occurred while setting completion time'}), 500


@goals_bp.route('/api/goals/<goal_id>/create-empty-task', methods=['POST'])
@jwt_required()
def create_empty_task(goal_id):
    """Create an empty task for a goal when there are no tasks"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Check if goal exists
        existing_goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        if not existing_goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Delete any placeholder rows
        placeholder_rows = [goal for goal in existing_goals if goal.task_id == 'placeholder']
        for placeholder in placeholder_rows:
            db.session.delete(placeholder)
        
        # Get reference goal data from an existing row (non-placeholder)
        reference_goal = next((goal for goal in existing_goals if goal.task_id != 'placeholder'), existing_goals[0])
        
        # Create a new task with a default subtask
        task_id = str(uuid.uuid4())
        subtask_id = str(uuid.uuid4())
        
        new_task = Goal(
            user_id=user_id,
            course_id=reference_goal.course_id,
            goal_id=goal_id,
            goal_descr=reference_goal.goal_descr,
            due_date=reference_goal.due_date,
            goal_completed=reference_goal.goal_completed,
            task_id=task_id,
            task_title="New Task",
            task_descr="",
            task_completed=False,
            subtask_id=subtask_id,
            subtask_descr="Default Subtask",
            subtask_type="other",
            subtask_completed=False
        )
        
        db.session.add(new_task)
        db.session.commit()
        
        # Queue Google Calendar sync in background
        queue_google_calendar_sync("sync", user_id, new_task.task_id, new_task.course_id)
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Empty task created successfully",
            "task": {
                "task_id": new_task.task_id,
                "task_title": new_task.task_title,
                "task_completed": new_task.task_completed
            }
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating empty task: {str(e)}")
        return jsonify({'error': 'An error occurred while creating empty task'}), 500


# current approach -- get all rows that have scheduled start and times (these are subtasks)
@goals_bp.route("/api/goals/subtasks", methods=["GET"])
@jwt_required()                               # still requires a valid JWT
def get_subtasks_by_user():
    # we ignore the real identity for test mode
    user = get_jwt_identity()

    try:
        goals = Goal.query.filter_by(user_id=user).all()

        # Only keep rows with both start_time and end_time (calendar events)
        calendar_goals = [g for g in goals if getattr(g, 'start_time', None) and getattr(g, 'end_time', None)]

        # -------- group by end_date --------
        grouped: dict[str, list[dict]] = defaultdict(list)

        for g in calendar_goals:
            # For calendar events, use start_time for grouping
            end_dt = g.start_time
            if end_dt is None:
                key = "unscheduled"
            else:
                # Ensure we serialize to plain YYYY-MM-DD
                if isinstance(end_dt, datetime):
                    key = end_dt.date().isoformat()
                elif isinstance(end_dt, date):
                    key = end_dt.isoformat()
                else:                               # already a str or something
                    key = str(end_dt)

            grouped[key].append(g.to_dict())

        # optional: sort the dict by date keys for stable output
        grouped_sorted = dict(sorted(grouped.items()))

        return jsonify(grouped_sorted), 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting user goals: {e}")
        return jsonify({"error": "An error occurred while getting user goals"}), 500


@goals_bp.route("/api/goals/tasks", methods = ["GET"])
@jwt_required()
def get_tasks_by_user():
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        all_rows = Goal.query.filter_by(user_id = user_id).all()
        
        # Remove any rows where task_id is "placeholder"
        all_rows = [row for row in all_rows if getattr(row, "task_id", None) != "placeholder"]
        
        # Remove any rows where goal_id is "Google Calendar" 
        all_rows = [row for row in all_rows if getattr(row, "goal_id", None) != "Google Calendar"]
        
        # Return a map of task_title to task_id
        # Build a dictionary mapping task_title to task_id, only for unique tasks
        task_map = {}
        for row in all_rows:
            # Only add if task_title and task_id are present and not already in the map
            if getattr(row, "task_title", None) and getattr(row, "task_id", None):
                if row.task_title not in task_map:
                    task_map[row.task_title] = row.task_id
        return jsonify(task_map), 200
        
        # Get all tasks
    except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error: {str(e)}")
            return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating task: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the task'}), 500        


@goals_bp.route("/api/goals/tasks/<task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    """Update a task row, mirror completion to subtasks,
    and mark the entire goal complete when all tasks are done."""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get the task row - use the authenticated user's ID
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        data = request.get_json()
        
        now = datetime.utcnow()
        
        if 'task_title' in data:
            task.task_title = data['task_title']
        
        if 'task_descr' in data:
            task.task_descr = data['task_descr']
        
        if 'task_due_date' in data:
            task.task_due_date = data['task_due_date']
            
            # update due date for all subtasks
            subtasks: list[Goal] = Goal.query.filter_by(task_id=task.task_id, user_id=user_id).all()
            for subtask in subtasks:
                subtask.task_due_date = data['task_due_date']
                subtask.updated_at = now
        
        if 'task_completed' in data:
            task.task_completed = data['task_completed']
            
            # When marking task as complete, set both task_completed and subtask_completed to true for all subtask rows
            # When marking task as incomplete, set task_completed to false for all subtask rows, keep subtask_completed unchanged
            subtask_rows: list[Goal] = Goal.query.filter_by(task_id=task.task_id, user_id=user_id).all()
            
            if task.task_completed:
                # mark all subtasks as completed when task is completed
                for row in subtask_rows:
                    row.subtask_completed = True
                    row.task_completed = True
                    row.updated_at = now
            else:
                # When task is marked as incomplete, set task_completed to false for all subtask rows
                # but keep subtask_completed unchanged
                for row in subtask_rows:
                    row.task_completed = False
                    row.updated_at = now
            
            # update goal completion status based on current task completion states
            goal_rows: list[Goal] = Goal.query.filter_by(goal_id=task.goal_id, user_id=user_id).all()
            
            # Get unique task IDs and their completion status
            task_completion_map = {}
            for row in goal_rows:
                if row.task_id not in task_completion_map and row.task_id != 'placeholder':
                    task_completion_map[row.task_id] = row.task_completed
            
            # Check if all tasks are completed
            all_tasks_completed = all(task_completion_map.values())
            
            # Update goal completion status for all rows
            for row in goal_rows:
                row.goal_completed = all_tasks_completed
                row.updated_at = now
        
        task.updated_at = now
        db.session.commit()
        
        # Queue Google Calendar sync in background
        queue_google_calendar_sync("sync", user_id, task.task_id, task.course_id)
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Task updated successfully",
            "task": {
                "task_id": task.task_id,
                "task_title": task.task_title,
                "task_descr": task.task_descr,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "task_completed": task.task_completed,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None
            }
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating task: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the task'}), 500

@goals_bp.route("/api/goals/<goal_id>/create-task", methods=["POST"])
@jwt_required()
def create_task(goal_id):
    """Create a new task for a goal, with one or more subtasks."""
    try:
        user_id = get_jwt_identity()
        # Check if goal exists
        existing_goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        if not existing_goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        data = request.get_json()
        if not data or 'task_title' not in data or 'task_due_date' not in data:
            return jsonify({'error': 'Task title and due date are required'}), 400

        task_id = str(uuid.uuid4())
        task_title = data.get('task_title')
        task_descr = data.get('task_descr', '')
        task_due_date = data.get('task_due_date', None)
        # Default to False unless explicitly set
        task_completed = data.get('task_completed', False)

        # Use the first goal row as a reference for goal fields
        ref_goal = existing_goals[0]

        created_rows = []

        subtasks = data.get('subtasks', [])
        if subtasks:
            for subtask in subtasks:
                subtask_descr = subtask.get('subtask_descr', 'Initial step')
                subtask_type = subtask.get('subtask_type', 'other')
                subtask_completed = subtask.get('subtask_completed', False)
                new_row = Goal(
            user_id=user_id,
                    course_id=ref_goal.course_id,
                    goal_id=goal_id,
                    goal_descr=ref_goal.goal_descr,
                    due_date=task_due_date,
                    task_due_date=task_due_date,
                    goal_completed=ref_goal.goal_completed,
            task_id=task_id,
                    task_title=task_title,
                    task_descr=task_descr,
                    task_completed=task_completed,
            subtask_id=str(uuid.uuid4()),
                    subtask_descr=subtask_descr,
                    subtask_type=subtask_type,
                    subtask_completed=subtask_completed,
                    subtask_order=subtask.get('subtask_order', None)
                )
                db.session.add(new_row)
                created_rows.append(new_row)
        else:
            # Create a default subtask if none provided
            new_row = Goal(
                user_id=user_id,
                course_id=ref_goal.course_id,
                goal_id=goal_id,
                goal_descr=ref_goal.goal_descr,
                due_date=task_due_date,
                task_due_date=task_due_date,
                goal_completed=ref_goal.goal_completed,
                task_id=task_id,
                task_title=task_title,
                task_descr=task_descr,
                task_completed=task_completed,
                subtask_id=str(uuid.uuid4()),
                subtask_descr='Initial step',
                subtask_type='other',
                subtask_completed=False,
                subtask_order=0
            )
            db.session.add(new_row)
            created_rows.append(new_row)

        db.session.commit()
        
        # After commit, update parent task completion if needed
        task_rows = Goal.query.filter_by(task_id=task_id, user_id=user_id).all()
        real_subtasks = [row for row in task_rows if row.subtask_id != 'placeholder']
        all_real_subtasks_completed = bool(real_subtasks) and all(row.subtask_completed for row in real_subtasks)
        for row in task_rows:
            row.task_completed = all_real_subtasks_completed
            row.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Now that all subtasks are saved, queue Google Calendar sync
        for subtask in created_rows:
            if subtask.start_time and subtask.end_time:
                queue_google_calendar_sync("sync", user_id, subtask.task_id, subtask.course_id)
                print(f"🔄 Queued Google Calendar sync for subtask {subtask.subtask_id}")
            else:
                print(f"⚠️  Skipping Google Calendar sync for subtask {subtask.subtask_id}: No start/end times")
        
        print(f"🔄 Queued Google Calendar sync for {len([s for s in created_rows if s.start_time and s.end_time])} subtasks")
        
        # Return success immediately - Google Calendar sync will happen in background
        return jsonify({
            "message": "Task created successfully",
            "created_rows": len(created_rows),
            "task_id": task_id
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating task: {str(e)}")
        return jsonify({'error': 'An error occurred while creating the task'}), 500


@goals_bp.route("/api/goals/test-sync", methods=["POST"])
@jwt_required()
def test_background_sync():
    """Test endpoint to verify background sync is working"""
    try:
        current_user_id = get_jwt_identity()
        
        # Queue a test sync task
        queue_google_calendar_sync("sync", current_user_id, "test-task-id", "test-course-id")
        
        return jsonify({
            "message": "Test sync task queued successfully",
            "queue_size": sync_queue.qsize(),
            "worker_alive": sync_thread.is_alive() if sync_thread else False
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Test sync failed: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Helper to reindex subtask_order for all subtasks of a task

def reindex_subtasks(task_id, user_id):
    from app.models.goal import Goal
    from sqlalchemy import asc
    subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).order_by(asc(Goal.subtask_order), asc(Goal.created_at)).all()
    for idx, subtask in enumerate(subtasks):
        subtask.subtask_order = idx
    db.session.commit()

# Helper to get all subtask orders for a task
def get_subtask_orders_for_task(task_id, user_id):
    """Get all subtask_order values for a given task, sorted in ascending order"""
    from app.models.goal import Goal
    from sqlalchemy import asc
    subtasks = Goal.query.filter_by(task_id=task_id, user_id=user_id).order_by(asc(Goal.subtask_order)).all()
    orders = [subtask.subtask_order for subtask in subtasks if subtask.subtask_order is not None]
    return sorted(orders)

@goals_bp.route("/api/goals/checklist", methods=["GET"])
@jwt_required()
def get_checklist():
    """Return tasks for the checklist: today, overdue, or upcoming (excluding Google Calendar events)."""
    user_id = get_jwt_identity()
    try:
        # Get filter type from query param: 'today', 'overdue', 'upcoming' (default: today)
        filter_type = request.args.get("type", "today")
        now = datetime.now(timezone.utc)
        today = now.date()

        # Get all tasks for the user that are not Google Calendar events and not completed
        tasks = Goal.query.filter(
            Goal.user_id == user_id,
            Goal.goal_id != "Google Calendar",
            Goal.task_completed == False,
        ).all()

        filtered_tasks = []
        for t in tasks:
            due = None
            if t.task_due_date:
                due = t.task_due_date.date()
            elif t.due_date:
                due = t.due_date.date()
            else:
                continue  # skip if no due date

            if filter_type == "today" and due == today:
                filtered_tasks.append(t.to_dict())
            elif filter_type == "overdue" and due < today:
                filtered_tasks.append(t.to_dict())
            elif filter_type == "upcoming" and due > today:
                filtered_tasks.append(t.to_dict())

        # Optionally sort by due date ascending
        filtered_tasks.sort(key=lambda x: x.get("task_due_date") or x.get("due_date") or "")
        return jsonify(filtered_tasks), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching checklist: {e}")
        return jsonify({"error": "An error occurred"}), 500