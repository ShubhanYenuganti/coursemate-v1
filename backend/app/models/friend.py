from app.init import db
from datetime import datetime
from sqlalchemy import UniqueConstraint, or_
from sqlalchemy.orm import relationship

class Friend(db.Model):
    __tablename__ = 'users_friends'
    id = db.Column(db.Integer, primary_key=True)
    
    # The user who sent the friend request
    requester_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    
    # The user who received the friend request
    receiver_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    
    # The status of the friendship ('pending', 'accepted', 'rejected', 'blocked')
    status = db.Column(db.String(20), nullable=False, default='pending')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Define relationships to the User model
    requester = relationship('User', foreign_keys=[requester_id], back_populates='sent_friend_requests')
    receiver = relationship('User', foreign_keys=[receiver_id], back_populates='received_friend_requests')

    # Ensure a user can't send a request to the same person more than once
    __table_args__ = (UniqueConstraint('requester_id', 'receiver_id', name='_requester_receiver_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'requester_id': self.requester_id,
            'receiver_id': self.receiver_id,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        } 