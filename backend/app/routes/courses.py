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

            ],
            max_tokens=2000,
            temperature=0.7
        )

        # Log the full OpenAI response and the raw text
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