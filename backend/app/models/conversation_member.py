import uuid
from app.extensions import db

class ConversationMember(db.Model):
    __tablename__ = 'conversation_members'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=db.func.now())
    # Relationships
    conversation = db.relationship('Conversation', backref=db.backref('members', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('conversation_memberships', lazy=True, cascade='all, delete-orphan'))
    __table_args__ = (db.UniqueConstraint('conversation_id', 'user_id', name='unique_conversation_member'),)

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }
