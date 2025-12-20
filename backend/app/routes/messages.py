from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.message import Message
from app.init import db
from datetime import datetime
from app.extensions import socketio
from flask_socketio import join_room

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')


@messages_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users for the add chat functionality"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all users except the current user
        users = User.query.filter(User.id != current_user_id).all()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'name': user.name or 'Unknown User',
                'email': user.email,
                'status': 'offline',  # Default status for now
                'avatar': None  # No avatar system yet
            })
        
        return jsonify({
            'success': True,
            'users': users_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all messages where the current user is either sender or receiver
        messages = Message.query.filter(
            (Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)
        ).order_by(Message.timestamp.desc()).all()
        
        # Group messages by conversation (other user)
        conversations = {}
        for message in messages:
            # Determine the other user in the conversation
            if message.sender_id == current_user_id:
                other_user_id = message.receiver_id
                other_user_name = message.receiver.name if message.receiver else 'Unknown User'
            else:
                other_user_id = message.sender_id
                other_user_name = message.sender.name if message.sender else 'Unknown User'
            
            if other_user_id not in conversations:
                conversations[other_user_id] = {
                    'id': other_user_id,
                    'participant_name': other_user_name,
                    'last_message': message.message_content,
                    'last_message_time': message.timestamp.isoformat(),
                    'unread_count': 0,  # TODO: Implement unread count
                    'is_active': True
                }
        
        # Convert to list and sort by last message time
        conversations_list = list(conversations.values())
        conversations_list.sort(key=lambda x: x['last_message_time'], reverse=True)
        
        return jsonify({
            'success': True,
            'conversations': conversations_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/create-conversation', methods=['POST'])
@jwt_required()
def create_conversation():
    """Create a new conversation with an initial message"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'receiver_id' not in data or 'initial_message' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: receiver_id and initial_message'
            }), 400
        
        receiver_id = data['receiver_id']
        initial_message = data['initial_message'].strip()
        
        if not initial_message:
            return jsonify({
                'success': False,
                'error': 'Initial message cannot be empty'
            }), 400
        
        # Verify receiver exists
        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({
                'success': False,
                'error': 'Receiver not found'
            }), 404
        
        # Check if conversation already exists
        existing_message = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == receiver_id)) |
            ((Message.sender_id == receiver_id) & (Message.receiver_id == current_user_id))
        ).first()
        
        if existing_message:
            return jsonify({
                'success': False,
                'error': 'Conversation already exists'
            }), 409
        
        # Create the initial message
        new_message = Message(
            user_id=current_user_id,
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message_content=initial_message
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # Emit WebSocket event to receiver and sender with the correct conversation_id
        # The conversation_id should be the ID of the *other* user in the chat
        
        # Emit to receiver (their conversation is with the current user)
        socketio.emit('new_message', {
            'conversation_id': current_user_id,
            'message': new_message.to_dict()
        }, room=receiver_id)
        
        # Emit to sender (their conversation is with the receiver)
        socketio.emit('new_message', {
            'conversation_id': receiver_id,
            'message': new_message.to_dict()
        }, room=current_user_id)
        
        return jsonify({
            'success': True,
            'message': new_message.to_dict(),
            'conversation_id': receiver_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/messages/<other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    """Get all messages between current user and another user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all messages between the two users
        messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == other_user_id)) |
            ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user_id))
        ).order_by(Message.timestamp.asc()).all()
        
        messages_data = []
        for message in messages:
            messages_data.append({
                'id': message.id,
                'content': message.message_content,
                'timestamp': message.timestamp.isoformat(),
                'is_own': message.sender_id == current_user_id,
                'sender_name': message.sender.name if message.sender else 'Unknown User',
                'receiver_name': message.receiver.name if message.receiver else 'Unknown User'
            })
        
        return jsonify({
            'success': True,
            'messages': messages_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to another user"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'receiver_id' not in data or 'message_content' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: receiver_id and message_content'
            }), 400
        
        receiver_id = data['receiver_id']
        message_content = data['message_content'].strip()
        
        if not message_content:
            return jsonify({
                'success': False,
                'error': 'Message content cannot be empty'
            }), 400
        
        # Verify receiver exists
        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({
                'success': False,
                'error': 'Receiver not found'
            }), 404
        
        # Create the message
        new_message = Message(
            user_id=current_user_id,
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message_content=message_content
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # Emit WebSocket event to receiver and sender with the correct conversation_id
        # The conversation_id should be the ID of the *other* user in the chat
        
        # Emit to receiver (their conversation is with the current user)
        socketio.emit('new_message', {
            'conversation_id': current_user_id,
            'message': new_message.to_dict()
        }, room=receiver_id)
        
        # Emit to sender (their conversation is with the receiver)
        socketio.emit('new_message', {
            'conversation_id': receiver_id,
            'message': new_message.to_dict()
        }, room=current_user_id)
        
        return jsonify({
            'success': True,
            'message': new_message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/conversation/<other_user_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(other_user_id):
    """Delete all messages between the current user and another user (delete a conversation)"""
    try:
        current_user_id = get_jwt_identity()
        # Delete all messages where the current user is either sender or receiver and the other user is the other participant
        Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == other_user_id)) |
            ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user_id))
        ).delete(synchronize_session=False)
        db.session.commit()

        # Emit socket event to both users to notify them of deletion
        # Emit to the user who initiated the delete
        socketio.emit('conversation_deleted', {'conversation_id': other_user_id}, room=current_user_id)
        # Emit to the other user in the chat
        socketio.emit('conversation_deleted', {'conversation_id': current_user_id}, room=other_user_id)

        return jsonify({'success': True, 'message': 'Conversation deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Add a join room event handler
@socketio.on('join')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        join_room(user_id)
        print(f"[SocketIO] User {user_id} joined their room", flush=True)
        # Send confirmation back to client
        socketio.emit('joined', {'user_id': user_id, 'status': 'success'}, room=user_id)
    else:
        print(f"[SocketIO] Join event received without user_id: {data}", flush=True) 