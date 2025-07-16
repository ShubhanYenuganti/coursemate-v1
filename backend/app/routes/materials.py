from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import tempfile
from ..services.document_processor import DocumentProcessor
from ..services.rag_service import RAGService
from ..models.uploaded_file import UploadedFile
from ..models.material_chunk import MaterialChunk
from ..extensions import db

materials_bp = Blueprint('materials', __name__)

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
