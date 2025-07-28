import uuid
from datetime import datetime
from app.init import db
from sqlalchemy.orm import relationship
from sqlalchemy import Text, JSON


class ChatGroup(db.Model):
    __tablename__ = 'chat_groups'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(Text, nullable=True)
    creator_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", backref="created_groups")
    members = relationship("ChatGroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="group", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'creator_id': self.creator_id,
            'creator_name': self.creator.name if self.creator else None,
            'is_active': self.is_active,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
        }


class ChatGroupMember(db.Model):
    __tablename__ = 'chat_group_members'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = db.Column(db.String, db.ForeignKey('chat_groups.id'), nullable=False, index=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    role = db.Column(db.Enum('admin', 'member', name='member_role_enum'), default='member')
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    group = relationship("ChatGroup", back_populates="members")
    user = relationship("User", backref="group_memberships")
    
    # Ensure one member record per user per group
    __table_args__ = (db.UniqueConstraint('group_id', 'user_id', name='unique_group_member'),)

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_email': self.user.email if self.user else None,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() + 'Z' if self.joined_at else None,
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = db.Column(db.String, db.ForeignKey('chat_groups.id'), nullable=False, index=True)
    sender_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Message content
    content = db.Column(Text, nullable=False)
    message_type = db.Column(db.Enum('text', 'material_share', 'system', name='message_type_enum'), default='text')
    
    # Material sharing fields
    material_id = db.Column(db.String, db.ForeignKey('user_course_materials.id'), nullable=True, index=True)
    material_preview = db.Column(JSON, nullable=True)  # Store material metadata for preview
    
    # Message metadata
    edited = db.Column(db.Boolean, default=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    group = relationship("ChatGroup", back_populates="messages")
    sender = relationship("User", backref="sent_group_messages") 
    shared_material = relationship("UserCourseMaterial", backref="shared_in_messages")

    def to_dict(self):
        # Get sender name safely without using relationship if not loaded
        sender_name = None
        try:
            if hasattr(self, 'sender') and self.sender:
                sender_name = self.sender.name
            elif self.sender_id:
                # Import here to avoid circular imports
                from .user import User
                sender = User.query.get(self.sender_id)
                sender_name = sender.name if sender else None
        except Exception as e:
            print(f"[ERROR] Error getting sender name: {str(e)}")
            sender_name = None
            
        return {
            'id': self.id,
            'group_id': self.group_id,
            'sender_id': self.sender_id,
            'sender_name': sender_name,
            'content': self.content,
            'message_type': self.message_type,
            'material_id': self.material_id,
            'material_preview': self.material_preview,
            'edited': self.edited,
            'sent_at': self.sent_at.isoformat() + 'Z' if self.sent_at else None,
            'timestamp': self.sent_at.isoformat() + 'Z' if self.sent_at else None,  # Add timestamp for frontend compatibility
            'edited_at': self.edited_at.isoformat() + 'Z' if self.edited_at else None,
        }