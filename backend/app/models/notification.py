import uuid
from datetime import datetime
from app.init import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    sender_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True)  # Null for system notifications
    type = db.Column(db.String(50), nullable=False)  # 'course_invite', 'friend_request', etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON, default=dict)  # Additional data like course_id, role, etc.
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else None,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'data': self.data,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def mark_as_read(self):
        self.is_read = True
        db.session.commit()

    def __repr__(self):
        return f'<Notification {self.type} for {self.user_id}>' 