from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.notification import Notification
from app.models.user import User
from app.models.course import Course
from app.models.friend import Friend
from app.init import db
from app.extensions import socketio
from datetime import datetime
from sqlalchemy import and_, cast, String

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get all notifications for the current user"""
    current_user_id = get_jwt_identity()
    
    # Parse query parameters
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 50))
    
    query = Notification.query.filter_by(user_id=current_user_id)
    
    if unread_only:
        query = query.filter_by(is_read=False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'notifications': [notification.to_dict() for notification in notifications]
    }), 200

@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    current_user_id = get_jwt_identity()
    
    notification = Notification.query.filter_by(
        id=notification_id, 
        user_id=current_user_id
    ).first()
    
    if not notification:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    notification.mark_as_read()
    
    return jsonify({
        'success': True,
        'message': 'Notification marked as read'
    }), 200

@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for the current user"""
    current_user_id = get_jwt_identity()
    
    Notification.query.filter_by(
        user_id=current_user_id,
        is_read=False
    ).update({'is_read': True})
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'All notifications marked as read'
    }), 200

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification"""
    current_user_id = get_jwt_identity()
    
    notification = Notification.query.filter_by(
        id=notification_id, 
        user_id=current_user_id
    ).first()
    
    if not notification:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Notification deleted'
    }), 200

@notifications_bp.route('/course-invite', methods=['POST'])
@jwt_required()
def send_course_invite():
    """Send a course invite to a friend"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    course_combo_id = data.get('course_id')  # Now expects combo_id from frontend
    friend_id = data.get('friend_id')
    role = data.get('role', 'Enrolled')  # Default to 'Enrolled' role

    print(f"[DEBUG] Received course_combo_id: {course_combo_id} for user_id: {current_user_id}")
    
    if not course_combo_id or not friend_id:
        return jsonify({'success': False, 'error': 'Course combo_id and friend ID are required'}), 400
    
    # Verify the course exists and belongs to the current user
    course = Course.query.filter_by(combo_id=course_combo_id, user_id=current_user_id).first()
    print(f"[DEBUG] Course lookup result: {course}")
    if not course:
        return jsonify({'success': False, 'error': 'Course not found or access denied'}), 404
    
    # Verify the friend exists and is actually a friend
    friendship = Friend.query.filter(
        Friend.status == 'accepted',
        ((Friend.requester_id == current_user_id) & (Friend.receiver_id == friend_id)) |
        ((Friend.requester_id == friend_id) & (Friend.receiver_id == current_user_id))
    ).first()
    
    if not friendship:
        return jsonify({'success': False, 'error': 'User is not your friend'}), 403
    
    # Get the friend's user object
    friend_user = User.query.get(friend_id)
    if not friend_user:
        return jsonify({'success': False, 'error': 'Friend not found'}), 404
    
    # Check if a notification already exists for this course invite
    existing_notification = Notification.query.filter(
        Notification.user_id == friend_id,
        Notification.sender_id == current_user_id,
        Notification.type == 'course_invite',
        cast(Notification.data['course_id'], String) == str(course_combo_id)
    ).first()
    
    if existing_notification:
        return jsonify({'success': False, 'error': 'Course invite already sent'}), 409
    
    # Create the notification
    notification = Notification(
        user_id=friend_id,
        sender_id=current_user_id,
        type='course_invite',
        title=f'Course Invitation: {course.title}',
        message=f'{User.query.get(current_user_id).name} has invited you to join their course "{course.title}" as a {role}.',
        data={
            'course_id': course_combo_id,  # combo_id
            'course_title': course.title,
            'role': role,
            'sender_name': User.query.get(current_user_id).name
        }
    )
    
    db.session.add(notification)
    db.session.commit()
    
    # Emit WebSocket event to the friend
    socketio.emit('new_notification', {
        'notification': notification.to_dict()
    }, room=friend_id)
    
    return jsonify({
        'success': True,
        'message': 'Course invite sent successfully',
        'notification': notification.to_dict()
    }), 201

@notifications_bp.route('/course-invite/<notification_id>/respond', methods=['POST'])
@jwt_required()
def respond_to_course_invite(notification_id):
    """Respond to a course invite (accept/decline)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    action = data.get('action')  # 'accept' or 'decline'
    
    if action not in ['accept', 'decline']:
        return jsonify({'success': False, 'error': 'Action must be accept or decline'}), 400
    
    # Get the notification
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=current_user_id,
        type='course_invite'
    ).first()
    
    if not notification:
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    course_combo_id = notification.data.get('course_id')  # combo_id
    sender_id = notification.sender_id
    
    if action == 'accept':
        # Get the original course row (from the sender)
        original_course = Course.query.filter_by(combo_id=course_combo_id).first()
        if not original_course:
            return jsonify({'success': False, 'error': 'Course not found'}), 404

        # Check if already enrolled
        existing = Course.query.filter_by(id=original_course.id, user_id=current_user_id).first()
        if existing:
            return jsonify({'success': False, 'error': 'You are already enrolled in this course.'}), 409

        # Create a new course instance for the invited user with the same id (shared UUID), but new combo_id
        new_course = Course(
            id=original_course.id,  # Use the same shared course UUID
            user_id=current_user_id,
            combo_id=f"{original_course.id}+{current_user_id}",
            title=original_course.title,
            subject=original_course.subject,
            course_code=original_course.course_code,
            semester=original_course.semester,
            professor=original_course.professor,
            units=original_course.units,
            variable_units=original_course.variable_units,
            description=original_course.description,
            visibility='Private',  # Start as private for invited users
            tags=original_course.tags,
            collaborators=original_course.collaborators,
            badge='Enrolled',  # User is enrolled, not creator
            course_image=original_course.course_image,
            materials=original_course.materials
        )
        db.session.add(new_course)
        
        # Send notification back to the original sender
        sender_notification = Notification(
            user_id=sender_id,
            sender_id=current_user_id,
            type='course_invite_accepted',
            title=f'Course Invite Accepted: {original_course.title}',
            message=f'{User.query.get(current_user_id).name} has accepted your invitation to join "{original_course.title}".',
            data={
                'course_id': course_combo_id,  # combo_id
                'course_title': original_course.title,
                'accepted_by_name': User.query.get(current_user_id).name
            }
        )
        db.session.add(sender_notification)
        
        # Emit WebSocket event to the original sender
        socketio.emit('new_notification', {
            'notification': sender_notification.to_dict()
        }, room=sender_id)
    
    # Mark the original notification as read and delete it
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Course invite {action}ed successfully'
    }), 200

@notifications_bp.route('/course/<course_id>/enrolled-users', methods=['GET'])
@jwt_required()
def get_enrolled_users(course_id):
    """List all users enrolled in a course (excluding the creator)."""
    current_user_id = get_jwt_identity()
    print(f"[DEBUG] get_enrolled_users called with course_id: {course_id} by user: {current_user_id}")
    # Ensure the current user is the creator (shared id)
    creator_course = Course.query.filter_by(id=course_id, user_id=current_user_id, badge='Creator').first()
    print(f"[DEBUG] creator_course: {creator_course}")
    if not creator_course:
        return jsonify({'success': False, 'error': 'Only the creator can view enrolled users.'}), 403
    # Get all enrolled users (badge='Enrolled') for this course id
    enrolled_courses = Course.query.filter_by(id=course_id, badge='Enrolled').all()
    print(f"[DEBUG] enrolled_courses: {enrolled_courses}")
    users = [User.query.get(c.user_id).to_dict() for c in enrolled_courses]
    return jsonify({'success': True, 'enrolled_users': users}), 200

@notifications_bp.route('/course/<course_id>/remove-user/<user_id>', methods=['DELETE'])
@jwt_required()
def remove_enrolled_user(course_id, user_id):
    """Remove an enrolled user from a course (delete their course row). 'me' means the current user."""
    current_user_id = get_jwt_identity()
    # Allow enrolled users to remove themselves
    if user_id == 'me':
        user_id = current_user_id
    # If not self-removal, ensure the current user is the creator
    if user_id != current_user_id:
        creator_course = Course.query.filter_by(id=course_id, user_id=current_user_id, badge='Creator').first()
        if not creator_course:
            return jsonify({'success': False, 'error': 'Only the creator can remove users.'}), 403
    # Find the enrolled user's course row
    enrolled_course = Course.query.filter_by(id=course_id, user_id=user_id, badge='Enrolled').first()
    if not enrolled_course:
        return jsonify({'success': False, 'error': 'Enrolled user not found.'}), 404
    db.session.delete(enrolled_course)
    db.session.commit()
    # Emit real-time notification to the removed user (if not self-removal)
    if user_id != current_user_id:
        socketio.emit('course_user_removed', {
            'course_id': course_id,
            'removed_by': current_user_id
        }, room=user_id)
    return jsonify({'success': True, 'message': 'User removed from course.'}), 200

@notifications_bp.route('/course/<course_id>/update-visibility', methods=['POST'])
@jwt_required()
def update_course_visibility(course_id):
    """Update course visibility. If set to Private, remove all enrolled users (with confirmation)."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    new_visibility = data.get('visibility')
    confirm_remove = data.get('confirm_remove', False)
    # Ensure the current user is the creator
    creator_course = Course.query.filter_by(id=course_id, user_id=current_user_id, badge='Creator').first()
    if not creator_course:
        return jsonify({'success': False, 'error': 'Only the creator can update visibility.'}), 403
    if new_visibility not in ['Private', 'Friends Only', 'Public', 'Only Me']:
        return jsonify({'success': False, 'error': 'Invalid visibility value.'}), 400
    # If switching to Private, require confirmation and remove all enrolled users
    if new_visibility == 'Private':
        if not confirm_remove:
            return jsonify({'success': False, 'error': 'Confirmation required to remove all enrolled users.'}), 400
        enrolled_courses = Course.query.filter_by(id=course_id, badge='Enrolled').all()
        for c in enrolled_courses:
            db.session.delete(c)
            # Emit real-time notification to each removed user
            socketio.emit('course_user_removed', {
                'course_id': course_id,
                'removed_by': current_user_id
            }, room=c.user_id)
    # Update the creator's course visibility
    creator_course.visibility = new_visibility
    db.session.commit()
    return jsonify({'success': True, 'message': 'Course visibility updated.'}), 200 