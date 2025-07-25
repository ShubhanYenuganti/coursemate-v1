from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.course import Course
from app.models.user import User
from app.init import db
from datetime import datetime
import sys
import os

# Add the backend directory to the Python path to import chat.py
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, backend_dir)

try:
    from chat import get_chat_wrapper
except ImportError as e:
    print(f"Warning: Could not import chat wrapper: {e}")
    get_chat_wrapper = None

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@chat_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to the AI assistant and get a response"""
    if not get_chat_wrapper:
        return jsonify({
            'success': False,
            'error': 'AI chat service import failed. Please check server configuration.'
        }), 503
    
    chat_wrapper = get_chat_wrapper()
    if not chat_wrapper:
        return jsonify({
            'success': False,
            'error': 'AI chat service is not available. Please check server configuration.'
        }), 503
    
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    message = data.get('message', '').strip()
    course_id = data.get('course_id')
    conversation_history = data.get('conversation_history', [])
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Get course context if course_id is provided
        course_context = None
        materials_context = None
        
        if course_id:
            # Try to find course by combo_id first, then by id
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
            
            if course:
                course_context = f"""
Course: {course.title}
Subject: {course.subject}
Semester: {course.semester}
Professor: {course.professor or 'Not specified'}
Description: {course.description}
"""
                # Use the course-specific RAG service to get materials context
                try:
                    from app.services.course_rag_service import CourseRAGService
                    course_rag_service = CourseRAGService()
                    
                    # Get answer from course-specific materials using the individual course ID
                    rag_result = course_rag_service.answer_question_for_course(
                        question=message,
                        course_id=course.id,  # Use individual course ID for RAG lookup
                        user_id=current_user_id,
                        top_k=5
                    )
                    
                    if rag_result.get('context_used', 0) > 0:
                        # Use the RAG answer directly since it includes context
                        return jsonify({
                            'success': True,
                            'message': {
                                'id': str(int(datetime.now().timestamp() * 1000)),
                                'type': 'ai',
                                'content': rag_result['answer'],
                                'timestamp': datetime.now().isoformat(),
                                'sources': [{'title': filename} for filename in rag_result.get('source_files', [])]
                            },
                            'confidence': rag_result.get('confidence', 0.0),
                            'materials_used': rag_result.get('context_used', 0)
                        })
                    else:
                        # No course materials found, use basic course context
                        materials_context = "No course materials have been uploaded yet for this course."
                        
                except Exception as e:
                    current_app.logger.warning(f"Failed to use course RAG service: {str(e)}")
                    materials_context = "Course materials search temporarily unavailable."
        
        
        
        # Generate AI response
        result = chat_wrapper.generate_response(
            message=message,
            conversation_history=conversation_history,
            course_context=course_context,
            materials_context=materials_context
        )
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': {
                    'id': str(int(datetime.now().timestamp() * 1000)),
                    'type': 'ai',
                    'content': result['response'],
                    'timestamp': result['timestamp'],
                    'sources': result.get('sources', [])
                },
                'usage': result.get('usage', {})
            })
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate response: {str(e)}',
            'error_type': 'server_error'
        }), 500

@chat_bp.route('/summarize', methods=['POST'])
@jwt_required()
def summarize_conversation():
    """Generate a summary of the conversation for saving to memory"""
    if not get_chat_wrapper:
        return jsonify({
            'success': False,
            'error': 'AI chat service import failed.'
        }), 503
    
    chat_wrapper = get_chat_wrapper()
    if not chat_wrapper:
        return jsonify({
            'success': False,
            'error': 'AI chat service is not available.'
        }), 503
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conversation_history = data.get('conversation_history', [])
    
    if not conversation_history:
        return jsonify({'error': 'Conversation history is required'}), 400
    
    try:
        summary = chat_wrapper.summarize_conversation(conversation_history)
        
        return jsonify({
            'success': True,
            'summary': summary,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate summary: {str(e)}'
        }), 500

@chat_bp.route('/health', methods=['GET'])
def health_check():
    """Check if the AI chat service is available"""
    if not get_chat_wrapper:
        return jsonify({
            'status': 'unavailable',
            'message': 'AI chat service import failed'
        }), 503
    
    chat_wrapper = get_chat_wrapper()
    if not chat_wrapper:
        return jsonify({
            'status': 'unavailable',
            'message': 'AI chat service is not configured'
        }), 503

    # Test if OpenAI API key is working (you might want to make this more sophisticated)
    try:
        # Just check if the wrapper is initialized properly
        api_key_configured = bool(chat_wrapper.api_key)
        return jsonify({
            'status': 'available' if api_key_configured else 'misconfigured',
            'message': 'AI chat service is ready' if api_key_configured else 'OpenAI API key not configured',
            'model': chat_wrapper.model if api_key_configured else None
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error checking service: {str(e)}'
        }), 500 