# Serve material file for preview (PDF proxy)

from flask import Blueprint, request, jsonify, current_app, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app.models.user_course_material import UserCourseMaterial
from app.models.course import Course
from werkzeug.utils import secure_filename
import os
import tempfile
from ..services.document_processor import DocumentProcessor
from ..services.rag_service import RAGService
from ..models.uploaded_file import UploadedFile
from ..models.material_chunk import MaterialChunk
from ..extensions import db

materials_bp = Blueprint('materials', __name__)

# Get signed URL for material (returns JSON instead of redirect)
@materials_bp.route('/<material_id>/signed-url', methods=['GET'])
def get_material_signed_url(material_id):
    # Check for JWT token in Authorization header or query parameter
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif 'token' in request.args:
        token = request.args.get('token')
    
    if not token:
        abort(401)
    
    try:
        decode_token(token)
    except Exception as e:
        print(f"JWT token validation failed: {str(e)}")
        abort(401)
    
    material = UserCourseMaterial.query.get_or_404(material_id)
    
    # If file_path is a full URL, return it
    if material.file_path.startswith('http://') or material.file_path.startswith('https://'):
        return jsonify({'signed_url': material.file_path}), 200
    
    # If file_path looks like an S3 key, generate signed URL
    if material.file_path and not os.path.isabs(material.file_path):
        try:
            from app.utils.s3 import get_presigned_url
            signed_url = get_presigned_url(material.file_path)
            if signed_url:
                return jsonify({'signed_url': signed_url}), 200
            else:
                print(f"Failed to generate signed URL for S3 key: {material.file_path}")
                abort(404)
        except Exception as e:
            print(f"Error generating signed URL for {material.file_path}: {str(e)}")
            abort(500)
    
    # For local files, we can't return a direct URL
    abort(404)

# Serve material file for preview (PDF proxy)
@materials_bp.route('/<material_id>/view', methods=['GET'])
def view_material(material_id):
    # Check for JWT token in Authorization header or query parameter
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif 'token' in request.args:
        token = request.args.get('token')
    
    if not token:
        abort(401)
    
    try:
        decode_token(token)
    except Exception as e:
        print(f"JWT token validation failed: {str(e)}")
        abort(401)
    
    material = UserCourseMaterial.query.get_or_404(material_id)
    
    # If file_path is a full URL, redirect to it
    if material.file_path.startswith('http://') or material.file_path.startswith('https://'):
        from flask import redirect
        return redirect(material.file_path)
    
    # If file_path looks like an S3 key (e.g., "courses/xxx/file.pdf"), generate signed URL
    if material.file_path and not os.path.isabs(material.file_path):
        try:
            from app.utils.s3 import get_presigned_url
            signed_url = get_presigned_url(material.file_path)
            if signed_url:
                from flask import redirect
                return redirect(signed_url)
            else:
                print(f"Failed to generate signed URL for S3 key: {material.file_path}")
                abort(404)
        except Exception as e:
            print(f"Error generating signed URL for {material.file_path}: {str(e)}")
            abort(500)
    
    # Otherwise, serve from local storage
    from flask import send_file
    if os.path.exists(material.file_path):
        return send_file(material.file_path)
    
    print(f"File not found: {material.file_path}")
    abort(404)

# Endpoint: Get all user materials grouped by course
@materials_bp.route('/all-user-materials', methods=['GET'])
@jwt_required()
def get_all_user_materials():
    """Get all materials for all courses the user is enrolled in, grouped by course"""
    try:
        current_user_id = get_jwt_identity()
        # Get all courses the user is enrolled in
        user_courses = Course.query.filter_by(user_id=current_user_id).all()
        courses_data = []
        for course in user_courses:
            # Cross reference combo_id (course_id + user_id) for UserCourseMaterial
            combo_id = f"{course.id}+{current_user_id}"
            materials = UserCourseMaterial.query.filter_by(course_id=combo_id).all()
            materials_list = []
            for material in materials:
                materials_list.append({
                    'id': material.id,
                    'name': material.material_name,
                    'file_type': material.file_type,
                    'file_size': material.file_size,
                    'thumbnail_path': material.thumbnail_path,
                    'original_filename': material.original_filename,
                    'created_at': material.created_at.isoformat() if hasattr(material, 'created_at') else '',
                    'course_name': course.title,
                    'file_path': material.file_path,
                    'is_pinned': material.is_pinned,
                    'last_accessed': material.last_accessed.isoformat() if material.last_accessed else None
                })
            courses_data.append({
                'course_id': course.id,
                'course_name': course.title,
                'materials': materials_list
            })
        return jsonify({'courses': courses_data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Initialize services
document_processor = DocumentProcessor()
rag_service = RAGService()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@materials_bp.route('/upload', methods=['POST'])
def upload_material():
    """Upload and process a material file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not allowed. Supported types: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Get user_id if provided
        user_id = request.form.get('user_id', type=int)
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Process the file
            uploaded_file = document_processor.process_and_store_file(
                temp_path, filename, user_id
            )
            
            return jsonify({
                'message': 'File uploaded and processed successfully',
                'file': uploaded_file.to_dict()
            }), 201
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return jsonify({'error': f'Failed to upload file: {str(e)}'}), 500

@materials_bp.route('/files', methods=['GET'])
def get_uploaded_files():
    """Get list of uploaded files"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        query = UploadedFile.query
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        files = query.order_by(UploadedFile.uploaded_at.desc()).all()
        
        return jsonify({
            'files': [file.to_dict() for file in files]
        }), 200
        
    except Exception as e:
        print(f"Error getting files: {str(e)}")
        return jsonify({'error': f'Failed to get files: {str(e)}'}), 500

@materials_bp.route('/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete an uploaded file and its chunks"""
    try:
        file = UploadedFile.query.get_or_404(file_id)
        
        # Delete the file (this will cascade delete chunks due to relationship)
        db.session.delete(file)
        db.session.commit()
        
        return jsonify({'message': 'File deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting file: {str(e)}")
        return jsonify({'error': f'Failed to delete file: {str(e)}'}), 500

@materials_bp.route('/files/<int:file_id>/chunks', methods=['GET'])
def get_file_chunks(file_id):
    """Get chunks for a specific file"""
    try:
        file = UploadedFile.query.get_or_404(file_id)
        chunks = MaterialChunk.query.filter_by(file_id=file_id).order_by(MaterialChunk.chunk_index).all()
        
        return jsonify({
            'file': file.to_dict(),
            'chunks': [chunk.to_dict() for chunk in chunks]
        }), 200
        
    except Exception as e:
        print(f"Error getting chunks: {str(e)}")
        return jsonify({'error': f'Failed to get chunks: {str(e)}'}), 500

@materials_bp.route('/ask', methods=['POST'])
def ask_question():
    """Ask a question using RAG"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question']
        top_k = data.get('top_k', 5)
        
        # Get answer using RAG
        result = rag_service.answer_question(question, top_k)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error answering question: {str(e)}")
        return jsonify({'error': f'Failed to answer question: {str(e)}'}), 500

@materials_bp.route('/generate/quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz questions from materials"""
    try:
        data = request.get_json() or {}
        
        topic = data.get('topic')
        num_questions = data.get('num_questions', 5)
        question_type = data.get('type', 'multiple_choice')  # multiple_choice, true_false, open_ended
        
        result = rag_service.generate_quiz(topic, num_questions, question_type)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

@materials_bp.route('/generate/flashcards', methods=['POST'])
def generate_flashcards():
    """Generate flashcards from materials"""
    try:
        data = request.get_json() or {}
        
        topic = data.get('topic')
        num_cards = data.get('num_cards', 10)
        
        result = rag_service.generate_flashcards(topic, num_cards)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error generating flashcards: {str(e)}")
        return jsonify({'error': f'Failed to generate flashcards: {str(e)}'}), 500

@materials_bp.route('/generate/summary', methods=['POST'])
def generate_summary():
    """Generate summary from materials"""
    try:
        data = request.get_json() or {}
        topic = data.get('topic')
        
        result = rag_service.generate_summary(topic)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500

@materials_bp.route('/search', methods=['POST'])
def search_materials():
    """Search through materials using semantic similarity"""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400
        
        query = data['query']
        top_k = data.get('top_k', 10)
        
        # Perform similarity search
        results = document_processor.similarity_search(query, top_k)
        
        # Format results
        search_results = []
        for chunk, distance in results:
            search_results.append({
                'chunk': chunk.to_dict(),
                'similarity_score': 1 - distance,  # Convert distance to similarity
                'file_id': chunk.file_id
            })
        
        return jsonify({
            'query': query,
            'results': search_results,
            'total_found': len(search_results)
        }), 200
        
    except Exception as e:
        print(f"Error searching materials: {str(e)}")
        return jsonify({'error': f'Failed to search materials: {str(e)}'}), 500
