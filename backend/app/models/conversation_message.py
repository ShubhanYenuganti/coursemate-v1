from app.extensions import db
from datetime import datetime
import uuid
import json

class ConversationMessage(db.Model):
    __tablename__ = 'conversation_messages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations.id'), nullable=False)
    message_type = db.Column(db.Enum('user', 'assistant', name='message_type_enum'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    source_files = db.Column(db.Text, nullable=True)  # Store as JSON string for SQLite compatibility
    confidence = db.Column(db.Float, nullable=True)   # AI confidence score
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        # Parse source_files JSON if it exists
        source_files_list = []
        if self.source_files:
            try:
                source_files_list = json.loads(self.source_files)
            except (json.JSONDecodeError, TypeError):
                source_files_list = []
        
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'message_type': self.message_type,
            'content': self.content,
            'metadata': {
                'source_files': source_files_list,
                'confidence': self.confidence
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def set_source_files(self, source_files_list):
        """Set source files as JSON string"""
        if source_files_list:
            self.source_files = json.dumps(source_files_list)
        else:
            self.source_files = None
    
    @staticmethod
    def create_user_message(conversation_id, content):
        """Create a new user message"""
        message = ConversationMessage(
            conversation_id=conversation_id,
            message_type='user',
            content=content
        )
        return message
    
    @staticmethod
    def create_assistant_message(conversation_id, content, source_files=None, confidence=None):
        """Create a new assistant message"""
        message = ConversationMessage(
            conversation_id=conversation_id,
            message_type='assistant',
            content=content,
            confidence=confidence
        )
        if source_files:
            message.set_source_files(source_files)
        return message
