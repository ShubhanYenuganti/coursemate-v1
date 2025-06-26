from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.friend import Friend
from app.models.message import Message
from app.init import db
from app.extensions import socketio
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

friends_bp = Blueprint('friends', __name__, url_prefix='/api/friends')

@friends_bp.route('/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    """Send a friend request to another user."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    receiver_id = data.get('receiver_id')

    if not receiver_id:
        return jsonify({'success': False, 'error': 'Receiver ID is required'}), 400

    if receiver_id == current_user_id:
        return jsonify({'success': False, 'error': 'You cannot send a friend request to yourself'}), 400

    receiver = User.query.get(receiver_id)
    if not receiver:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    # Check if a request already exists (in either direction)
    existing_request = Friend.query.filter(
        ((Friend.requester_id == current_user_id) & (Friend.receiver_id == receiver_id)) |
        ((Friend.requester_id == receiver_id) & (Friend.receiver_id == current_user_id))
    ).first()

    if existing_request:
        if existing_request.status == 'accepted':
            return jsonify({'success': False, 'error': 'You are already friends with this user'}), 409
        elif existing_request.status == 'pending':
            return jsonify({'success': False, 'error': 'A friend request is already pending'}), 409
        else: # 'rejected' or 'blocked'
             return jsonify({'success': False, 'error': 'Cannot send friend request'}), 409


    new_request = Friend(requester_id=current_user_id, receiver_id=receiver_id)
    db.session.add(new_request)
    
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Friend request already sent'}), 409

    # Emit WebSocket event to the receiver
    socketio.emit('new_friend_request', {
        'request_id': new_request.id,
        'requester_id': new_request.requester_id,
        'requester_name': new_request.requester.name,
        'requester_email': new_request.requester.email,
        'sent_at': new_request.created_at.isoformat()
    }, room=receiver_id)

    return jsonify({
        'success': True, 
        'message': 'Friend request sent successfully',
        'request': new_request.to_dict()
    }), 201

@friends_bp.route('/respond', methods=['POST'])
@jwt_required()
def respond_to_friend_request():
    """Accept or reject a friend request."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    request_id = data.get('request_id')
    action = data.get('action') # 'accept' or 'reject'

    if not request_id or not action:
        return jsonify({'success': False, 'error': 'Request ID and action are required'}), 400

    if action not in ['accept', 'reject']:
        return jsonify({'success': False, 'error': "Action must be 'accept' or 'reject'"}), 400
    
    friend_request = Friend.query.get(request_id)

    if not friend_request:
        return jsonify({'success': False, 'error': 'Friend request not found'}), 404

    if friend_request.receiver_id != current_user_id:
        return jsonify({'success': False, 'error': 'You are not authorized to respond to this request'}), 403

    if friend_request.status != 'pending':
        return jsonify({'success': False, 'error': f'This request has already been {friend_request.status}'}), 409

    if action == 'accept':
        friend_request.status = 'accepted'
        message = 'Friend request accepted'
        # Emit event to the original requester
        socketio.emit('friend_request_accepted', {
            'friend_id': friend_request.receiver_id,
            'friend_name': friend_request.receiver.name,
            'message': f'{friend_request.receiver.name} accepted your friend request!'
        }, room=friend_request.requester_id)
    else: # action == 'reject'
        friend_request.status = 'rejected'
        message = 'Friend request rejected'
    
    db.session.commit()

    return jsonify({
        'success': True,
        'message': message,
        'request': friend_request.to_dict()
    }), 200

@friends_bp.route('/list', methods=['GET'])
@jwt_required()
def get_friends_list():
    """Get a list of all accepted friends."""
    current_user_id = get_jwt_identity()
    
    # Find all 'accepted' relationships where the user is either the requester or receiver
    friendships = Friend.query.filter(
        Friend.status == 'accepted',
        ((Friend.requester_id == current_user_id) | (Friend.receiver_id == current_user_id))
    ).all()

    friends = []
    for friendship in friendships:
        if friendship.requester_id == current_user_id:
            friend_user = friendship.receiver
        else:
            friend_user = friendship.requester
        
        friends.append({
            'id': friend_user.id,
            'name': friend_user.name,
            'email': friend_user.email
        })

    return jsonify({'success': True, 'friends': friends}), 200

@friends_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_requests():
    """Get a list of all incoming pending friend requests."""
    current_user_id = get_jwt_identity()
    
    pending_requests = Friend.query.filter_by(
        receiver_id=current_user_id, 
        status='pending'
    ).all()
    
    requests_data = []
    for req in pending_requests:
        requests_data.append({
            'request_id': req.id,
            'requester_id': req.requester.id,
            'requester_name': req.requester.name,
            'requester_email': req.requester.email,
            'sent_at': req.created_at.isoformat()
        })

    return jsonify({'success': True, 'pending_requests': requests_data}), 200

@friends_bp.route('/find', methods=['GET'])
@jwt_required()
def find_new_friends():
    """Get a list of users who are not friends with the current user."""
    current_user_id = get_jwt_identity()

    # Get IDs of all users the current user has an accepted friendship with
    friends = Friend.query.filter(
        Friend.status == 'accepted',
        ((Friend.requester_id == current_user_id) | (Friend.receiver_id == current_user_id))
    ).all()
    friend_ids = {f.requester_id if f.receiver_id == current_user_id else f.receiver_id for f in friends}
    friend_ids.add(current_user_id) # Add self to exclusion list

    # Get all users whose IDs are not in the friend_ids set
    non_friend_users = User.query.filter(User.id.notin_(friend_ids)).all()

    users_data = [{
        'id': user.id, 
        'name': user.name, 
        'email': user.email
    } for user in non_friend_users]

    return jsonify({'success': True, 'users': users_data}), 200

@friends_bp.route('/list-for-new-chat', methods=['GET'])
@jwt_required()
def get_friends_for_new_chat():
    """Get a list of friends with whom the user does not have an active chat."""
    current_user_id = get_jwt_identity()

    # 1. Get all accepted friends' IDs
    friendships = Friend.query.filter(
        Friend.status == 'accepted',
        or_(Friend.requester_id == current_user_id, Friend.receiver_id == current_user_id)
    ).all()
    friend_ids = {f.requester_id if f.receiver_id == current_user_id else f.receiver_id for f in friendships}

    # 2. Get IDs of users with whom a conversation already exists
    messages = Message.query.filter(
        or_(Message.sender_id == current_user_id, Message.receiver_id == current_user_id)
    ).all()
    chatting_with_ids = {m.receiver_id if m.sender_id == current_user_id else m.sender_id for m in messages}

    # 3. Find friend IDs that are not in the chatting list
    new_chat_friend_ids = friend_ids - chatting_with_ids

    # 4. Fetch the user objects for these IDs
    if not new_chat_friend_ids:
        return jsonify({'success': True, 'friends': []}), 200
        
    friends_to_chat_with = User.query.filter(User.id.in_(new_chat_friend_ids)).all()
    
    friends_data = [{
        'id': user.id,
        'name': user.name,
        'email': user.email
    } for user in friends_to_chat_with]

    return jsonify({'success': True, 'friends': friends_data}), 200 