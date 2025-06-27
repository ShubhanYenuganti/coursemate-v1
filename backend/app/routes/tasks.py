from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from app.init import db
from app.models.task import Task
from app.models.user import User

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')


@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    """Get all tasks for the authenticated user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters for filtering
        filter_type = request.args.get('filter', 'all')  # all, today, overdue, upcoming
        completed = request.args.get('completed')
        
        # Base query
        query = Task.query.filter_by(user_id=current_user_id)
        
        # Apply filters
        if completed is not None:
            completed_bool = completed.lower() == 'true'
            query = query.filter_by(completed=completed_bool)
        
        if filter_type == 'today':
            today = date.today()
            query = query.filter_by(due_date=today)
        elif filter_type == 'overdue':
            today = date.today()
            query = query.filter(Task.due_date < today, Task.completed == False)
        elif filter_type == 'upcoming':
            today = date.today()
            query = query.filter(Task.due_date > today)
        
        # Order by due date and creation date
        tasks = query.order_by(Task.due_date.asc(), Task.created_at.asc()).all()
        
        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    """Create a new task"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'course', 'due_date']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Parse due date
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid due_date format. Use YYYY-MM-DD'
            }), 400
        
        # Create new task
        new_task = Task(
            user_id=current_user_id,
            title=data['title'],
            course=data['course'],
            due_date=due_date,
            color=data.get('color', '#6b7280'),
            completed=data.get('completed', False)
        )
        
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'task': new_task.to_dict(),
            'message': 'Task created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@tasks_bp.route('/<task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    """Get a specific task by ID"""
    try:
        current_user_id = get_jwt_identity()
        
        task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        return jsonify({
            'success': True,
            'task': task.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@tasks_bp.route('/<task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update a task"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        # Update fields if provided
        if 'title' in data:
            task.title = data['title']
        if 'course' in data:
            task.course = data['course']
        if 'due_date' in data:
            try:
                task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid due_date format. Use YYYY-MM-DD'
                }), 400
        if 'color' in data:
            task.color = data['color']
        if 'completed' in data:
            task.completed = data['completed']
        
        task.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'task': task.to_dict(),
            'message': 'Task updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@tasks_bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Delete a task"""
    try:
        current_user_id = get_jwt_identity()
        
        task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Task deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@tasks_bp.route('/<task_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_task(task_id):
    """Toggle task completion status"""
    try:
        current_user_id = get_jwt_identity()
        
        task = Task.query.filter_by(id=task_id, user_id=current_user_id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        # Toggle completion status
        task.completed = not task.completed
        task.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'task': task.to_dict(),
            'message': f'Task {"completed" if task.completed else "uncompleted"} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 