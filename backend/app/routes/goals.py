from collections import defaultdict
from flask import Blueprint, request, jsonify, current_app, g
from datetime import date, datetime
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
                    subtask_completed = subtask_data.get('completed', False)
                    
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
        
        # Delete all rows for this task
        deleted_count = 0
        for row in task_rows:
            db.session.delete(row)
            deleted_count += 1
        
        db.session.commit()
        
        current_app.logger.info(f"Deleted task {task_id} with {deleted_count} subtasks from goal {goal_id}")
        return jsonify({'message': f'Task deleted successfully with {deleted_count} subtasks'}), 200
        
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
        
        subtask.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(subtask.to_dict()), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the subtask'}), 500


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
        
        if not data or 'subtask_descr' not in data:
            return jsonify({'error': 'Subtask description is required'}), 400
        
        # Use the first row to get goal and task info
        task_row = task_rows[0]
        
        # Create a new subtask
        subtask_id = str(uuid.uuid4())
        
        new_subtask = Goal(
            user_id=user_id,
            course_id=task_row.course_id,
            goal_id=task_row.goal_id,
            goal_descr=task_row.goal_descr,
            due_date=task_row.due_date,
            goal_completed=task_row.goal_completed,
            task_id=task_id,
            task_title=task_row.task_title,
            task_descr=task_row.task_descr,
            task_completed=task_row.task_completed,
            subtask_id=subtask_id,
            subtask_descr=data['subtask_descr'],
            subtask_type=data.get('subtask_type', 'other'),
            subtask_completed=data.get('subtask_completed', False)
        )
        
        db.session.add(new_subtask)
        db.session.commit()
        
        # Return the created subtask
        result = new_subtask.to_dict()
        return jsonify(result), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating subtask: {str(e)}")
        return jsonify({'error': 'An error occurred while creating the subtask'}), 500


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
        
        return jsonify({
            'message': 'Empty task created successfully',
            'task': new_task.to_dict()
        }), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating empty task: {str(e)}")
        return jsonify({'error': 'An error occurred while creating empty task'}), 500


@goals_bp.route("/api/goals/user", methods=["GET"])
@jwt_required()                               # still requires a valid JWT
def get_goals_by_user():
    # we ignore the real identity for test mode
    user = get_jwt_identity()

    try:
        goals = Goal.query.filter_by(user_id=user).all()

        # -------- group by end_date --------
        grouped: dict[str, list[dict]] = defaultdict(list)

        for g in goals:
            # Pick your date field here
            end_dt = getattr(g, "due_date", None)   # <─ change if it's called due_date
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
                if row.task_id not in task_completion_map:
                    task_completion_map[row.task_id] = row.task_completed
            
            # Check if all tasks are completed
            all_tasks_completed = all(task_completion_map.values())
            
            # Update goal completion status for all rows
            for row in goal_rows:
                row.goal_completed = all_tasks_completed
                row.updated_at = now
        
        task.updated_at = now
        db.session.commit()
        return jsonify(task.to_dict()), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating task: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the task'}), 500