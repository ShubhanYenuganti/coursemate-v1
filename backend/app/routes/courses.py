from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.course import Course
from app.models.user import User
from app.init import db
from datetime import datetime
import os
from werkzeug.utils import secure_filename

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads/courses'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'ppt', 'pptx', 'mp4'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@courses_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_user_courses():
    """Get all courses for the authenticated user"""
    current_user_id = get_jwt_identity()
    
    # Parse query parameters for filtering
    show_archived = request.args.get('show_archived', 'false').lower() == 'true'
    search_term = request.args.get('search', '').strip()
    semester = request.args.get('semester', '')
    sort_by = request.args.get('sort_by', 'last_accessed')
    
    # Base query - only get courses for current user
    query = Course.query.filter_by(user_id=current_user_id)
    
    # Apply filters
    if not show_archived:
        query = query.filter_by(is_archived=False)
    
    if search_term:
        query = query.filter(
            (Course.title.ilike(f'%{search_term}%')) |
            (Course.subject.ilike(f'%{search_term}%')) |
            (Course.course_code.ilike(f'%{search_term}%'))
        )
    
    if semester and semester != 'all':
        query = query.filter_by(semester=semester)
    
    # Apply sorting
    if sort_by == 'title':
        query = query.order_by(Course.is_pinned.desc(), Course.title.asc())
    elif sort_by == 'progress':
        query = query.order_by(Course.is_pinned.desc(), Course.daily_progress.desc())
    else:  # last_accessed
        query = query.order_by(Course.is_pinned.desc(), Course.last_accessed.desc())
    
    courses = query.all()
    return jsonify([course.to_dict() for course in courses])

@courses_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_course():
    """Create a new course for the authenticated user"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    required_fields = ['title', 'subject', 'semester', 'description']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Determine the course title (either from course name or custom)
    course_title = data.get('customCourseName') or data.get('courseName')
    if not course_title:
        course_title = data.get('title')
    
    try:
        # Create new course
        course = Course(
            user_id=current_user_id,
            title=course_title,
            subject=data.get('subject'),
            course_code=data.get('courseCode', ''),
            semester=data.get('semester'),
            professor=data.get('professor', ''),
            units=data.get('units', 3),
            variable_units=data.get('variableUnits', False),
            description=data.get('description'),
            visibility=data.get('visibility', 'Public'),
            tags=data.get('tags', []),
            collaborators=data.get('collaborators', []),
            badge='Creator'  # User is creating the course
        )
        
        db.session.add(course)
        db.session.commit()
        
        return jsonify({
            'message': 'Course created successfully',
            'course': course.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create course: {str(e)}'}), 500

@courses_bp.route('/<course_id>', methods=['GET'])
@jwt_required()
def get_course(course_id):
    """Get a specific course (user can only access their own courses)"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    # Update last accessed time
    course.update_last_accessed()
    
    return jsonify(course.to_dict())

@courses_bp.route('/<course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    """Update a specific course (user can only update their own courses)"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Update allowed fields
        updatable_fields = [
            'title', 'subject', 'course_code', 'semester', 'professor', 
            'units', 'variable_units', 'description', 'visibility', 
            'tags', 'collaborators', 'daily_progress', 'is_pinned', 'is_archived'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(course, field, data[field])
        
        course.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Course updated successfully',
            'course': course.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update course: {str(e)}'}), 500

@courses_bp.route('/<course_id>', methods=['DELETE'])
@jwt_required()
def delete_course(course_id):
    """Delete a specific course (user can only delete their own courses)"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    try:
        db.session.delete(course)
        db.session.commit()
        return jsonify({'message': 'Course deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete course: {str(e)}'}), 500

@courses_bp.route('/<course_id>/toggle-pin', methods=['POST'])
@jwt_required()
def toggle_pin(course_id):
    """Toggle pin status for a course"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    course.is_pinned = not course.is_pinned
    course.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': f'Course {"pinned" if course.is_pinned else "unpinned"} successfully',
        'is_pinned': course.is_pinned
    })

@courses_bp.route('/<course_id>/toggle-archive', methods=['POST'])
@jwt_required()
def toggle_archive(course_id):
    """Toggle archive status for a course"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    course.is_archived = not course.is_archived
    course.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': f'Course {"archived" if course.is_archived else "unarchived"} successfully',
        'is_archived': course.is_archived
    })

@courses_bp.route('/<course_id>/progress', methods=['PUT'])
@jwt_required()
def update_progress(course_id):
    """Update course progress"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    data = request.get_json()
    progress = data.get('progress')
    
    if progress is None or not isinstance(progress, int) or progress < 0 or progress > 100:
        return jsonify({'error': 'Progress must be an integer between 0 and 100'}), 400
    
    course.daily_progress = progress
    course.updated_at = datetime.utcnow()
    course.last_accessed = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Progress updated successfully',
        'daily_progress': course.daily_progress
    }) 