import uuid
from datetime import datetime, timedelta
from app.init import db
from itsdangerous import URLSafeTimedSerializer as Serializer
from flask import current_app


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    role = db.Column(db.Enum('admin', 'student', name='role_enum'), default='student')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Add new fields for onboarding
    college = db.Column(db.String(200), nullable=True)
    year = db.Column(db.String(20), nullable=True)  # Using string to allow values like "freshman", "sophomore", etc.
    major = db.Column(db.String(100), nullable=True)
    
    # Email verification fields
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.Text, unique=True, nullable=True)  # Changed to Text for unlimited length
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Password reset fields
    password_reset_token = db.Column(db.Text, unique=True, nullable=True)  # Changed to Text for unlimited length
    password_reset_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Google OAuth tokens
    google_access_token = db.Column(db.Text, unique=True, nullable=True)  # Changed to Text for unlimited length
    google_refresh_token = db.Column(db.Text, unique=True, nullable=True)  # Changed to Text for unlimited length
    token_expiry = db.Column(db.DateTime(timezone=True), nullable=True)
    
    def generate_token(self, token_type='email_verification'):
        s = Serializer(current_app.config['SECRET_KEY'])
        token = s.dumps({'user_id': self.id, 'type': token_type})
        
        if token_type == 'email_verification':
            self.email_verification_token = token
            self.email_verification_sent_at = datetime.utcnow()
        elif token_type == 'password_reset':
            self.password_reset_token = token
            self.password_reset_sent_at = datetime.utcnow()
            
        return token
    
    def verify_token(self, token, token_type='email_verification', expires_in=3600):
        if token_type == 'email_verification' and self.email_verification_token != token:
            return False
        elif token_type == 'password_reset' and self.password_reset_token != token:
            return False
            
        s = Serializer(current_app.config['SECRET_KEY'])
        try:
            data = s.loads(token, max_age=expires_in)
        except:
            return False
            
        if data.get('user_id') != self.id or data.get('type') != token_type:
            return False
            
        # Clear the token after successful verification
        if token_type == 'email_verification':
            self.email_verification_token = None
            self.email_verified = True
        elif token_type == 'password_reset':
            self.password_reset_token = None
            
        return True