from app.extensions import db
from datetime import datetime
import uuid

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = db.Column(db.String, db.ForeignKey('courses.combo_id'), nullable=False)
    user_id = db.Column(db.String(36), nullable=False)
    title = db.Column(db.String(255), nullable=False, default='New Chat')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = db.Column(db.Boolean, default=False)
    message_count = db.Column(db.Integer, default=0)
    
    # Relationship to messages
    messages = db.relationship('ConversationMessage', backref='conversation', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_archived': self.is_archived,
            'message_count': self.message_count
        }
    
    def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def increment_message_count(self):
        """Increment the message count"""
        self.message_count += 1
        self.update_timestamp()
    
    @staticmethod
    def generate_title_from_message(message_content):
        """Generate a conversation title from the first message"""
        # Take first 30 characters and add ellipsis if needed
        if len(message_content) <= 30:
            return message_content
        
        # Find the last space before 30 characters to avoid cutting words
        truncated = message_content[:30]
        last_space = truncated.rfind(' ')
        if last_space > 15:  # Only use last space if it's not too early
            return truncated[:last_space] + '...'
        else:
            return truncated + '...'
