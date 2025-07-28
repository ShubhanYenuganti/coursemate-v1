from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat import ChatGroup, ChatGroupMember, ChatMessage
from app.models.user_course_material import UserCourseMaterial
from app.models.course import Course
from app.models.user import User
from app.init import db
from app.extensions import socketio
from datetime import datetime

chat_group_bp = Blueprint('chat_group', __name__, url_prefix='/api/chat-group')

@chat_group_bp.route('/create', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new group chat"""
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        member_ids = data.get('member_ids', [])
        
        if not name:
            return jsonify({'success': False, 'error': 'Group name is required'}), 400
        
        current_user_id = get_jwt_identity()
        
        # Ensure creator is in member list
        if current_user_id not in member_ids:
            member_ids.append(current_user_id)
        
        # Create group
        group = ChatGroup(
            name=name, 
            description=description,
            creator_id=current_user_id
        )
        db.session.add(group)
        db.session.flush()
        
        # Add members
        for uid in member_ids:
            role = 'admin' if uid == current_user_id else 'member'
            member = ChatGroupMember(
                group_id=group.id, 
                user_id=uid,
                role=role
            )
            db.session.add(member)
        
        db.session.commit()
        
        # Emit to all members about new group
        for member_id in member_ids:
            socketio.emit('new_group_chat', {
                'group': group.to_dict()
            }, room=member_id)
        
        return jsonify({
            'success': True, 
            'group': group.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/my-groups', methods=['GET'])
@jwt_required()
def get_my_groups():
    """Get all groups the current user is a member of"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get groups where user is a member
        memberships = ChatGroupMember.query.filter_by(user_id=current_user_id).all()
        groups = [membership.group.to_dict() for membership in memberships if membership.group.is_active]
        
        # Add member details for each group
        for group_dict in groups:
            group_id = group_dict['id']
            members = ChatGroupMember.query.filter_by(group_id=group_id).all()
            group_dict['members'] = [member.to_dict() for member in members]
            
            # Get last message
            last_message = ChatMessage.query.filter_by(group_id=group_id).order_by(ChatMessage.sent_at.desc()).first()
            if last_message:
                group_dict['last_message'] = last_message.to_dict()
            else:
                group_dict['last_message'] = None
        
        return jsonify({'success': True, 'groups': groups}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/<group_id>/send', methods=['POST'])
@jwt_required()
def send_group_message(group_id):
    """Send a message to a group chat, optionally with a material attachment"""
    print(f"[DEBUG] Starting send_group_message for group {group_id}")
    
    try:
        print(f"[DEBUG] Getting request data")
        data = request.get_json()
        content = data.get('content', '')
        material_id = data.get('material_id')
        sender_id = get_jwt_identity()
        print(f"[DEBUG] Request data: content='{content}', material_id={material_id}, sender_id={sender_id}")
        
        # Verify user is member of group
        print(f"[DEBUG] Verifying group membership")
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=sender_id
        ).first()
        
        if not membership:
            print(f"[DEBUG] User not member of group")
            return jsonify({'success': False, 'error': 'You are not a member of this group'}), 403
        
        print(f"[DEBUG] User membership verified")
        
        # Handle material sharing
        material_preview = None
        message_type = 'text'
        
        if material_id:
            print(f"[DEBUG] Processing material attachment")
            material = UserCourseMaterial.query.filter_by(
                id=material_id,
                user_id=sender_id
            ).first()
            
            if not material:
                return jsonify({'success': False, 'error': 'Material not found'}), 404
            
            message_type = 'material_share'
            material_preview = {
                'id': material.id,
                'name': material.material_name,
                'file_type': material.file_type,
                'file_size': material.file_size,
                'thumbnail_path': material.thumbnail_path,
                'original_filename': material.original_filename
            }
            
            # If no content provided, use default message
            if not content:
                content = f"Shared material: {material.material_name}"
        
        print(f"[DEBUG] Creating ChatMessage object")
        # Create message
        msg = ChatMessage(
            group_id=group_id, 
            sender_id=sender_id, 
            content=content, 
            message_type=message_type,
            material_id=material_id,
            material_preview=material_preview
        )
        print(f"[DEBUG] ChatMessage created successfully")
        
        print(f"[DEBUG] Adding to session")
        db.session.add(msg)
        print(f"[DEBUG] Added to session successfully")
        
        print(f"[DEBUG] Attempting commit")
        try:
            db.session.commit()
            print(f"[DEBUG] Message committed successfully")
        except Exception as commit_error:
            print(f"[ERROR] Commit failed: {str(commit_error)}")
            import traceback
            print(f"[ERROR] Commit traceback: {traceback.format_exc()}")
            db.session.rollback()
            return jsonify({'success': False, 'error': f'Commit failed: {str(commit_error)}'}), 500
        
        # Get message dict first
        print(f"[DEBUG] Getting message dict")
        message_data = msg.to_dict()
        print(f"[DEBUG] Message to_dict successful: {message_data}")
        
        # Temporarily disable socketio emission to isolate the issue
        print(f"[DEBUG] Skipping socketio emission for testing")
        
        print(f"[DEBUG] Returning success response")
        return jsonify({'success': True, 'message': message_data}), 201
        
    except Exception as e:
        print(f"[ERROR] Exception caught: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/<group_id>/messages', methods=['GET'])
@jwt_required()
def get_group_messages(group_id):
    """Get all messages for a group chat"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user is member of group
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id
        ).first()
        
        if not membership:
            return jsonify({'success': False, 'error': 'You are not a member of this group'}), 403
        
        messages = ChatMessage.query.filter_by(group_id=group_id).order_by(ChatMessage.sent_at.asc()).all()
        return jsonify({'success': True, 'messages': [m.to_dict() for m in messages]}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/materials', methods=['GET'])
@jwt_required()
def get_user_materials():
    """Get all materials for the current user across all courses"""
    try:
        user_id = get_jwt_identity()
        materials = UserCourseMaterial.query.filter_by(user_id=user_id).order_by(
            UserCourseMaterial.created_at.desc()
        ).all()
        
        # Add presigned URLs
        from app.utils.s3 import get_presigned_url
        result = []
        for material in materials:
            material_dict = material.to_dict()
            material_dict['url'] = get_presigned_url(material_dict['file_path']) if material_dict['file_path'] else None
            material_dict['thumbnail_url'] = get_presigned_url(material_dict['thumbnail_path']) if material_dict.get('thumbnail_path') else None
            result.append(material_dict)
        
        return jsonify({'success': True, 'materials': result}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/add-material-to-course', methods=['POST'])
@jwt_required()
def add_material_to_course():
    """Add a shared material to a user's course by copying the S3 file and creating new DB entry"""
    try:
        data = request.get_json()
        material_id = data.get('material_id')
        target_course_id = data.get('course_id')  # This is the actual course ID
        user_id = get_jwt_identity()
        
        print(f"DEBUG: Adding material {material_id} to course {target_course_id} for user {user_id}")
        
        if not material_id or not target_course_id:
            return jsonify({'success': False, 'error': 'Material ID and Course ID are required'}), 400
        
        # Get original material
        orig_material = UserCourseMaterial.query.get(material_id)
        if not orig_material:
            return jsonify({'success': False, 'error': 'Material not found'}), 404
        
        # Create the combo_id for the target course
        target_combo_id = f"{target_course_id}+{user_id}"
        
        # Check if material already exists for this user in this course
        existing = UserCourseMaterial.query.filter_by(
            course_id=target_combo_id,
            material_name=orig_material.material_name,
            original_filename=orig_material.original_filename
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'Material already exists in this course'}), 409
        
        # Generate new file path for the target course
        import os
        file_extension = os.path.splitext(orig_material.original_filename or orig_material.material_name)[1]
        new_filename = f"{orig_material.original_filename or orig_material.material_name}"
        new_file_path = f"courses/{target_course_id}/{new_filename}"
        
        print(f"DEBUG: Copying from {orig_material.file_path} to {new_file_path}")
        
        # Copy the S3 file to new location if it's an S3 file
        if orig_material.file_path and not os.path.isabs(orig_material.file_path):
            try:
                from app.utils.s3 import copy_s3_object
                success = copy_s3_object(orig_material.file_path, new_file_path)
                if not success:
                    print(f"WARNING: Failed to copy S3 file, using original path")
                    new_file_path = orig_material.file_path  # Fallback to original path
            except Exception as e:
                print(f"ERROR: S3 copy failed: {str(e)}, using original path")
                new_file_path = orig_material.file_path  # Fallback to original path
        else:
            # For local files or URLs, just use the original path
            new_file_path = orig_material.file_path
        
        # Create new material entry for the user's course
        new_material = UserCourseMaterial(
            user_id=user_id,  # Add the missing user_id field
            course_id=target_combo_id,
            file_path=new_file_path,
            material_name=orig_material.material_name,
            thumbnail_path=orig_material.thumbnail_path,
            file_type=orig_material.file_type,
            file_size=orig_material.file_size,
            original_filename=orig_material.original_filename
        )
        
        db.session.add(new_material)
        db.session.commit()
        
        print(f"SUCCESS: Material {new_material.id} added to course {target_combo_id}")
        
        return jsonify({
            'success': True, 
            'material': {
                'id': new_material.id,
                'name': new_material.material_name,
                'file_path': new_material.file_path,
                'course_id': target_combo_id
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Failed to add material to course: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/user-courses', methods=['GET'])
@jwt_required()
def get_user_courses():
    """Get all courses for the current user to select when adding materials"""
    try:
        user_id = get_jwt_identity()
        material_filename = request.args.get('material_filename')  # Get the filename to check for duplicates
        
        courses = Course.query.filter_by(user_id=user_id, is_archived=False).order_by(
            Course.created_at.desc()
        ).all()
        
        result = []
        for course in courses:
            course_data = {
                'id': course.id,
                'combo_id': course.combo_id, 
                'title': course.title,
                'subject': course.subject,
                'semester': course.semester,
                'has_material': False  # Default to false
            }
            
            # If material filename is provided, check if this course already has the material
            if material_filename:
                target_combo_id = f"{course.id}+{user_id}"
                existing_material = UserCourseMaterial.query.filter_by(
                    course_id=target_combo_id,
                    original_filename=material_filename
                ).first()
                
                if existing_material:
                    course_data['has_material'] = True
                    print(f"DEBUG: Course {course.title} already has material {material_filename}")
            
            result.append(course_data)
        
        return jsonify({'success': True, 'courses': result}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/<group_id>/add-member', methods=['POST'])
@jwt_required()
def add_group_member(group_id):
    """Add a new member to a group chat"""
    try:
        data = request.get_json()
        new_member_id = data.get('user_id')
        current_user_id = get_jwt_identity()
        
        if not new_member_id:
            return jsonify({'success': False, 'error': 'User ID is required'}), 400
        
        # Verify current user is admin of the group
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id,
            user_id=current_user_id,
            role='admin'
        ).first()
        
        if not membership:
            return jsonify({'success': False, 'error': 'You do not have permission to add members'}), 403
        
        # Check if user is already a member
        existing = ChatGroupMember.query.filter_by(
            group_id=group_id,
            user_id=new_member_id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'User is already a member'}), 409
        
        # Add new member
        new_member = ChatGroupMember(
            group_id=group_id,
            user_id=new_member_id,
            role='member'
        )
        db.session.add(new_member)
        db.session.commit()
        
        # Notify all group members
        group_members = ChatGroupMember.query.filter_by(group_id=group_id).all()
        for member in group_members:
            socketio.emit('group_member_added', {
                'group_id': group_id,
                'new_member': new_member.to_dict()
            }, room=member.user_id)
        
        return jsonify({'success': True, 'member': new_member.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_group_bp.route('/<group_id>/leave', methods=['POST'])
@jwt_required()
def leave_group(group_id):
    """Leave a group chat"""
    try:
        current_user_id = get_jwt_identity()
        
        # Find membership
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id,
            user_id=current_user_id
        ).first()
        
        if not membership:
            return jsonify({'success': False, 'error': 'You are not a member of this group'}), 404
        
        # Remove membership
        db.session.delete(membership)
        db.session.commit()
        
        # Notify remaining group members
        remaining_members = ChatGroupMember.query.filter_by(group_id=group_id).all()
        for member in remaining_members:
            socketio.emit('group_member_left', {
                'group_id': group_id,
                'left_member_id': current_user_id
            }, room=member.user_id)
        
        return jsonify({'success': True, 'message': 'Left group successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@chat_group_bp.route('/<group_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """Delete a group chat (only admins can delete)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if group exists
        group = ChatGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        # Check if user is admin or creator
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id
        ).first()
        
        if not membership or (membership.role != 'admin' and group.creator_id != current_user_id):
            return jsonify({'success': False, 'error': 'Only admins can delete groups'}), 403
        
        # Get all members before deletion to notify them
        all_members = ChatGroupMember.query.filter_by(group_id=group_id).all()
        
        # Delete all messages first
        ChatMessage.query.filter_by(group_id=group_id).delete()
        
        # Delete all memberships
        ChatGroupMember.query.filter_by(group_id=group_id).delete()
        
        # Delete the group
        db.session.delete(group)
        db.session.commit()
        
        # Notify all members that group was deleted
        for member in all_members:
            socketio.emit('group_deleted', {
                'group_id': group_id,
                'group_name': group.name,
                'deleted_by': current_user_id
            }, room=member.user_id)
        
        return jsonify({'success': True, 'message': 'Group deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@chat_group_bp.route('/<group_id>/members', methods=['GET'])
@jwt_required()
def get_group_members(group_id):
    """Get all members of a group"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if user is a member of this group
        membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id
        ).first()
        
        if not membership:
            return jsonify({'success': False, 'error': 'Not a member of this group'}), 403
        
        # Get all members with user details
        members = db.session.query(ChatGroupMember, User).join(
            User, ChatGroupMember.user_id == User.id
        ).filter(ChatGroupMember.group_id == group_id).all()
        
        members_data = []
        for member, user in members:
            members_data.append({
                'id': member.id,
                'user_id': user.id,
                'user_name': user.name,
                'user_email': user.email,
                'role': member.role,
                'joined_at': member.joined_at.isoformat() + 'Z' if member.joined_at else None,
                'is_current_user': user.id == current_user_id
            })
        
        return jsonify({
            'success': True, 
            'members': members_data
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@chat_group_bp.route('/<group_id>/members/add', methods=['POST'])
@jwt_required()
def add_group_members(group_id):
    """Add new members to a group (only admins can add)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        if not user_ids:
            return jsonify({'success': False, 'error': 'No user IDs provided'}), 400
        
        # Check if group exists
        group = ChatGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        # Check if current user is admin
        current_membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id
        ).first()
        
        if not current_membership or (current_membership.role != 'admin' and group.creator_id != current_user_id):
            return jsonify({'success': False, 'error': 'Only admins can add members'}), 403
        
        added_members = []
        existing_members = []
        
        for user_id in user_ids:
            # Check if user exists
            user = User.query.get(user_id)
            if not user:
                continue
            
            # Check if user is already a member
            existing_member = ChatGroupMember.query.filter_by(
                group_id=group_id, 
                user_id=user_id
            ).first()
            
            if existing_member:
                existing_members.append(user.name)
                continue
            
            # Add new member
            new_member = ChatGroupMember(
                group_id=group_id,
                user_id=user_id,
                role='member'
            )
            db.session.add(new_member)
            added_members.append({
                'user_id': user_id,
                'user_name': user.name,
                'user_email': user.email
            })
        
        db.session.commit()
        
        # Notify all existing members about new additions
        all_members = ChatGroupMember.query.filter_by(group_id=group_id).all()
        for member in all_members:
            socketio.emit('group_members_added', {
                'group_id': group_id,
                'group_name': group.name,
                'added_members': added_members,
                'added_by': current_user_id
            }, room=member.user_id)
        
        return jsonify({
            'success': True, 
            'message': f'Added {len(added_members)} members successfully',
            'added_members': added_members,
            'existing_members': existing_members
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@chat_group_bp.route('/<group_id>/members/<user_id>/remove', methods=['DELETE'])
@jwt_required()
def remove_group_member(group_id, user_id):
    """Remove a member from a group (only admins can remove, users can remove themselves)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if group exists
        group = ChatGroup.query.get(group_id)
        if not group:
            return jsonify({'success': False, 'error': 'Group not found'}), 404
        
        # Check if current user is admin or removing themselves
        current_membership = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=current_user_id
        ).first()
        
        if not current_membership:
            return jsonify({'success': False, 'error': 'Not a member of this group'}), 403
        
        # Check permissions
        is_admin = (current_membership.role == 'admin' or group.creator_id == current_user_id)
        is_self_removal = (user_id == current_user_id)
        
        if not is_admin and not is_self_removal:
            return jsonify({'success': False, 'error': 'Only admins can remove other members'}), 403
        
        # Cannot remove the creator unless they're removing themselves
        if user_id == group.creator_id and not is_self_removal:
            return jsonify({'success': False, 'error': 'Cannot remove group creator'}), 403
        
        # Find the member to remove
        member_to_remove = ChatGroupMember.query.filter_by(
            group_id=group_id, 
            user_id=user_id
        ).first()
        
        if not member_to_remove:
            return jsonify({'success': False, 'error': 'User is not a member of this group'}), 404
        
        # Get user details before removal
        user = User.query.get(user_id)
        user_name = user.name if user else 'Unknown User'
        
        # Remove the member
        db.session.delete(member_to_remove)
        db.session.commit()
        
        # If creator left, transfer ownership to another admin or delete group
        if user_id == group.creator_id:
            # Find another admin to transfer ownership
            admin_members = ChatGroupMember.query.filter_by(
                group_id=group_id, 
                role='admin'
            ).first()
            
            if admin_members:
                group.creator_id = admin_members.user_id
                db.session.commit()
            else:
                # No other admins, promote the first member to admin and make them creator
                first_member = ChatGroupMember.query.filter_by(group_id=group_id).first()
                if first_member:
                    first_member.role = 'admin'
                    group.creator_id = first_member.user_id
                    db.session.commit()
                else:
                    # No members left, delete the group
                    ChatMessage.query.filter_by(group_id=group_id).delete()
                    db.session.delete(group)
                    db.session.commit()
                    return jsonify({'success': True, 'message': 'Group deleted as no members remain'}), 200
        
        # Notify remaining members
        remaining_members = ChatGroupMember.query.filter_by(group_id=group_id).all()
        for member in remaining_members:
            socketio.emit('group_member_removed', {
                'group_id': group_id,
                'group_name': group.name,
                'removed_user_id': user_id,
                'removed_user_name': user_name,
                'removed_by': current_user_id,
                'is_self_removal': is_self_removal
            }, room=member.user_id)
        
        return jsonify({
            'success': True, 
            'message': f'{"Left group" if is_self_removal else "Member removed"} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
