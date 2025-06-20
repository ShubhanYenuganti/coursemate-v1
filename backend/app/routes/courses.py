from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.course import Course
from app.models.user import User
from app.init import db
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from app.utils.s3 import upload_file_to_s3, list_files_in_s3, delete_file_from_s3

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

# Base upload directory relative to the backend folder (for local storage)
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'uploads'))

# Configuration for file uploads
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

@courses_bp.route('/public', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_public_courses():
    """Get all public courses for the Discover page"""
    current_user_id = get_jwt_identity()
    
    # Parse query parameters for pagination and filtering
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search_term = request.args.get('search', '').strip()
    subject = request.args.get('subject', '')
    
    # Base query - only get public courses
    query = Course.query.filter_by(visibility='Public')
    
    # Apply filters
    if search_term:
        query = query.filter(
            (Course.title.ilike(f'%{search_term}%')) |
            (Course.subject.ilike(f'%{search_term}%')) |
            (Course.course_code.ilike(f'%{search_term}%'))
        )
    
    if subject:
        query = query.filter_by(subject=subject)
    
    # Apply pagination
    total = query.count()
    courses = query.order_by(Course.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return jsonify({
        'courses': [course.to_dict() for course in courses],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })

@courses_bp.route('/public/<course_id>', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_public_course(course_id):
    """Get details of a specific public course, including ownership information"""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, visibility='Public').first()
    if not course:
        return jsonify({'error': 'Course not found or not public'}), 404
    
    course_dict = course.to_dict()
    # Add ownership information
    course_dict['is_owned_by_user'] = (course.user_id == current_user_id)
    
    return jsonify(course_dict)

@courses_bp.route('/<course_id>/materials/upload', methods=['POST'])
@jwt_required()
def upload_material(course_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    
    if current_app.config['FILE_STORAGE'] == 'S3':
        s3_path = f"courses/{course_id}/{filename}"
        upload_file_to_s3(file, s3_path)
        # The URL will be generated on-the-fly when listing files
        return jsonify({'url': s3_path, 'filename': filename}), 201
    else: # Local storage
        course_dir = os.path.join(UPLOAD_FOLDER, 'courses', course_id)
        os.makedirs(course_dir, exist_ok=True)
        file.save(os.path.join(course_dir, filename))
        file_url = f'/uploads/courses/{course_id}/{filename}'
        return jsonify({'url': file_url, 'filename': filename}), 201

@courses_bp.route('/<course_id>/materials', methods=['GET'])
@jwt_required()
def list_materials(course_id):
    if current_app.config['FILE_STORAGE'] == 'S3':
        s3_prefix = f"courses/{course_id}/"
        files_data = list_files_in_s3(s3_prefix)
        # Add a 'name' field to match the expected frontend structure
        for file_data in files_data:
            file_data['name'] = os.path.basename(file_data['key'])
        return jsonify(files_data)
    else: # Local storage
        course_dir = os.path.join(UPLOAD_FOLDER, 'courses', course_id)
        if not os.path.isdir(course_dir):
            return jsonify([])

        files_data = []
        for filename in os.listdir(course_dir):
            file_path = os.path.join(course_dir, filename)
            if os.path.isfile(file_path):
                 files_data.append({
                    'key': filename, # Use filename as key for local
                    'name': filename,
                    'url': f'/uploads/courses/{course_id}/{filename}',
                    'size': os.path.getsize(file_path),
                    'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                 })
        return jsonify(files_data)

@courses_bp.route('/<course_id>/materials/<path:filename>', methods=['DELETE'])
@jwt_required()
def delete_material(course_id, filename):
    if current_app.config['FILE_STORAGE'] == 'S3':
        # filename is the full S3 key
        delete_file_from_s3(filename)
        return jsonify({'message': 'File deleted successfully from S3'}), 200
    else: # Local storage
        safe_filename = secure_filename(filename)
        file_path = os.path.join(UPLOAD_FOLDER, 'courses', course_id, safe_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'message': 'File deleted successfully'}), 200
        else:
            return jsonify({'error': 'File not found'}), 404 