from flask import Blueprint, request, jsonify
from app.models.user import User
from app.init import db
# db = init.db
from passlib.hash import bcrypt
from flask_jwt_extended import create_access_token

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
    return jsonify({'message': 'User created'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if not user or not bcrypt.verify(data['password'], user.password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
    })
