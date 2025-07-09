from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.embedding_service import EmbeddingService
from app.models.document_embedding import DocumentEmbedding
import os
import PyPDF2
import docx
from werkzeug.utils import secure_filename

embeddings_bp = Blueprint('embeddings', __name__)
embedding_service = EmbeddingService()

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file_path, file_type):
    """Extract text content from different file types"""
    try:
        if file_type == 'pdf':
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        
        elif file_type in ['docx', 'doc']:
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

@embeddings_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """Upload and process a document for embedding"""
    try:
        user_id = get_jwt_identity()
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get course_id from form data
        course_id = request.form.get('course_id')
        if not course_id:
            return jsonify({'error': 'Course ID is required'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_type = filename.rsplit('.', 1)[1].lower()
        
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.getcwd(), 'uploads', user_id, course_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Extract text from file
        content = extract_text_from_file(file_path, file_type)
        
        if not content.strip():
            return jsonify({'error': 'No text content found in file'}), 400
        
        # Process document and create embeddings
        metadata = {
            'original_filename': filename,
            'file_size': os.path.getsize(file_path),
            'upload_timestamp': str(os.path.getctime(file_path))
        }
        
        embedding_ids = embedding_service.process_document(
            user_id=user_id,
            course_id=course_id,
            document_name=filename,
            document_type=file_type,
            file_path=file_path,
            content=content,
            metadata=metadata
        )
        
        return jsonify({
            'success': True,
            'message': f'Document processed successfully. Created {len(embedding_ids)} embeddings.',
            'document_name': filename,
            'embedding_count': len(embedding_ids),
            'embedding_ids': embedding_ids
        })
    
    except Exception as e:
        print(f"Error uploading document: {e}")
        return jsonify({'error': str(e)}), 500

@embeddings_bp.route('/search', methods=['POST'])
@jwt_required()
def search_documents():
    """Search for documents using semantic search"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        query = data.get('query')
        course_id = data.get('course_id')
        similarity_threshold = data.get('similarity_threshold', 0.7)
        limit = data.get('limit', 5)
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        if not course_id:
            return jsonify({'error': 'Course ID is required'}), 400
        
        # Search for similar documents
        results = embedding_service.search_documents(
            query=query,
            user_id=user_id,
            course_id=course_id,
            similarity_threshold=similarity_threshold,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'results': results,
            'query': query,
            'result_count': len(results)
        })
    
    except Exception as e:
        print(f"Error searching documents: {e}")
        return jsonify({'error': str(e)}), 500

@embeddings_bp.route('/documents/<course_id>', methods=['GET'])
@jwt_required()
def get_course_documents(course_id):
    """Get all documents for a specific course"""
    try:
        user_id = get_jwt_identity()
        
        documents = DocumentEmbedding.get_documents_by_course(user_id, course_id)
        
        # Group by document name
        document_groups = {}
        for doc in documents:
            if doc.document_name not in document_groups:
                document_groups[doc.document_name] = {
                    'document_name': doc.document_name,
                    'document_type': doc.document_type,
                    'file_path': doc.file_path,
                    'chunk_count': 0,
                    'created_at': doc.created_at.isoformat() if doc.created_at else None,
                    'metadata': doc.doc_metadata
                }
            document_groups[doc.document_name]['chunk_count'] += 1
        
        return jsonify({
            'success': True,
            'documents': list(document_groups.values()),
            'total_documents': len(document_groups)
        })
    
    except Exception as e:
        print(f"Error getting course documents: {e}")
        return jsonify({'error': str(e)}), 500

@embeddings_bp.route('/documents/<course_id>/<document_name>', methods=['DELETE'])
@jwt_required()
def delete_document(course_id, document_name):
    """Delete a document and all its embeddings"""
    try:
        user_id = get_jwt_identity()
        
        # Delete embeddings
        embedding_service.delete_document_embeddings(user_id, course_id, document_name)
        
        # Delete the actual file if it exists
        file_path = os.path.join(os.getcwd(), 'uploads', user_id, course_id, document_name)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return jsonify({
            'success': True,
            'message': f'Document {document_name} deleted successfully'
        })
    
    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({'error': str(e)}), 500

@embeddings_bp.route('/documents/<course_id>/<document_name>/summary', methods=['GET'])
@jwt_required()
def get_document_summary(course_id, document_name):
    """Get summary information about a document"""
    try:
        user_id = get_jwt_identity()
        
        summary = embedding_service.get_document_summary(user_id, course_id, document_name)
        
        if 'error' in summary:
            return jsonify(summary), 404
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    
    except Exception as e:
        print(f"Error getting document summary: {e}")
        return jsonify({'error': str(e)}), 500 