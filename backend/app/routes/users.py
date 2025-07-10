from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.init import db
from datetime import datetime, timedelta
from sqlalchemy import text

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    # Update streak when user accesses their profile
    user.update_streak()
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'created_at': user.created_at,
        'college': user.college,
        'year': user.year,
        'major': user.major,
        'streak': {
            'current': user.current_streak,
            'longest': user.longest_streak,
            'last_visit': user.last_visit_date.isoformat() if user.last_visit_date else None
        }
    })

@users_bp.route('/streak', methods=['GET'])
@jwt_required()
def get_streak():
    """Get current user's streak information"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    # Update streak when accessed
    user.update_streak()
    db.session.commit()
    
    return jsonify({
        'current_streak': user.current_streak,
        'longest_streak': user.longest_streak,
        'last_visit_date': user.last_visit_date.isoformat() if user.last_visit_date else None
    })

@users_bp.route('/streak', methods=['POST'])
@jwt_required()
def update_streak():
    """Manually update streak (for testing or special cases)"""
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    
    user.update_streak()
    db.session.commit()
    
    return jsonify({
        'message': 'Streak updated successfully',
        'current_streak': user.current_streak,
        'longest_streak': user.longest_streak,
        'last_visit_date': user.last_visit_date.isoformat() if user.last_visit_date else None
    })

@users_bp.route('/weekly-hours', methods=['GET'])
@jwt_required()
def get_weekly_hours():
    """Get total hours spent on tasks in the current week"""
    current_user = get_jwt_identity()
    
    # Calculate the start and end of the current week (Monday to Sunday)
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)  # Sunday
    
    # Convert to datetime for comparison
    start_datetime = datetime.combine(start_of_week, datetime.min.time())
    end_datetime = datetime.combine(end_of_week, datetime.max.time())
    
    try:
        # Query the database for total time spent on tasks this week
        result = db.session.execute(text("""
            SELECT COALESCE(SUM(task_actual_time_minutes), 0) as total_minutes
            FROM users_courses_goal 
            WHERE user_id = :user_id 
            AND task_engagement_start >= :start_date 
            AND task_engagement_start <= :end_date
            AND task_actual_time_minutes > 0
        """), {
            'user_id': current_user,
            'start_date': start_datetime,
            'end_date': end_datetime
        }).fetchone()
        
        total_minutes = result.total_minutes if result else 0
        total_hours = round(total_minutes / 60, 1)
        
        return jsonify({
            'weekly_hours': total_hours,
            'weekly_minutes': total_minutes,
            'week_start': start_of_week.isoformat(),
            'week_end': end_of_week.isoformat(),
            'current_week': True
        })
        
    except Exception as e:
        print(f"Error calculating weekly hours: {e}")
        return jsonify({
            'weekly_hours': 0,
            'weekly_minutes': 0,
            'week_start': start_of_week.isoformat(),
            'week_end': end_of_week.isoformat(),
            'current_week': True,
            'error': 'Failed to calculate weekly hours'
        }), 500

@users_bp.route('/weekly-avg-task-time', methods=['GET'])
@jwt_required()
def get_weekly_avg_task_time():
    """Get average time per task for the current week"""
    current_user = get_jwt_identity()
    
    # Calculate the start and end of the current week (Monday to Sunday)
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)  # Sunday
    
    # Convert to datetime for comparison
    start_datetime = datetime.combine(start_of_week, datetime.min.time())
    end_datetime = datetime.combine(end_of_week, datetime.max.time())
    
    try:
        # Query the database for tasks with time tracking this week
        result = db.session.execute(text("""
            SELECT 
                COUNT(DISTINCT task_id) as total_tasks,
                COALESCE(SUM(task_actual_time_minutes), 0) as total_minutes,
                COALESCE(AVG(task_actual_time_minutes), 0) as avg_minutes_per_task
            FROM users_courses_goal 
            WHERE user_id = :user_id 
            AND task_engagement_start >= :start_date 
            AND task_engagement_start <= :end_date
            AND task_actual_time_minutes > 0
        """), {
            'user_id': current_user,
            'start_date': start_datetime,
            'end_date': end_datetime
        }).fetchone()
        
        total_tasks = result.total_tasks if result else 0
        total_minutes = result.total_minutes if result else 0
        avg_minutes_per_task = result.avg_minutes_per_task if result else 0
        
        return jsonify({
            'total_tasks_this_week': total_tasks,
            'total_minutes_this_week': total_minutes,
            'avg_minutes_per_task': round(avg_minutes_per_task, 1),
            'week_start': start_of_week.isoformat(),
            'week_end': end_of_week.isoformat(),
            'current_week': True
        })
        
    except Exception as e:
        print(f"Error calculating weekly average task time: {e}")
        return jsonify({
            'total_tasks_this_week': 0,
            'total_minutes_this_week': 0,
            'avg_minutes_per_task': 0,
            'week_start': start_of_week.isoformat(),
            'week_end': end_of_week.isoformat(),
            'current_week': True,
            'error': 'Failed to calculate weekly average task time'
        }), 500

@users_bp.route('/', methods=['GET'])
@jwt_required()
def list_users():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'email': u.email,
        'name': u.name,
        'role': u.role,
        'created_at': u.created_at
    } for u in users])

@users_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})


@users_bp.route('/profile', methods=['POST'])
@jwt_required()
def update_profile():
    print("getting JWT identity")
    print("Request headers:", request.headers)  # Add this line
    current_user = get_jwt_identity()
    print("Current user from JWT:", current_user)  # Add this line

    user_id = current_user
    data = request.get_json()
    print("Request data:", data)  # Add this line

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Update user profile information
    user.name = data.get('fullName', user.name)
    user.college = data.get('college')
    user.year = data.get('year')
    user.major = data.get('major')

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'}), 200
