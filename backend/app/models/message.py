import uuid
from datetime import datetime
from app.init import db
from sqlalchemy import Text, JSON


class Message(db.Model):
    __tablename__ = 'users_messages'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    sender_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    message_content = db.Column(db.Text, nullable=False)
    
    # Material sharing fields
    message_type = db.Column(db.Enum('text', 'material_share', name='dm_message_type_enum'), default='text')
    material_id = db.Column(db.String, db.ForeignKey('user_course_materials.id'), nullable=True, index=True)
    material_preview = db.Column(JSON, nullable=True)  # Store material metadata for preview

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_messages')
    shared_material = db.relationship("UserCourseMaterial", backref="shared_in_dms")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'message_content': self.message_content,
            'message_type': self.message_type,
            'material_id': self.material_id,
            'material_preview': self.material_preview,
            'sender_name': self.sender.name if self.sender else None,
            'receiver_name': self.receiver.name if self.receiver else None,
        } 