import uuid
from datetime import datetime, timedelta
from app.init import db
from itsdangerous import URLSafeTimedSerializer as Serializer
from flask import current_app
from sqlalchemy.orm import relationship


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
    onboarded = db.Column(db.Boolean, default=False)
    
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
    google_sync_tokens = db.Column(db.JSON, default=dict)
    
    # Streak tracking fields
    last_visit_date = db.Column(db.Date, nullable=True)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    
    # Relationships
    goals = db.relationship("Goal", back_populates="user", lazy=True)
    document_embeddings = db.relationship("DocumentEmbedding", back_populates="user")
    
    # Friend relationships
    sent_friend_requests = relationship('Friend', foreign_keys='Friend.requester_id', back_populates='requester', lazy='dynamic')
    received_friend_requests = relationship('Friend', foreign_keys='Friend.receiver_id', back_populates='receiver', lazy='dynamic')

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
    
    def update_streak(self):
        """Update the user's streak based on their visit today"""
        today = datetime.utcnow().date()
        
        # If this is the first visit or no last visit recorded
        if not self.last_visit_date:
            self.last_visit_date = today
            self.current_streak = 1
            self.longest_streak = max(self.longest_streak, 1)
            return
        
        # If already visited today, don't update
        if self.last_visit_date == today:
            return
        
        # Calculate days difference
        days_diff = (today - self.last_visit_date).days
        
        if days_diff == 1:
            # Consecutive day - increment streak
            self.current_streak += 1
            self.longest_streak = max(self.longest_streak, self.current_streak)
        elif days_diff > 1:
            # Streak broken - reset to 1
            self.current_streak = 1
        # If days_diff == 0, already visited today (handled above)
        
        self.last_visit_date = today