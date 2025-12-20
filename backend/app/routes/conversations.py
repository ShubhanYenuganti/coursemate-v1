from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.course import Course
from app.extensions import db
from datetime import datetime
import logging

conversations_bp = Blueprint('conversations', __name__, url_prefix='/api/conversations')

@conversations_bp.route('/<course_id>/conversations', methods=['GET', 'OPTIONS'])
@jwt_required(optional=False)
def list_conversations(course_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Get all conversations for a course and user (max 10, most recent first)"""
    current_user_id = get_jwt_identity()
    
    try:
        # Find the course and get the correct course identifier
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found or access denied'}), 404
        
        # Use combo_id for the conversation lookup
        conversations = Conversation.query.filter_by(
            course_id=course.combo_id,
            user_id=current_user_id,
            is_archived=False
        ).order_by(Conversation.updated_at.desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'conversations': [conv.to_dict() for conv in conversations]
        })
    except Exception as e:
        logging.error(f"Error listing conversations: {str(e)}")
        return jsonify({'error': 'Failed to load conversations'}), 500

@conversations_bp.route('/<course_id>/conversations', methods=['POST', 'OPTIONS'])
@jwt_required(optional=False)
def create_conversation(course_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Create a new conversation for a course"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Verify course access
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found or access denied'}), 404
        
        # Create new conversation using combo_id
        conversation = Conversation(
            course_id=course.combo_id,
            user_id=current_user_id,
            title=data.get('title', 'New Chat')
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'conversation': conversation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating conversation: {str(e)}")
        return jsonify({'error': 'Failed to create conversation'}), 500

@conversations_bp.route('/<conversation_id>', methods=['GET', 'OPTIONS'])
@jwt_required(optional=False)
def get_conversation(conversation_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Get a conversation with all its messages"""
    current_user_id = get_jwt_identity()
    
    try:
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Get messages for this conversation
        messages = ConversationMessage.query.filter_by(
            conversation_id=conversation_id
        ).order_by(ConversationMessage.created_at.asc()).all()
        
        # Build conversation with messages
        conversation_dict = conversation.to_dict()
        conversation_dict['messages'] = [msg.to_dict() for msg in messages]
        
        return jsonify({
            'success': True,
            'conversation': conversation_dict
        })
        
    except Exception as e:
        logging.error(f"Error getting conversation: {str(e)}")
        return jsonify({'error': 'Failed to load conversation'}), 500

@conversations_bp.route('/<conversation_id>', methods=['PUT', 'OPTIONS'])
@jwt_required(optional=False)
def update_conversation(conversation_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Update conversation title or archive status"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Update fields if provided
        if 'title' in data:
            conversation.title = data['title']
        if 'is_archived' in data:
            conversation.is_archived = data['is_archived']
        
        conversation.update_timestamp()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'conversation': conversation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating conversation: {str(e)}")
        return jsonify({'error': 'Failed to update conversation'}), 500

@conversations_bp.route('/<conversation_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required(optional=False)
def delete_conversation(conversation_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Delete a conversation and all its messages"""
    current_user_id = get_jwt_identity()
    
    try:
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Delete conversation (messages will be deleted due to cascade)
        db.session.delete(conversation)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Conversation deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting conversation: {str(e)}")
        return jsonify({'error': 'Failed to delete conversation'}), 500

@conversations_bp.route('/<conversation_id>/messages', methods=['POST', 'OPTIONS'])
@jwt_required(optional=False)
def send_message_to_conversation(conversation_id):
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    """Send a message to a specific conversation"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'error': 'Message content is required'}), 400
    
    message_content = data['message'].strip()
    if not message_content:
        return jsonify({'error': 'Message content cannot be empty'}), 400
    
    try:
        # Verify conversation access
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            user_id=current_user_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Create user message
        user_message = ConversationMessage.create_user_message(
            conversation_id=conversation_id,
            content=message_content
        )
        db.session.add(user_message)
        
        # Get conversation history for AI context
        previous_messages = ConversationMessage.query.filter_by(
            conversation_id=conversation_id
        ).order_by(ConversationMessage.created_at.asc()).all()
        
        # Build conversation context for AI (last 10 messages)
        conversation_context = []
        for msg in previous_messages[-10:]:  # Last 10 messages for context
            conversation_context.append({
                'role': msg.message_type,
                'content': msg.content
            })
        
        # Add current user message to context
        conversation_context.append({
            'role': 'user',
            'content': message_content
        })
        
        # Update conversation title if this is the first message
        if conversation.message_count == 0:
            conversation.title = Conversation.generate_title_from_message(message_content)
        
        # Get AI response using course RAG service
        try:
            from app.services.course_rag_service import CourseRAGService
            course_rag_service = CourseRAGService()
            
            # Find the course to get the individual course ID for RAG lookup
            course = Course.query.filter_by(combo_id=conversation.course_id).first()
            if not course:
                course = Course.query.filter_by(id=conversation.course_id).first()
            
            if course:
                rag_result = course_rag_service.answer_question_for_course(
                    question=message_content,
                    course_id=course.id,  # Use individual course ID for RAG lookup
                    user_id=current_user_id,
                    conversation_context=conversation_context,
                    top_k=5
                )
            else:
                # Fallback if course not found
                rag_result = {
                    'answer': "I couldn't access the course materials right now. Please try again later.",
                    'source_files': [],
                    'confidence': 0.0
                }
            
            # Create assistant message
            assistant_message = ConversationMessage.create_assistant_message(
                conversation_id=conversation_id,
                content=rag_result['answer'],
                source_files=rag_result.get('source_files', []),  # Pass source files directly as strings
                confidence=rag_result.get('confidence', 0.0)
            )
            
        except Exception as ai_error:
            logging.warning(f"AI service error: {str(ai_error)}")
            # Fallback response
            assistant_message = ConversationMessage.create_assistant_message(
                conversation_id=conversation_id,
                content="I apologize, but I'm having trouble processing your question right now. Please try again later.",
                confidence=0.0
            )
        
        db.session.add(assistant_message)
        
        # Update conversation counters
        conversation.increment_message_count()
        conversation.increment_message_count()  # For both user and assistant messages
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': assistant_message.to_dict(),
            'user_message': user_message.to_dict(),
            'conversation': conversation.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error sending message: {str(e)}")
        return jsonify({'error': 'Failed to send message'}), 500
