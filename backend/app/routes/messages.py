from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.message import Message
from app.init import db
from datetime import datetime
from app.extensions import socketio
from flask_socketio import join_room
from app.models.user_course_material import UserCourseMaterial
from app.models.course import Course

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

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
        
        # Get all direct messages where the current user is either sender or receiver
        messages = Message.query.filter(
            (Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)
        ).order_by(Message.timestamp.desc()).all()

        # Group direct messages by conversation (other user)
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
                    'type': 'direct',
                    'participant_name': other_user_name,
                    'last_message': message.message_content,
                    'last_message_time': message.timestamp.isoformat(),
                    'unread_count': 0,  # TODO: Implement unread count
                    'is_active': True
                }

        # --- GROUP CHAT SUPPORT ---
        # Import models only when needed to avoid circular imports
        try:
            from app.models.chat import ChatGroup, ChatGroupMember, ChatMessage
            print(f"[DEBUG] Successfully imported group chat models")

            # Get all group memberships for the current user
            group_memberships = ChatGroupMember.query.filter_by(user_id=current_user_id).all()
            print(f"[DEBUG] Found {len(group_memberships)} group memberships for user {current_user_id}")
            
            for membership in group_memberships:
                try:
                    group = ChatGroup.query.get(membership.group_id)
                    print(f"[DEBUG] Processing group {membership.group_id}, group exists: {group is not None}")
                    
                    if not group or not group.is_active:
                        print(f"[DEBUG] Skipping group {membership.group_id} - inactive or not found")
                        continue
                        
                    print(f"[DEBUG] Group details: id={group.id}, name={group.name}, is_active={group.is_active}")
                    
                    # Get last message in the group
                    last_message = ChatMessage.query.filter_by(group_id=group.id).order_by(ChatMessage.sent_at.desc()).first()
                    last_message_content = last_message.content if last_message else None
                    last_message_time = last_message.sent_at.isoformat() if last_message else None
                    print(f"[DEBUG] Last message: content={last_message_content}, time={last_message_time}")

                    # Get actual participant names from group members
                    group_members = ChatGroupMember.query.filter_by(group_id=group.id).all()
                    print(f"[DEBUG] Found {len(group_members)} members in group {group.id}")
                    
                    participant_names = []
                    for member in group_members:
                        if member.user_id != current_user_id:  # Exclude current user
                            user = User.query.get(member.user_id)
                            if user:
                                participant_names.append(user.name)
                                print(f"[DEBUG] Added participant: {user.name}")

                    group_data = {
                        'id': group.id,
                        'type': 'group',
                        'group_name': group.name,  # Fixed: use group.name instead of group.group_name
                        'participant_names': participant_names,
                        'last_message': last_message_content,
                        'last_message_time': last_message_time,
                        'unread_count': 0,  # TODO: Implement unread count for group
                        'is_active': True
                    }
                    
                    conversations[group.id] = group_data
                    print(f"[DEBUG] Added group conversation: {group_data}")
                    
                except Exception as group_error:
                    print(f"[ERROR] Error processing group {membership.group_id}: {str(group_error)}")
                    import traceback
                    traceback.print_exc()
                    continue
                    
        except Exception as import_error:
            print(f"[ERROR] Error importing group chat models: {str(import_error)}")
            import traceback
            traceback.print_exc()

        # Convert to list and sort by last message time (None values go last)
        print(f"[DEBUG] Total conversations before sorting: {len(conversations)}")
        conversations_list = list(conversations.values())
        conversations_list.sort(key=lambda x: x['last_message_time'] or '', reverse=True)
        
        print(f"[DEBUG] Returning {len(conversations_list)} conversations")
        return jsonify({
            'success': True,
            'conversations': conversations_list
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Error in get_conversations: {str(e)}")
        import traceback
        traceback.print_exc()
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
    """Get all messages between current user and another user OR group messages if other_user_id is a group ID"""
    try:
        current_user_id = get_jwt_identity()
        
        # First, check if other_user_id is actually a group ID
        try:
            from app.models.chat import ChatGroup, ChatGroupMember, ChatMessage
            
            # Check if this is a group ID by looking for a ChatGroup with this ID
            group = ChatGroup.query.get(other_user_id)
            if group:
                print(f"[DEBUG] Fetching group messages for group {other_user_id}")
                
                # Verify the current user is a member of this group
                membership = ChatGroupMember.query.filter_by(
                    group_id=other_user_id, 
                    user_id=current_user_id
                ).first()
                
                if not membership:
                    return jsonify({
                        'success': False,
                        'error': 'Not a member of this group'
                    }), 403
                
                # Get all group messages
                group_messages = ChatMessage.query.filter_by(
                    group_id=other_user_id
                ).order_by(ChatMessage.sent_at.asc()).all()
                
                messages_data = []
                for message in group_messages:
                    try:
                        msg_dict = message.to_dict()
                        msg_dict['is_own'] = message.sender_id == current_user_id
                        
                        # Add sender name for group messages
                        if message.sender:
                            msg_dict['sender_name'] = message.sender.name
                        else:
                            msg_dict['sender_name'] = 'Unknown User'
                        
                        messages_data.append(msg_dict)
                        
                    except Exception as msg_error:
                        print(f"[ERROR] Error processing group message {message.id}: {str(msg_error)}")
                        continue
                
                print(f"[DEBUG] Returning {len(messages_data)} group messages")
                return jsonify({
                    'success': True,
                    'messages': messages_data
                }), 200
        
        except ImportError:
            print("[DEBUG] Group chat models not available, treating as direct message")
        
        # If not a group, treat as direct message
        print(f"[DEBUG] Fetching direct messages between {current_user_id} and {other_user_id}")
        
        # Get all messages between the two users
        messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == other_user_id)) |
            ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user_id))
        ).order_by(Message.timestamp.asc()).all()
        
        messages_data = []
        for message in messages:
            msg_dict = message.to_dict()
            msg_dict['is_own'] = message.sender_id == current_user_id
            messages_data.append(msg_dict)
        
        return jsonify({
            'success': True,
            'messages': messages_data
        }), 200
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Error in get_messages: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@messages_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to another user, optionally with material attachment"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'receiver_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: receiver_id'
            }), 400
        
        receiver_id = data['receiver_id']
        message_content = data.get('message_content', '').strip()
        material_id = data.get('material_id')
        
        # Verify receiver exists
        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({
                'success': False,
                'error': 'Receiver not found'
            }), 404
        
        # Handle material sharing
        material_preview = None
        message_type = 'text'
        
        if material_id:
            from app.models.user_course_material import UserCourseMaterial
            # Fetch all materials for all courses the user has
            # If material_id is provided, ensure it belongs to the user
            material = UserCourseMaterial.query.filter_by(
                id=material_id,
                user_id=current_user_id
            ).first()
            if not material:
                return jsonify({
                    'success': False,
                    'error': 'Material not found or you do not have access'
                }), 404
            # Optionally, fetch all materials for all courses for other endpoints
            # materials = UserCourseMaterial.query.filter_by(user_id=current_user_id).all()
            message_type = 'material_share'
            material_preview = {
                'id': material.id,
                'name': material.material_name,
                'file_type': material.file_type,
                'file_size': material.file_size,
                'thumbnail_path': material.thumbnail_path,
                'original_filename': material.original_filename,
                'created_at': material.created_at.isoformat() if hasattr(material, 'created_at') else '',
                'course_id': material.course_id,  # Always include course_id
                'course_name': material.course.title if hasattr(material, 'course') and material.course else '',
                'file_path': material.file_path,  # Always include file_path
                'is_pinned': material.is_pinned,
                'last_accessed': material.last_accessed.isoformat() if material.last_accessed else None
            }
            # If no content provided, leave message_content empty for material sharing
        
        if not message_content and not material_id:
            return jsonify({
                'success': False,
                'error': 'Message content cannot be empty'
            }), 400
        
        # Create the message
        new_message = Message(
            user_id=current_user_id,
            sender_id=current_user_id,
            receiver_id=receiver_id,
            message_content=message_content,
            message_type=message_type,
            material_id=material_id,
            material_preview=material_preview
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