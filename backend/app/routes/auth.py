from flask import Blueprint, request, jsonify, current_app, redirect
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer as Serializer
from app.models.user import User
from app.extensions import db, mail
from app.utils.email_service import send_verification_email, send_password_reset_email
from passlib.hash import bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import datetime, timedelta, timezone

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    new_user = User(
        email=data['email'],
        password_hash=bcrypt.hash(data['password']),
        name=data.get('name'),
        role='student'
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Send verification email
    try:
        send_verification_email(new_user)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Failed to send verification email: {e}")
    
    return jsonify({
        'message': 'User created. Please check your email to verify your account.',
        'user_id': new_user.id
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not bcrypt.verify(data['password'], user.password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    # Check if email is verified if required
    if not user.email_verified and current_app.config.get('REQUIRE_EMAIL_VERIFICATION', True):
        return jsonify({
            'error': 'Email not verified',
            'requires_verification': True
        }), 403
        
    # Generate access token with expiration
    expires = timedelta(hours=1)
    token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role},
        expires_delta=expires
    )
    
    # Generate refresh token
    refresh_token = create_access_token(
        identity=user.id,
        expires_delta=timedelta(days=30)
    )
    
    return jsonify({
        'access_token': token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'email_verified': user.email_verified
        }
    })


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    current_app.logger.info(f'Received verification request with data: {data}')
    
    if not data or 'token' not in data:
        current_app.logger.error('No token provided in request')
        return jsonify({'error': 'Token is required'}), 400
        
    token = data['token']
    if not token:
        current_app.logger.error('Empty token provided')
        return jsonify({'error': 'Token is required'}), 400
    
    current_app.logger.info(f'Looking for user with token: {token[:10]}...')
    
    # Find user by token
    user = User.query.filter_by(email_verification_token=token).first()
    if not user:
        current_app.logger.error('No user found with the provided token')
        return jsonify({'error': 'Invalid or expired token'}), 400
    
    current_app.logger.info(f'Found user: {user.email}')
    
    # Verify the token
    s = Serializer(current_app.config['SECRET_KEY'])
    try:
        current_app.logger.info('Attempting to verify token...')
        # First verify the token is valid
        token_data = s.loads(token, max_age=3600)  # 1 hour expiration
        current_app.logger.info(f'Token data: {token_data}')
        
        # Check if token matches and is the right type
        if 'user_id' not in token_data or 'type' not in token_data:
            current_app.logger.error('Token missing required fields')
            return jsonify({'error': 'Invalid token format'}), 400
            
        if token_data.get('user_id') != user.id:
            current_app.logger.error(f'Token user_id ({token_data.get("user_id")}) does not match user.id ({user.id})')
            return jsonify({'error': 'Token user mismatch'}), 400
            
        if token_data.get('type') != 'email_verification':
            current_app.logger.error(f'Invalid token type: {token_data.get("type")}')
            return jsonify({'error': 'Invalid token type'}), 400
            
        # Mark as verified and clear the token
        user.email_verified = True
        user.email_verification_token = None
        db.session.commit()
        
        # Generate a new access token for the user
        access_token = create_access_token(identity=str(user.id))
        
        current_app.logger.info('Email verified successfully')
        return jsonify({
            'message': 'Email verified successfully',
            'user_id': str(user.id),
            'token': access_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Token verification failed: {str(e)}', exc_info=True)
        return jsonify({'error': f'Token verification failed: {str(e)}'}), 400


@auth_bp.route('/resend-verification', methods=['POST'])
@jwt_required()
def resend_verification():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.email_verified:
        return jsonify({'message': 'Email already verified'}), 200
        
    # Prevent spamming
    if user.email_verification_sent_at and \
       (datetime.utcnow() - user.email_verification_sent_at).total_seconds() < 300:  # 5 minutes cooldown
        return jsonify({'error': 'Please wait before requesting another verification email'}), 429
    
    try:
        send_verification_email(user)
        db.session.commit()
        return jsonify({'message': 'Verification email sent'}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to resend verification email: {e}")
        return jsonify({'error': 'Failed to send verification email'}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if user:
        # Prevent spamming
        if user.password_reset_sent_at and \
           (datetime.utcnow() - user.password_reset_sent_at).total_seconds() < 300:  # 5 minutes cooldown
            return jsonify({'message': 'If your email is registered, you will receive a password reset link'}), 200
            
        try:
            send_password_reset_email(user)
            db.session.commit()
        except Exception as e:
            current_app.logger.error(f"Failed to send password reset email: {e}")
    
    # Always return success to prevent email enumeration
    return jsonify({'message': 'If your email is registered, you will receive a password reset link'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
        
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
    user = User.query.filter_by(password_reset_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400
        
    if not user.verify_token(token, 'password_reset'):
        return jsonify({'error': 'Invalid or expired token'}), 400
        
    # Update password
    user.password_hash = bcrypt.hash(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password updated successfully'}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # In a stateless JWT system, the client should discard the token
    # For enhanced security, you might want to implement a token blacklist
    # or use refresh tokens with a token revocation list
    return jsonify({'message': 'Successfully logged out'}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Generate new access token
    expires = timedelta(hours=1)
    new_token = create_access_token(
        identity=current_user_id,
        additional_claims={"role": user.role},
        expires_delta=expires
    )
    
    return jsonify({
        'access_token': new_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'email_verified': user.email_verified
        }
    }), 200

@auth_bp.route('/test-email', methods=['GET'])
def test_email():
    try:
        msg = Message(
            subject='Test Email',
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=['nikiwi2006@gmail.com']
        )
        msg.body = 'This is a test email from CourseMate'
        mail.send(msg)
        return jsonify({'message': 'Test email sent'}), 200
    except Exception as e:
        current_app.logger.error(f'Error sending test email: {str(e)}')
        return jsonify({'error': str(e)}), 500
