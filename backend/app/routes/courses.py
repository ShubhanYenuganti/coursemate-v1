from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.course import Course
from app.models.user import User
from app.init import db
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename
from app.utils.s3 import upload_file_to_s3, list_files_in_s3, delete_file_from_s3, get_presigned_url
from app.utils.llama_index_service import insert_placeholder_embedding, LlamaIndexService
import traceback
import uuid
from app.models.user_course_material import UserCourseMaterial
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

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
    
    try:
        course.is_pinned = not course.is_pinned
        course.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': f'Course {"pinned" if course.is_pinned else "unpinned"} successfully',
            'is_pinned': course.is_pinned
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to toggle pin state: {str(e)}'}), 500

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
        # Delete old banner if it exists
        if course.course_image:
            try:
                delete_file_from_s3(course.course_image)
            except Exception as e:
                print(f"Warning: Failed to delete old banner: {str(e)}")
        s3_path = f"banners/{course_id}/{filename}"
        try:
            upload_file_to_s3(file, s3_path)
            course.course_image = s3_path  # Store S3 key
        except Exception as e:
            return jsonify({'error': f'S3 upload failed: {str(e)}'}), 500
        db.session.commit()
        return jsonify({
            'message': 'Banner uploaded successfully',
            'course': course.to_dict()
        })
    return jsonify({'error': 'File type not allowed'}), 400

@courses_bp.route('/<course_id>/banner', methods=['DELETE'])
@jwt_required()
def delete_banner(course_id):
    current_user_id = get_jwt_identity()
    course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
    if not course:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    if not course.course_image:
        return jsonify({'error': 'No banner image to delete'}), 404
    try:
        delete_file_from_s3(course.course_image)
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
    supported_types = ['pdf', 'docx', 'doc', 'txt']
    should_process = file_extension in supported_types
    try:
        from app.services.course_rag_service import CourseDocumentProcessor
        course_processor = CourseDocumentProcessor()
        s3_path = f"courses/{course_id}/{filename}"
        if should_process:
            import tempfile
            temp_file_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                    file.save(temp_file.name)
                    temp_file_path = temp_file.name
                uploaded_file = course_processor.process_and_store_course_file(
                    file_path=temp_file_path,
                    filename=filename,
                    course_id=course_id,
                    user_id=current_user_id
                )
                with open(temp_file_path, 'rb') as temp_file_obj:
                    upload_file_to_s3(temp_file_obj, s3_path)
            except Exception as e:
                print(f"Processing error: {str(e)}")
                upload_file_to_s3(file, s3_path)
            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        else:
            upload_file_to_s3(file, s3_path)
        file_path = s3_path
        file_url = s3_path
        combo_id = f"{course_id}+{current_user_id}+{filename}"
        thumbnail_path = None
        if file_extension == 'pdf' and fitz is not None:
            try:
                import tempfile
                import boto3
                from app.utils.s3 import get_s3_client
                s3_client = get_s3_client()
                bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                    s3_client.download_fileobj(bucket_name, file_path, temp_pdf)
                    temp_pdf_path = temp_pdf.name
                doc = fitz.open(temp_pdf_path)
                page = doc.load_page(0)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                thumb_filename = f"{os.path.splitext(filename)[0]}_thumb.png"
                with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_thumb:
                    pix.save(temp_thumb.name)
                    temp_thumb_path = temp_thumb.name
                s3_thumb_path = f"thumbnails/{course_id}/{thumb_filename}"
                with open(temp_thumb_path, 'rb') as thumb_file:
                    upload_file_to_s3(thumb_file, s3_thumb_path)
                thumbnail_path = s3_thumb_path
                os.unlink(temp_thumb_path)
                doc.close()
            except Exception as e:
                print(f"Failed to generate PDF thumbnail: {e}")
        material = UserCourseMaterial(
            user_id=current_user_id,
            course_id=f"{course_id}+{current_user_id}",
            file_path=file_path,
            material_name=filename,
            is_pinned=False,
            last_accessed=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            thumbnail_path=thumbnail_path,
            file_type=file_extension,
            file_size=None,
            original_filename=filename
        )
        db.session.add(material)
        db.session.commit()
        
        # Generate presigned URLs for response (like course banners and list materials)
        from app.utils.s3 import get_presigned_url
        presigned_file_url = get_presigned_url(file_url) if file_url else None
        presigned_thumbnail_url = get_presigned_url(thumbnail_path) if thumbnail_path else None
        
        return jsonify({
            'url': presigned_file_url, 
            'filename': filename,
            'thumbnail_url': presigned_thumbnail_url
        }), 201
    except Exception as e:
        print("Exception in upload_material:", e)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials', methods=['GET'])
@jwt_required()
def list_materials(course_id):
    s3_prefix = f"courses/{course_id}/"
    files_data = list_files_in_s3(s3_prefix)
    filtered_files = []
    for file_data in files_data:
        if 'banner' in file_data['key'].lower():
            continue
        file_data['name'] = os.path.basename(file_data['key'])
        filtered_files.append(file_data)
    return jsonify(filtered_files)

@courses_bp.route('/<course_id>/materials/<path:filename>', methods=['DELETE'])
@jwt_required()
def delete_material(course_id, filename):
    current_user_id = get_jwt_identity()
    try:
        actual_filename = filename.split('/')[-1] if '/' in filename else filename
        file_extension = actual_filename.rsplit('.', 1)[1].lower() if '.' in actual_filename else ''
        supported_types = ['pdf', 'docx', 'doc', 'txt']
        should_have_vectors = file_extension in supported_types
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
        delete_file_from_s3(filename)
        return jsonify({'message': 'File deleted successfully from S3'}), 200
    except Exception as e:
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/<path:filename>/content', methods=['GET'])
@jwt_required()
def get_material_content(course_id, filename):
    current_user_id = get_jwt_identity()
    try:
        actual_filename = filename.split('/')[-1] if '/' in filename else filename
        file_extension = actual_filename.rsplit('.', 1)[1].lower() if '.' in actual_filename else ''
        supported_types = ['pdf', 'docx', 'doc', 'txt']
        if file_extension not in supported_types:
            return jsonify({'error': 'File type not supported for content extraction'}), 400
        import tempfile
        import boto3
        from app.utils.s3 import get_s3_client
        s3_client = get_s3_client()
        bucket_name = current_app.config['AWS_STORAGE_BUCKET_NAME']
        s3_key = f"courses/{course_id}/{actual_filename}"
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
            try:
                s3_client.download_fileobj(bucket_name, s3_key, temp_file)
                temp_file_path = temp_file.name
                content = extract_text_from_file(temp_file_path, file_extension)
                return jsonify({
                    'content': content,
                    'filename': actual_filename,
                    'file_type': file_extension
                })
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
    except Exception as e:
        print(f"Error getting material content: {str(e)}")
        return jsonify({'error': f'Failed to get content: {str(e)}'}), 500

def extract_text_from_file(file_path, file_type):
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

@courses_bp.route('/<course_id>/materials/db', methods=['GET'])
@jwt_required()
def list_user_course_materials(course_id):
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    materials = UserCourseMaterial.query.filter_by(course_id=combo_id, user_id=current_user_id).order_by(UserCourseMaterial.created_at.desc()).all()
    result = []
    for m in materials:
        d = m.to_dict()
        from app.utils.s3 import get_presigned_url
        d['url'] = get_presigned_url(d['file_path']) if d['file_path'] else None
        d['thumbnail_url'] = get_presigned_url(d['thumbnail_path']) if d.get('thumbnail_path') else None
        result.append(d)
    return jsonify(result), 200

@courses_bp.route('/<course_id>/materials/db/<material_id>', methods=['PATCH', 'PUT'])
@jwt_required()
def update_user_course_material(course_id, material_id):
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    material = UserCourseMaterial.query.filter_by(id=material_id, course_id=combo_id, user_id=current_user_id).first_or_404()
    data = request.get_json()
    updated = False
    if 'material_name' in data:
        material.material_name = data['material_name']
        updated = True
    if 'is_pinned' in data:
        material.is_pinned = data['is_pinned']
        updated = True
    if updated:
        material.updated_at = datetime.utcnow()
        db.session.commit()
    return jsonify(material.to_dict()), 200

@courses_bp.route('/<course_id>/materials/db/<material_id>', methods=['DELETE'])
@jwt_required()
def delete_user_course_material(course_id, material_id):
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        # Find the material in the database
        material = UserCourseMaterial.query.filter_by(
            id=material_id, 
            course_id=combo_id, 
            user_id=current_user_id
        ).first_or_404()
        
        # Get material info before deletion
        file_path = material.file_path
        material_name = material.material_name
        file_type = material.file_type
        thumbnail_path = material.thumbnail_path
        
        # Delete vector embeddings if file type supports it
        supported_types = ['pdf', 'docx', 'doc', 'txt']
        if file_type and file_type.lower() in supported_types:
            try:
                from app.utils.llama_index_service import LlamaIndexService
                llama_service = LlamaIndexService()
                llama_service.delete_document_embeddings(
                    user_id=current_user_id,
                    course_id=course_id,
                    document_name=material_name
                )
            except Exception as e:
                print(f"Warning: Failed to delete embeddings for {material_name}: {str(e)}")
        
        # Delete from S3 (main file)
        if file_path:
            try:
                from app.utils.s3 import delete_file_from_s3
                delete_file_from_s3(file_path)
            except Exception as e:
                print(f"Warning: Failed to delete file from S3: {file_path}: {str(e)}")
        
        # Delete thumbnail from S3 if exists
        if thumbnail_path:
            try:
                from app.utils.s3 import delete_file_from_s3
                delete_file_from_s3(thumbnail_path)
            except Exception as e:
                print(f"Warning: Failed to delete thumbnail from S3: {thumbnail_path}: {str(e)}")
        
        # Delete from database
        db.session.delete(material)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Material deleted successfully from database and S3'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting material {material_id}: {str(e)}")
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/db/<material_id>/access', methods=['POST'])
@jwt_required()
def update_last_accessed(course_id, material_id):
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    material = UserCourseMaterial.query.filter_by(id=material_id, course_id=combo_id, user_id=current_user_id).first_or_404()
    material.last_accessed = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'last_accessed': material.last_accessed.isoformat()}), 200 

@courses_bp.route('/<course_id>/materials/db/migrate', methods=['POST'])
@jwt_required()
def migrate_existing_materials_to_db(course_id):
    current_user_id = get_jwt_identity()
    from app.utils.s3 import list_files_in_s3
    from app.models.course import Course
    combo_id = f"{course_id}+{current_user_id}"
    course_row = Course.query.filter_by(combo_id=combo_id, user_id=current_user_id).first()
    if not course_row:
        return jsonify({'error': f'User is not enrolled in course {combo_id}.'}), 400
    s3_prefix = f"courses/{course_id}/"
    files_data = list_files_in_s3(s3_prefix)
    migrated = []
    for file_data in files_data:
        key = file_data['key']
        filename = os.path.basename(key)
        if 'banner' in filename.lower() or filename.startswith('.'):
            continue
        material_combo_id = f"{combo_id}+{filename}"
        exists = UserCourseMaterial.query.filter_by(course_id=combo_id, user_id=current_user_id).filter(UserCourseMaterial.material_name == filename).first()
        if exists:
            continue
        file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        material = UserCourseMaterial(
            user_id=current_user_id,
            course_id=combo_id,  # Store the combo_id value in the course_id column
            file_path=key,
            material_name=filename,
            is_pinned=False,
            last_accessed=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            thumbnail_path=None,
            file_type=file_extension,
            file_size=file_data.get('size'),
            original_filename=filename
        )
        db.session.add(material)
        migrated.append(filename)
    db.session.commit()
    return jsonify({'success': True, 'migrated': migrated, 'count': len(migrated)}), 200

@courses_bp.route('/<course_id>/materials/generate-quiz', methods=['POST'])
@jwt_required()
def generate_course_quiz(course_id):
    """Generate quiz from course materials with fine-grained control"""
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        data = request.get_json() or {}
        
        topic = data.get('topic')
        num_questions = data.get('num_questions', 5)
        question_type = data.get('type', 'multiple_choice')
        question_config = data.get('question_config')  # Fine-grained configuration
        
        # Initialize course RAG service
        from app.services.rag_service import RAGService
        rag = RAGService()

        result = rag.generate_quiz(
            topic=topic,
            num_questions=num_questions,
            question_type=question_type,
            question_config=question_config
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error generating course quiz: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/save-quiz', methods=['POST'])
@jwt_required()
def save_quiz_as_material(course_id):
    """Save generated quiz as a material in the database"""
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        print(f"DEBUG: Save quiz endpoint called for course {course_id} by user {current_user_id}")
        data = request.get_json()
        print(f"DEBUG: Received data: {data is not None}")
        
        if not data:
            print("ERROR: No data provided")
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['quiz_data', 'material_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        quiz_data = data.get('quiz_data')
        material_name = data.get('material_name')
        print(f"DEBUG: Quiz data type: {type(quiz_data)}, Material name: {material_name}")
        
        # Create a JSON file content for the quiz
        import json
        quiz_content = json.dumps(quiz_data, indent=2)
        print(f"DEBUG: Quiz content length: {len(quiz_content)}")
        
        # Generate a unique filename for the quiz
        quiz_filename = f"quiz_{uuid.uuid4()}.json"
        print(f"DEBUG: Generated filename: {quiz_filename}")
        
        # Save to S3 with quiz content
        from app.utils.s3 import upload_file_to_s3
        from io import BytesIO
        
        file_buffer = BytesIO(quiz_content.encode('utf-8'))
        file_buffer.seek(0)
        
        s3_path = f"courses/{combo_id}/materials/{quiz_filename}"
        print(f"DEBUG: Uploading to S3 path: {s3_path}")
        
        # Use the S3 upload function which will set the correct content type
        s3_url = upload_file_to_s3(file_buffer, s3_path)
        print(f"DEBUG: S3 upload result: {s3_url}")
        
        if not s3_url:
            print("ERROR: Failed to upload to S3")
            return jsonify({'error': 'Failed to upload quiz to storage'}), 500
        
        # Create database record
        material = UserCourseMaterial(
            user_id=current_user_id,
            course_id=combo_id,
            file_path=s3_path,
            material_name=material_name,
            is_pinned=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            file_type='quiz',
            file_size=len(quiz_content),
            original_filename=f"{material_name}.json"
        )
        
        db.session.add(material)
        print("DEBUG: Added material to session")
        db.session.commit()
        print("DEBUG: Committed to database")
        
        # Return the saved material data
        result = material.to_dict()
        presigned_url = get_presigned_url(result['file_path']) if result['file_path'] else None
        result['url'] = presigned_url
        print(f"DEBUG: Generated presigned URL: {presigned_url}")
        print(f"DEBUG: Returning success response")
        
        return jsonify({
            'success': True,
            'material': result,
            'message': 'Quiz saved successfully as material'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Exception in save_quiz_as_material: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to save quiz: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/<material_id>/quiz-data', methods=['GET'])
@jwt_required()
def get_quiz_data(course_id, material_id):
    """Fetch quiz data from S3 through backend to avoid CORS issues"""
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        print(f"DEBUG: Getting quiz data for material {material_id} in course {course_id}")
        
        # Find the material in the database
        material = UserCourseMaterial.query.filter_by(
            id=material_id,
            user_id=current_user_id,
            course_id=combo_id,
            file_type='quiz'
        ).first()
        
        if not material:
            return jsonify({'error': 'Quiz not found or unauthorized'}), 404
        
        print(f"DEBUG: Found material with file_path: {material.file_path}")
        
        # Download the quiz data from S3
        from app.utils.s3 import download_file_from_s3
        import json
        
        quiz_content = download_file_from_s3(material.file_path)
        if not quiz_content:
            return jsonify({'error': 'Failed to load quiz data from storage'}), 500
        
        # Parse the JSON content
        quiz_data = json.loads(quiz_content)
        print(f"DEBUG: Successfully loaded quiz data")
        
        return jsonify({
            'success': True,
            'quiz_data': quiz_data,
            'material_name': material.material_name
        }), 200
        
    except Exception as e:
        print(f"ERROR: Exception in get_quiz_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to load quiz data: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/save-flashcards', methods=['POST'])
@jwt_required()
def save_flashcards_as_material(course_id):
    """Save generated flashcards as a material in the database"""
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        print(f"DEBUG: Save flashcards endpoint called for course {course_id} by user {current_user_id}")
        data = request.get_json()
        print(f"DEBUG: Received data: {data is not None}")
        
        if not data:
            print("ERROR: No data provided")
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['flashcards_data', 'material_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        flashcards_data = data.get('flashcards_data')
        material_name = data.get('material_name')
        print(f"DEBUG: Flashcards data type: {type(flashcards_data)}, Material name: {material_name}")
        
        # Create a JSON file content for the flashcards
        import json
        flashcards_content = json.dumps(flashcards_data, indent=2)
        print(f"DEBUG: Flashcards content length: {len(flashcards_content)}")
        
        # Generate a unique filename for the flashcards
        flashcards_filename = f"flashcards_{uuid.uuid4()}.json"
        print(f"DEBUG: Generated filename: {flashcards_filename}")
        
        # Save to S3 with flashcards content
        from app.utils.s3 import upload_file_to_s3
        from io import BytesIO
        
        file_buffer = BytesIO(flashcards_content.encode('utf-8'))
        file_buffer.seek(0)
        
        s3_path = f"courses/{combo_id}/materials/{flashcards_filename}"
        print(f"DEBUG: Uploading to S3 path: {s3_path}")
        
        # Use the S3 upload function which will set the correct content type
        s3_url = upload_file_to_s3(file_buffer, s3_path)
        print(f"DEBUG: S3 upload result: {s3_url}")
        
        if not s3_url:
            print("ERROR: Failed to upload to S3")
            return jsonify({'error': 'Failed to upload flashcards to storage'}), 500
        
        # Create database record
        material = UserCourseMaterial(
            user_id=current_user_id,
            course_id=combo_id,
            file_path=s3_path,
            material_name=material_name,
            is_pinned=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            file_type='flashcards',
            file_size=len(flashcards_content),
            original_filename=f"{material_name}.json"
        )
        
        db.session.add(material)
        print("DEBUG: Added material to session")
        db.session.commit()
        print("DEBUG: Committed to database")
        
        # Return the saved material data
        result = material.to_dict()
        presigned_url = get_presigned_url(result['file_path']) if result['file_path'] else None
        result['url'] = presigned_url
        print(f"DEBUG: Generated presigned URL: {presigned_url}")
        print(f"DEBUG: Returning success response")
        
        return jsonify({
            'success': True,
            'material': result,
            'message': 'Flashcards saved successfully as material'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Exception in save_flashcards_as_material: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to save flashcards: {str(e)}'}), 500

@courses_bp.route('/<course_id>/materials/<material_id>/flashcards', methods=['GET'])
@jwt_required()
def get_flashcards_data(course_id, material_id):
    """Get flashcards data from a saved material"""
    current_user_id = get_jwt_identity()
    combo_id = f"{course_id}+{current_user_id}"
    
    try:
        print(f"DEBUG: Get flashcards data endpoint called for material {material_id}")
        
        # Find the material
        material = UserCourseMaterial.query.filter_by(
            id=material_id,
            user_id=current_user_id,
            course_id=combo_id,
            file_type='flashcards'
        ).first()
        
        if not material:
            return jsonify({'error': 'Flashcards material not found'}), 404
        
        print(f"DEBUG: Found material: {material.material_name}")
        
        # Download the file from S3
        from app.utils.s3 import download_file_from_s3
        file_content = download_file_from_s3(material.file_path)
        
        if not file_content:
            return jsonify({'error': 'Failed to load flashcards from storage'}), 500
        
        # Parse the JSON content
        import json
        flashcards_data = json.loads(file_content)
        print(f"DEBUG: Loaded flashcards data successfully")
        
        return jsonify({
            'success': True,
            'flashcards_data': flashcards_data,
            'material_name': material.material_name
        }), 200
        
    except Exception as e:
        print(f"ERROR: Exception in get_flashcards_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to load flashcards data: {str(e)}'}), 500