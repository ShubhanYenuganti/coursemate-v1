from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.init import db

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'created_at': user.created_at,
        'college': user.college,
        'year': user.year,
        'major': user.major,
        'onboarded': user.onboarded,
    })

@users_bp.route('/', methods=['GET'])
@jwt_required()
def list_users():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'email': u.email,
        'name': u.name,
        'role': u.role,
        'created_at': u.created_at
    } for u in users])

@users_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@users_bp.route('/profile', methods=['POST'])
@jwt_required()
def update_profile():
    print("getting JWT identity")
    print("Request headers:", request.headers)  # Add this line
    current_user = get_jwt_identity()
    print("Current user from JWT:", current_user)  # Add this line

    user_id = current_user
    data = request.get_json()
    print("Request data:", data)  # Add this line

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Update user profile information
    user.name = data.get('fullName', user.name)
    user.college = data.get('college')
    user.year = data.get('year')
    user.major = data.get('major')

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'}), 200

@users_bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_me():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Account deleted'}), 200

@users_bp.route('/onboarding', methods=['POST'])
@jwt_required()
def onboarding():
    current_user = get_jwt_identity()
    user = User.query.get(current_user)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.onboarded:
        return jsonify({'error': 'User already onboarded'}), 400
    data = request.get_json()
    user.name = data.get('name', user.name)
    user.email = data.get('email', user.email)
    user.college = data.get('school', user.college)
    user.year = data.get('year', user.year)
    user.major = data.get('major', user.major)
    # Optionally save profilePic and academicInterests if you have columns for them
    user.onboarded = True
    db.session.commit()
    return jsonify({'message': 'Onboarding complete'}), 200
