from collections import defaultdict
from flask import Blueprint, request, jsonify, current_app, g
from datetime import date, datetime, timezone
import uuid
from app.models.goal import Goal
from app.models.course import Course
from app.init import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

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
            return jsonify({'error': 'Course not found or you do not have access'}), 404

        # Get all rows for this course
        goals = Goal.query.filter_by(course_id=course_id, user_id=user_id).all()
        
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
        
        data = request.get_json()
        
        if not data or 'goal_descr' not in data:
            return jsonify({'error': 'Goal description is required'}), 400
        
        # Create a new goal with initial task and subtask
        goal_descr = data['goal_descr']
        due_date = datetime.fromisoformat(data['due_date']) if 'due_date' in data and data['due_date'] else None
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
                            course_id=course_id,
                            goal_id=goal_id,
                            goal_descr=goal_descr,
                            due_date=due_date,
                            task_id=task_id,
                            task_title=task_title,
                            task_descr=task_descr,
                            subtask_id=str(uuid.uuid4()),
                            subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                            subtask_type=subtask_data.get('subtask_type', 'other')
                        )
                        rows_to_add.append(subtask)
                else:
                    # Create a default subtask if none provided
                    subtask = Goal(
                        user_id=user_id,
                        course_id=course_id,
                        goal_id=goal_id,
                        goal_descr=goal_descr,
                        due_date=due_date,
                        task_id=task_id,
                        task_title=task_title,
                        task_descr=task_descr,
                        subtask_id=str(uuid.uuid4()),
                        subtask_descr='Default Subtask',
                        subtask_type='other'
                    )
                    rows_to_add.append(subtask)
        elif not skip_default_task:
            # Create default task and subtask if none provided and not skipping default task
            new_goal, _, _ = Goal.create_for_goal(
                user_id=user_id,
                course_id=course_id,
                goal_descr=goal_descr,
                due_date=due_date
            )
            rows_to_add.append(new_goal)
        else:
            # Create a placeholder row with just the goal information
            placeholder_goal = Goal(
                user_id=user_id,
                course_id=course_id,
                goal_id=goal_id,
                goal_descr=goal_descr,
                due_date=due_date,
                task_id='placeholder',
                task_title='',
                task_descr='',
                subtask_id='placeholder',
                subtask_descr='',
                subtask_type='other'
            )
            rows_to_add.append(placeholder_goal)
        
        # Add all rows to the database
        for row in rows_to_add:
            db.session.add(row)
        
        db.session.commit()
        
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
                                    subtask_completed=subtask_data.get('subtask_completed', False)
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
                                subtask_completed=subtask_data.get('subtask_completed', False)
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
                            subtask_completed=False
                        )
                        db.session.add(new_subtask)
            
            # Instead of deleting tasks that weren't in the update, we'll keep them
            # This allows for incremental additions without losing existing data
            
            # Check if all tasks are completed to update goal completion status
            if updated_task_ids:
                all_tasks_completed = True
                for task_id in updated_task_ids:
                    task_rows = [g for g in goals if g.task_id == task_id]
                    if not all(g.task_completed for g in task_rows):
                        all_tasks_completed = False
                        break
                
                # Update goal completion status
                for g in goals:
                    g.goal_completed = all_tasks_completed
        
        db.session.commit()
        
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
        
        # Debug logging
        print(f"🔍 Delete Goal Debug - Goal ID: {goal_id}")
        print(f"🔍 Delete Goal Debug - User ID: {user_id}")
        print(f"🔍 Delete Goal Debug - Authorization header: {request.headers.get('Authorization', 'Not found')}")
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        print(f"🔍 Delete Goal Debug - Goals found: {len(goals)}")
        
        if not goals:
            print(f"🔍 Delete Goal Debug - No goals found for goal_id: {goal_id} and user_id: {user_id}")
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Delete all rows for this goal
        for goal in goals:
            db.session.delete(goal)
        
        db.session.commit()
        
        print(f"🔍 Delete Goal Debug - Successfully deleted goal: {goal_id}")
        return jsonify({'message': 'Goal deleted successfully'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        print(f"🔍 Delete Goal Debug - Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting goal: {str(e)}")
        print(f"🔍 Delete Goal Debug - Exception: {str(e)}")
        return jsonify({'error': 'An error occurred while deleting the goal'}), 500


@goals_bp.route('/api/goals/<goal_id>/tasks', methods=['GET'])
@jwt_required()
def get_goal_tasks(goal_id):
    """Get all tasks for a specific goal"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
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
    """Update tasks for a goal"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all rows for this goal
        goals = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        if not goals:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        data = request.get_json()
        if not data or 'tasks' not in data:
            return jsonify({'error': 'Tasks are required'}), 400
        
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
                                subtask_completed=subtask_data.get('subtask_completed', False)
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
                            subtask_completed=subtask_data.get('subtask_completed', False)
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
                        subtask_completed=False
                    )
                    db.session.add(new_subtask)
        
        # Instead of deleting tasks that weren't in the update, we'll keep them
        # This allows for incremental additions without losing existing data
        
        # Check if all tasks are completed to update goal completion status
        if updated_task_ids:
            all_tasks_completed = True
            for task_id in updated_task_ids:
                task_rows = [g for g in goals if g.task_id == task_id]
                if not all(g.task_completed for g in task_rows):
                    all_tasks_completed = False
                    break
            
            # Update goal completion status
            for g in goals:
                g.goal_completed = all_tasks_completed
        
        db.session.commit()
        
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
                        subtask_completed=subtask_completed
                    )
                    db.session.add(subtask)
                    new_rows.append(subtask)
            else:
                # Create a default subtask if none provided
                current_app.logger.info(f"No subtasks provided for task: {task_title}, creating default")
                
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
                    subtask_descr='Default Subtask',
                    subtask_type='other',
                    subtask_completed=False
                )
                db.session.add(subtask)
                new_rows.append(subtask)
        
        db.session.commit()
        
        # Return the created rows
        result = [row.to_dict() for row in new_rows]
        current_app.logger.info(f"Created {len(new_rows)} rows for goal {goal_id}")
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
    """Delete a specific task and all its subtasks"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task
        task = Goal.query.filter_by(goal_id=goal_id, task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Delete all subtasks for this task
        subtasks = Goal.query.filter_by(goal_id=goal_id, task_id=task_id, user_id=user_id).all()
        for subtask in subtasks:
            db.session.delete(subtask)
        
        db.session.commit()
        
        current_app.logger.info(f"Deleted task {task_id} from goal {goal_id}")
        
        return jsonify({
            'message': 'Task deleted successfully',
            'deleted_subtasks': len(subtasks)
        }), 200
        
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
        
        # Delete the subtask
        db.session.delete(subtask)
        db.session.commit()
        
        # Check if this was the last subtask for the task
        remaining_subtasks = Goal.query.filter_by(goal_id=goal_id, task_id=task_id).count()
        
        current_app.logger.info(f"Deleted subtask {subtask_id} from task {task_id}, remaining subtasks: {remaining_subtasks}")
        
        return jsonify({
            'message': 'Subtask deleted successfully',
            'remaining_subtasks': remaining_subtasks
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while deleting the subtask'}), 500


@goals_bp.route('/api/goals/tasks/subtasks/<subtask_id>', methods=['PUT'])
@jwt_required()
def update_subtask(subtask_id):
    """Update a specific subtask"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the subtask
        subtask = Goal.query.filter_by(subtask_id=subtask_id, user_id=user_id).first()
        if not subtask:
            return jsonify({'error': 'Subtask not found or you do not have access'}), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'subtask_descr' in data:
            subtask.subtask_descr = data['subtask_descr']
        if 'subtask_type' in data:
            subtask.subtask_type = data['subtask_type']
        if 'subtask_completed' in data:
            subtask.subtask_completed = data['subtask_completed']
            
        db.session.commit()
        
        # Check if all subtasks in the task are completed to update task completion
        task_subtasks = Goal.query.filter_by(task_id=subtask.task_id, user_id=user_id).all()
        all_subtasks_completed = all(st.subtask_completed for st in task_subtasks)
        
        # Update task completion status
        for task_subtask in task_subtasks:
            task_subtask.task_completed = all_subtasks_completed
        
        # If all subtasks are completed and task is being tracked, stop tracking
        if all_subtasks_completed:
            for task_subtask in task_subtasks:
                if task_subtask.task_is_being_tracked and task_subtask.task_engagement_start and not task_subtask.task_has_ever_been_completed:
                    # Calculate time spent
                    end_time = datetime.now(timezone.utc)
                    time_spent = (end_time - task_subtask.task_engagement_start).total_seconds() / 60
                    
                    # Update task tracking
                    task_subtask.task_is_being_tracked = False
                    task_subtask.task_engagement_end = end_time
                    task_subtask.task_actual_time_minutes += int(time_spent)
                    task_subtask.task_has_ever_been_completed = True
                    break  # Only update one row since they all represent the same task
        
        # Check if all tasks in the goal are completed to update goal completion
        goal_tasks = Goal.query.filter_by(goal_id=subtask.goal_id, user_id=user_id).all()
        all_tasks_completed = all(gt.task_completed for gt in goal_tasks)
        
        # Update goal completion status
        for goal_task in goal_tasks:
            goal_task.goal_completed = all_tasks_completed
        
        db.session.commit()
        
        return jsonify({
            'message': 'Subtask updated successfully',
            'subtask_id': subtask_id,
            'subtask_descr': subtask.subtask_descr,
            'subtask_completed': subtask.subtask_completed,
            'task_completed': all_subtasks_completed,
            'goal_completed': all_tasks_completed
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the subtask'}), 500


@goals_bp.route('/api/goals/<goal_id>/time-analytics', methods=['GET'])
@jwt_required()
def get_goal_time_analytics(goal_id):
    """Get time analytics for a goal including estimated vs actual time comparisons"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Get all subtasks for this goal
        subtasks = Goal.query.filter_by(goal_id=goal_id, user_id=user_id).all()
        
        if not subtasks:
            return jsonify({'error': 'Goal not found or you do not have access'}), 404
        
        # Calculate time analytics
        total_estimated = sum(subtask.estimated_time_minutes for subtask in subtasks)
        total_actual = sum(subtask.actual_time_minutes for subtask in subtasks)
        
        # Calculate efficiency percentage
        efficiency_percentage = 0
        if total_estimated > 0:
            efficiency_percentage = round((total_estimated / total_actual) * 100, 1) if total_actual > 0 else 0
        
        # Get subtask-level analytics
        subtask_analytics = []
        for subtask in subtasks:
            subtask_efficiency = 0
            if subtask.estimated_time_minutes > 0 and subtask.actual_time_minutes > 0:
                subtask_efficiency = round((subtask.estimated_time_minutes / subtask.actual_time_minutes) * 100, 1)
            
            subtask_analytics.append({
                'subtask_id': subtask.subtask_id,
                'subtask_descr': subtask.subtask_descr,
                'estimated_time_minutes': subtask.estimated_time_minutes,
                'actual_time_minutes': subtask.actual_time_minutes,
                'efficiency_percentage': subtask_efficiency,
                'is_completed': subtask.subtask_completed
            })
        
        return jsonify({
            'goal_id': goal_id,
            'total_estimated_time_minutes': total_estimated,
            'total_actual_time_minutes': total_actual,
            'efficiency_percentage': efficiency_percentage,
            'subtask_analytics': subtask_analytics
        }), 200
        
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting time analytics: {str(e)}")
        return jsonify({'error': 'An error occurred while getting time analytics'}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/start-tracking', methods=['POST'])
@jwt_required()
def start_task_tracking(task_id):
    """Start time tracking for a task when user first interacts with it"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Check if already tracking - if so, don't restart
        if task.task_is_being_tracked:
            return jsonify({
                'message': 'Task time tracking already started',
                'task_id': task_id,
                'task_engagement_start': task.task_engagement_start.isoformat(),
                'started_by_subtask': task.started_by_subtask
            }), 200
        
        # Get the subtask ID that started tracking
        data = request.get_json() or {}
        started_by_subtask = data.get('started_by_subtask')
        
        # Start time tracking
        task.task_is_being_tracked = True
        task.task_engagement_start = datetime.now(timezone.utc)
        if started_by_subtask:
            task.started_by_subtask = started_by_subtask
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task time tracking started',
            'task_id': task_id,
            'task_engagement_start': task.task_engagement_start.isoformat(),
            'started_by_subtask': task.started_by_subtask
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/current-time', methods=['GET'])
@jwt_required()
def get_current_task_time(task_id):
    """Get current elapsed time for an actively tracked task"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # If not tracking, return 0
        if not task.task_is_being_tracked or not task.task_engagement_start:
            return jsonify({
                'task_id': task_id,
                'current_time_minutes': 0,
                'total_actual_time_minutes': task.task_actual_time_minutes or 0,
                'is_tracking': False
            }), 200
        
        # Calculate current elapsed time
        current_time = datetime.now(timezone.utc)
        elapsed_minutes = (current_time - task.task_engagement_start).total_seconds() / 60
        
        return jsonify({
            'task_id': task_id,
            'current_time_minutes': int(elapsed_minutes),
            'total_actual_time_minutes': task.task_actual_time_minutes or 0,
            'is_tracking': True,
            'engagement_start': task.task_engagement_start.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/stop-tracking', methods=['POST'])
@jwt_required()
def stop_task_tracking(task_id):
    """Stop time tracking for a task when it's completed"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Debug logging
        print(f"🔍 Backend Debug - Stop tracking called for task_id: {task_id}")
        print(f"🔍 Backend Debug - User ID: {user_id}")
        
        # Find the task
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        print(f"🔍 Backend Debug - Task found: {task is not None}")
        
        if not task:
            print(f"🔍 Backend Debug - Task not found for task_id: {task_id}")
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Check if tracking was started
        if not task.task_is_being_tracked or not task.task_engagement_start:
            return jsonify({'error': 'Time tracking was not started for this task'}), 400
        
        # Calculate time spent
        end_time = datetime.now(timezone.utc)
        time_spent = (end_time - task.task_engagement_start).total_seconds() / 60  # Convert to minutes
        
        # Update task
        task.task_is_being_tracked = False
        task.task_engagement_end = end_time
        task.task_actual_time_minutes += int(time_spent)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task time tracking stopped',
            'task_id': task_id,
            'time_spent_minutes': int(time_spent),
            'total_actual_time_minutes': task.task_actual_time_minutes
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/update-estimate', methods=['PUT'])
@jwt_required()
def update_task_estimate(task_id):
    """Update estimated time for a task"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        data = request.get_json()
        estimated_time = data.get('estimated_time_minutes')
        
        if estimated_time is not None:
            task.task_estimated_time_minutes = estimated_time
        
        db.session.commit()
        
        return jsonify({
            'message': 'Task estimate updated',
            'task_id': task_id,
            'task_estimated_time_minutes': task.task_estimated_time_minutes
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/time-analytics', methods=['GET'])
@jwt_required()
def get_task_time_analytics(task_id):
    """Get time analytics for a task including estimated vs actual time comparisons"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        # Calculate time analytics
        estimated_time = task.task_estimated_time_minutes or 0
        actual_time = task.task_actual_time_minutes or 0
        
        # Calculate efficiency percentage
        efficiency_percentage = 0
        if estimated_time > 0 and actual_time > 0:
            efficiency_percentage = round((estimated_time / actual_time) * 100, 1)
        
        return jsonify({
            'task_id': task_id,
            'task_title': task.task_title,
            'estimated_time_minutes': estimated_time,
            'actual_time_minutes': actual_time,
            'efficiency_percentage': efficiency_percentage,
            'is_completed': task.task_completed,
            'is_being_tracked': task.task_is_being_tracked,
            'engagement_start': task.task_engagement_start.isoformat() if task.task_engagement_start else None,
            'engagement_end': task.task_engagement_end.isoformat() if task.task_engagement_end else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@goals_bp.route('/api/goals/tasks/<task_id>/subtasks', methods=['POST'])
@jwt_required()
def create_subtask(task_id):
    """Create a new subtask for a specific task"""
    try:
        # Get current user from JWT
        user_id = get_jwt_identity()
        
        # Find the task to get goal information
        task = Goal.query.filter_by(task_id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found or you do not have access'}), 404
        
        data = request.get_json()
        
        if not data or 'subtask_descr' not in data:
            return jsonify({'error': 'Subtask description is required'}), 400
        
        # Create new subtask
        new_subtask = Goal(
            user_id=user_id,
            course_id=task.course_id,
            goal_id=task.goal_id,
            goal_descr=task.goal_descr,
            due_date=task.due_date,
            task_id=task_id,
            task_title=task.task_title,
            task_descr=task.task_descr,
            subtask_id=str(uuid.uuid4()),
            subtask_descr=data['subtask_descr'],
            subtask_type=data.get('subtask_type', 'other'),
            subtask_completed=False
        )
        
        db.session.add(new_subtask)
        db.session.commit()
        
        return jsonify({
            'message': 'Subtask created successfully',
            'subtask_id': new_subtask.subtask_id,
            'subtask_descr': new_subtask.subtask_descr,
            'subtask_type': new_subtask.subtask_type,
            'subtask_completed': new_subtask.subtask_completed
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while creating the subtask'}), 500