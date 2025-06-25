from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime
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
        
        # Return all rows directly
        result = [goal.to_dict() for goal in goals]
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
        else:
            # Create default task and subtask if none provided
            new_goal, _, _ = Goal.create_for_goal(
                user_id=user_id,
                course_id=course_id,
                goal_descr=goal_descr,
                due_date=due_date
            )
            rows_to_add.append(new_goal)
        
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
            
            # Delete tasks that weren't in the update
            for g in goals:
                if g.task_id not in updated_task_ids:
                    db.session.delete(g)
        
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
        
        # Return all rows directly
        result = [goal.to_dict() for goal in goals]
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
        
        # Delete tasks that weren't in the update
        for g in goals:
            if g.task_id not in updated_task_ids:
                db.session.delete(g)
        
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
        
        if not data or 'tasks' not in data:
            return jsonify({'error': 'Tasks are required'}), 400
        
        # Delete existing rows for this goal
        for goal in existing_goals:
            db.session.delete(goal)
        
        # Create new rows for each task and subtask
        new_rows = []
        
        for task_data in data['tasks']:
            task_id = task_data.get('task_id', str(uuid.uuid4()))
            task_title = task_data.get('task_title', 'New Task')
            task_descr = task_data.get('task_descr', '')
            task_completed = task_data.get('task_completed', False)
            
            if 'subtasks' in task_data and task_data['subtasks']:
                for subtask_data in task_data['subtasks']:
                    subtask = Goal(
                        user_id=user_id,
                        course_id=existing_goals[0].course_id,
                        goal_id=goal_id,
                        goal_descr=existing_goals[0].goal_descr,
                        due_date=existing_goals[0].due_date,
                        goal_completed=existing_goals[0].goal_completed,
                        task_id=task_id,
                        task_title=task_title,
                        task_descr=task_descr,
                        task_completed=task_completed,
                        subtask_id=subtask_data.get('subtask_id', str(uuid.uuid4())),
                        subtask_descr=subtask_data.get('subtask_descr', 'New Subtask'),
                        subtask_type=subtask_data.get('subtask_type', 'other'),
                        subtask_completed=subtask_data.get('subtask_completed', False)
                    )
                    db.session.add(subtask)
                    new_rows.append(subtask)
            else:
                # Create a default subtask if none provided
                subtask = Goal(
                    user_id=user_id,
                    course_id=existing_goals[0].course_id,
                    goal_id=goal_id,
                    goal_descr=existing_goals[0].goal_descr,
                    due_date=existing_goals[0].due_date,
                    goal_completed=existing_goals[0].goal_completed,
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
        return jsonify(result), 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving tasks: {str(e)}")
        return jsonify({'error': 'An error occurred while saving tasks'}), 500 