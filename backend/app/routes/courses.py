from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.course import Course
from app.models.user import User
from app.init import db
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from app.utils.s3 import upload_file_to_s3, list_files_in_s3, delete_file_from_s3, get_presigned_url
from app.utils.llama_index_service import insert_placeholder_embedding, LlamaIndexService
import traceback
import uuid
from app.models.goal import Goal

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
    
    # Base query - only get courses for current user and exclude 'Google Calendar'
    query = Course.query.filter_by(user_id=current_user_id).filter(Course.title != 'Google Calendar')
    
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
        # Generate shared course UUID
        shared_course_id = str(uuid.uuid4())
        combo_id = f"{shared_course_id}+{current_user_id}"
        # Create new course
        course = Course(
            combo_id=combo_id,
            id=shared_course_id,
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
        course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
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

@courses_bp.route('/<course_id>/banner', methods=['POST'])
@jwt_required()
def upload_banner(course_id):
    """Upload or update a banner image for a course."""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # S3 vs. local storage handling
        storage_mode = current_app.config['FILE_STORAGE']
        
        # Delete old banner if it exists
        if course.course_image:
            try:
                if storage_mode == 'S3':
                    delete_file_from_s3(course.course_image)
                else:
                    old_file_path = os.path.join(UPLOAD_FOLDER, course.course_image)
                    if os.path.exists(old_file_path):
                        os.remove(old_file_path)
            except Exception as e:
                # Log the error but continue with upload
                print(f"Warning: Failed to delete old banner: {str(e)}")
        
        if storage_mode == 'S3':
            s3_path = f"banners/{course_id}/{filename}"
            try:
                upload_file_to_s3(file, s3_path)
                course.course_image = s3_path  # Store S3 key
            except Exception as e:
                return jsonify({'error': f'S3 upload failed: {str(e)}'}), 500
        else: # local storage
            course_dir = os.path.join(UPLOAD_FOLDER, 'banners', course_id)
            os.makedirs(course_dir, exist_ok=True)
            file_path = os.path.join(course_dir, filename)
            file.save(file_path)
            # Store relative path for local files
            course.course_image = os.path.join('banners', course_id, filename)

        db.session.commit()
        
        # Return the updated course, which will include the new presigned URL
        return jsonify({
            'message': 'Banner uploaded successfully',
            'course': course.to_dict()
        })

    return jsonify({'error': 'File type not allowed'}), 400

@courses_bp.route('/<course_id>/banner', methods=['DELETE'])
@jwt_required()
def delete_banner(course_id):
    """Delete the banner image for a course."""
    current_user_id = get_jwt_identity()
    
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    
    if not course.course_image:
        return jsonify({'error': 'No banner image to delete'}), 404
    
    try:
        # Delete from S3 or local storage
        storage_mode = current_app.config['FILE_STORAGE']
        
        if storage_mode == 'S3':
            # Delete from S3
            delete_file_from_s3(course.course_image)
        else:
            # Delete from local storage
            file_path = os.path.join(UPLOAD_FOLDER, course.course_image)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Clear the course_image field
        course.course_image = None
        db.session.commit()
        
        return jsonify({
            'message': 'Banner deleted successfully',
            'course': course.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to delete banner: {str(e)}'}), 500

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
    current_user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    # Check if file type is supported for vector processing
    supported_types = ['pdf', 'docx', 'doc', 'txt']
    should_process_vectors = file_extension in supported_types
    from app.utils.llama_index_service import LlamaIndexService
    try:
        llama_service = LlamaIndexService()
        if current_app.config['FILE_STORAGE'] == 'S3':
            s3_path = f"courses/{course_id}/{filename}"
            # Insert placeholder row after upload (upload_file_to_s3 will be called in the correct place below)
            insert_placeholder_embedding(
                user_id=current_user_id,
                course_id=course_id,
                document_name=filename,
                file_path=s3_path,
                document_type=file_extension
            )
            if should_process_vectors:
                try:
                    # Save file to temp location first for processing
                    import tempfile
                    temp_file_path = None
                    try:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                            file.save(temp_file.name)
                            temp_file_path = temp_file.name
                        # Process the document after the file is saved and closed
                        result = llama_service.process_document(
                            file_path=temp_file_path,
                            user_id=current_user_id,
                            course_id=course_id,
                            document_name=filename,
                            document_type=file_extension
                        )
                        # Now upload the processed file to S3
                        with open(temp_file_path, 'rb') as temp_file:
                            upload_file_to_s3(temp_file, s3_path)
                    except Exception as e:
                        raise
                    finally:
                        # Clean up temp file after processing
                        if temp_file_path and os.path.exists(temp_file_path):
                            os.unlink(temp_file_path)
                    if result['success']:
                        return jsonify({
                            'url': s3_path, 
                            'filename': filename,
                            'vector_processed': True,
                            'chunks_processed': result.get('chunks_processed', 0),
                            'message': result.get('message', 'Document uploaded and processed')
                        }), 201
                    else:
                        return jsonify({
                            'url': s3_path, 
                            'filename': filename,
                            'vector_processed': False,
                            'warning': f'Document uploaded but vector processing failed: {result.get("error", "Unknown error")}'
                        }), 201
                except Exception as e:
                    print(f"Vector processing error: {str(e)}")
                    return jsonify({
                        'url': s3_path, 
                        'filename': filename,
                        'vector_processed': False,
                        'warning': 'Document uploaded but vector processing failed'
                    }), 201
            else:
                # If not processing vectors, upload directly to S3
                upload_file_to_s3(file, s3_path)
                return jsonify({'url': s3_path, 'filename': filename}), 201
            # After vector processing (or direct upload), update embeddings
            llama_service.process_and_update_embeddings(
                file_path=s3_path,
                user_id=current_user_id,
                course_id=course_id,
                document_name=filename,
                document_type=file_extension
            )
        else: # Local storage
            course_dir = os.path.join(UPLOAD_FOLDER, 'courses', course_id)
            os.makedirs(course_dir, exist_ok=True)
            file_path = os.path.join(course_dir, filename)
            file.save(file_path)
            file_url = f'/uploads/courses/{course_id}/{filename}'
            insert_placeholder_embedding(
                user_id=current_user_id,
                course_id=course_id,
                document_name=filename,
                file_path=file_path,
                document_type=file_extension
            )
            if should_process_vectors:
                try:
                    result = llama_service.process_document(
                        file_path=file_path,
                        user_id=current_user_id,
                        course_id=course_id,
                        document_name=filename,
                        document_type=file_extension
                    )
                    if result['success']:
                        return jsonify({
                            'url': file_url, 
                            'filename': filename,
                            'vector_processed': True,
                            'chunks_processed': result.get('chunks_processed', 0),
                            'message': result.get('message', 'Document uploaded and processed')
                        }), 201
                    else:
                        return jsonify({
                            'url': file_url, 
                            'filename': filename,
                            'vector_processed': False,
                            'warning': f'Document uploaded but vector processing failed: {result.get("error", "Unknown error")}'
                        }), 201
                except Exception as e:
                    print(f"Vector processing error: {str(e)}")
                    return jsonify({
                        'url': file_url, 
                        'filename': filename,
                        'vector_processed': False,
                        'warning': 'Document uploaded but vector processing failed'
                    }), 201
            # After vector processing (or direct upload), update embeddings
            llama_service.process_and_update_embeddings(
                file_path=file_path,
                user_id=current_user_id,
                course_id=course_id,
                document_name=filename,
                document_type=file_extension
            )
        return jsonify({'url': file_url, 'filename': filename}), 201
    except Exception as e:
        print("Exception in upload_material:", e)
        traceback.print_exc()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials', methods=['GET'])
@jwt_required()
def list_materials(course_id):
    if current_app.config['FILE_STORAGE'] == 'S3':
        s3_prefix = f"courses/{course_id}/"
        files_data = list_files_in_s3(s3_prefix)
        # Filter out banner files and add a 'name' field to match the expected frontend structure
        filtered_files = []
        for file_data in files_data:
            # Skip banner files (both old and new path structures)
            if 'banner' in file_data['key'].lower():
                continue
            file_data['name'] = os.path.basename(file_data['key'])
            filtered_files.append(file_data)
        return jsonify(filtered_files)
    else: # Local storage
        course_dir = os.path.join(UPLOAD_FOLDER, 'courses', course_id)
        if not os.path.isdir(course_dir):
            return jsonify([])

        files_data = []
        for filename in os.listdir(course_dir):
            # Skip banner files
            if 'banner' in filename.lower():
                continue
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
    current_user_id = get_jwt_identity()
    
    try:
        # Extract the actual filename from the path
        actual_filename = filename.split('/')[-1] if '/' in filename else filename
        file_extension = actual_filename.rsplit('.', 1)[1].lower() if '.' in actual_filename else ''
        
        # Check if file type was supported for vector processing
        supported_types = ['pdf', 'docx', 'doc', 'txt']
        should_have_vectors = file_extension in supported_types
        
        # Delete embeddings if the file type was supported
        if should_have_vectors:
            try:
                from app.utils.llama_index_service import LlamaIndexService
                llama_service = LlamaIndexService()
                llama_service.delete_document_embeddings(
                    user_id=current_user_id,
                    course_id=course_id,
                    document_name=actual_filename
                )
            except Exception as e:
                print(f"Warning: Failed to delete embeddings for {actual_filename}: {str(e)}")
        
        # Delete the actual file
        if current_app.config['FILE_STORAGE'] == 'S3':
            # filename is the full S3 key
            delete_file_from_s3(filename)
            return jsonify({'message': 'File deleted successfully from S3'}), 200
        else: # Local storage
            safe_filename = secure_filename(actual_filename)
            file_path = os.path.join(UPLOAD_FOLDER, 'courses', course_id, safe_filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                return jsonify({'message': 'File deleted successfully'}), 200
            else:
                return jsonify({'error': 'File not found'}), 404 
                
    except Exception as e:
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/<path:filename>/content', methods=['GET'])
@jwt_required()
def get_material_content(course_id, filename):
    """Get the content of a material file for AI processing"""
    current_user_id = get_jwt_identity()
    
    try:
        # Extract the actual filename from the path
        actual_filename = filename.split('/')[-1] if '/' in filename else filename
        file_extension = actual_filename.rsplit('.', 1)[1].lower() if '.' in actual_filename else ''
        
        # Check if file type is supported for text extraction
        supported_types = ['pdf', 'docx', 'doc', 'txt']
        if file_extension not in supported_types:
            return jsonify({'error': 'File type not supported for content extraction'}), 400
        
        if current_app.config['FILE_STORAGE'] == 'S3':
            # Download file from S3 to temp location
            import tempfile
            import boto3
            from app.utils.s3 import get_s3_client
            
            s3_client = get_s3_client()
            bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
            s3_key = f"courses/{course_id}/{actual_filename}"
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                try:
                    # Download from S3
                    s3_client.download_fileobj(bucket_name, s3_key, temp_file)
                    temp_file_path = temp_file.name
                    
                    # Extract text content
                    content = extract_text_from_file(temp_file_path, file_extension)
                    
                    return jsonify({
                        'content': content,
                        'filename': actual_filename,
                        'file_type': file_extension
                    })
                    
                finally:
                    # Clean up temp file
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
        else:
            # Local storage
            file_path = os.path.join(UPLOAD_FOLDER, 'courses', course_id, actual_filename)
            if not os.path.exists(file_path):
                return jsonify({'error': 'File not found'}), 404
            
            content = extract_text_from_file(file_path, file_extension)
            
            return jsonify({
                'content': content,
                'filename': actual_filename,
                'file_type': file_extension
            })
            
    except Exception as e:
        print(f"Error getting material content: {str(e)}")
        return jsonify({'error': f'Failed to get content: {str(e)}'}), 500

def extract_text_from_file(file_path, file_type):
    """Extract text content from different file types"""
    try:
        if file_type == 'pdf':
            import PyPDF2
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        
        elif file_type in ['docx', 'doc']:
            import docx
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        
        elif file_type == 'txt':
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
        raise

@courses_bp.route('/<course_id>/generate-study-plan', methods=['POST'])
@jwt_required()
def generate_study_plan(course_id):
    """Generate AI study plan based on document content and goal details"""
    current_user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        goal_title = data.get('goal_title')
        goal_description = data.get('goal_description', '')
        document_filename = data.get('document_filename')
        
        if not goal_title or not document_filename:
            return jsonify({'error': 'Goal title and document filename are required'}), 400
        
        # Get document content
        content_response = get_material_content(course_id, document_filename)
        if content_response.status_code != 200:
            return content_response
        
        document_content = content_response.get_json()['content']
        
        # Generate study plan using OpenAI
        import openai
        import os
        api_key = os.getenv('OPENAI_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        client = openai.OpenAI(api_key=api_key)

        # Create the prompt for study plan generation
        prompt = f"""
You are an expert study planner and educational consultant. Based on the following document content and learning goal, create a detailed study plan with tasks and subtasks.

Document Content:
{document_content[:4000]}  # Limit content to avoid token limits

Learning Goal: {goal_title}
Additional Details: {goal_description}

Please create a study plan in the following JSON format:
{{
  "goal_title": "{goal_title}",
  "goal_description": "{goal_description}",
  "tasks": [
    {{
      "name": "Task name",
      "description": "Task description",
      "estimated_hours": 2,
      "priority": "high|medium|low",
      "subtasks": [
        {{
          "name": "Subtask name",
          "description": "Subtask description",
          "estimated_minutes": 30,
          "type": "reading|practice|review|assessment"
        }}
      ]
    }}
  ]
}}

Guidelines:
1. Break down the goal into at least 4 but no more than 8 manageable tasks
2. Each task should have 2-5 subtasks
3. Focus on practical, actionable steps
4. Consider different learning activities (reading, practice, review, assessment)
5. Estimate realistic time requirements
6. Prioritize tasks based on importance and dependencies
7. Make sure the plan is comprehensive but achievable

Return only the JSON response, no additional text.
"""

        # Call OpenAI API (new style)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert educational consultant who creates detailed, actionable study plans."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )

        # Log the full OpenAI response and the raw text
        print("[OpenAI API response]:", response)
        try:
            import json
            study_plan_text = response.choices[0].message.content.strip()
            print("[OpenAI raw response text]:", study_plan_text)
            # Try to extract JSON from the response
            if study_plan_text.startswith('```json'):
                study_plan_text = study_plan_text[7:-3]  # Remove ```json and ```
            elif study_plan_text.startswith('```'):
                study_plan_text = study_plan_text[3:-3]  # Remove ``` and ```
            study_plan = json.loads(study_plan_text)
            # Print parsed variables for debugging
            goal_title = study_plan.get('goal_title')
            goal_description = study_plan.get('goal_description')
            tasks = study_plan.get('tasks', [])
            print("[Parsed goal_title]:", goal_title)
            print("[Parsed goal_description]:", goal_description)
            print("[Parsed tasks]:", tasks)
            for i, task in enumerate(tasks):
                print(f"  [Task {i+1} name]:", task.get('name'))
                print(f"  [Task {i+1} description]:", task.get('description'))
                print(f"  [Task {i+1} estimated_hours]:", task.get('estimated_hours'))
                print(f"  [Task {i+1} priority]:", task.get('priority'))
                subtasks = task.get('subtasks', [])
                print(f"    [Task {i+1} subtasks]:", subtasks)
                for j, subtask in enumerate(subtasks):
                    print(f"      [Subtask {j+1} name]:", subtask.get('name'))
                    print(f"      [Subtask {j+1} description]:", subtask.get('description'))
                    print(f"      [Subtask {j+1} estimated_minutes]:", subtask.get('estimated_minutes'))
                    print(f"      [Subtask {j+1} type]:", subtask.get('type'))
            # Get the course to get the combo_id
            course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found or you do not have access'}), 404
            
            # Generate a new goal_id for this plan
            new_goal_id = str(uuid.uuid4())
            user_id = current_user_id
            # Insert each task and subtask as a row
            for task in tasks:
                task_id = str(uuid.uuid4())
                task_title = task.get('name')
                task_descr = task.get('description')
                task_completed = False
                for subtask in task.get('subtasks', []):
                    subtask_id = str(uuid.uuid4())
                    subtask_descr = subtask.get('name')
                    subtask_type = subtask.get('type', 'other')
                    subtask_completed = False
                    # Create Goal row (one per subtask)
                    goal_row = Goal(
                        user_id=user_id,
                        course_id=course.combo_id,
                        goal_id=new_goal_id,
                        goal_descr=goal_title,
                        due_date=None,  # You can set due_date from AI if available
                        goal_completed=False,
                        task_id=task_id,
                        task_title=task_title,
                        task_descr=task_descr,
                        task_completed=task_completed,
                        subtask_id=subtask_id,
                        subtask_descr=subtask_descr,
                        subtask_type=subtask_type,
                        subtask_completed=subtask_completed
                    )
                    db.session.add(goal_row)
            db.session.commit()
            print(f"[Inserted AI-generated goal_id]: {new_goal_id}")
            return jsonify({
                'success': True,
                'goal_id': new_goal_id,
                'message': 'AI-generated study plan inserted into database.'
            })
        except json.JSONDecodeError as e:
            print(f"Error parsing OpenAI response: {e}")
            print(f"Response content: {study_plan_text}")
            return jsonify({'error': 'Failed to parse AI response'}), 500
        
    except Exception as e:
        print(f"Error generating study plan: {str(e)}")
        return jsonify({'error': f'Failed to generate study plan: {str(e)}'}), 500 