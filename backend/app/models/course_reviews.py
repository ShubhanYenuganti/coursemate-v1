import uuid
from datetime import datetime
from app.init import db


class CourseReview(db.Model):
    __tablename__ = 'course_reviews'

    combo_id = db.Column(db.String, db.ForeignKey('courses.combo_id'), primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    course_id = db.Column(db.String, nullable=False, index=True)  # Keep it, but don't make it a FK again
    review_text = db.Column(db.Text)
    rating = db.Column(db.Integer)
    posted = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('course_collaborations', lazy=True, cascade='all, delete-orphan'))
    course = db.relationship('Course', backref=db.backref('course_collaborators', lazy=True, cascade='all, delete-orphan'), foreign_keys=[combo_id])

    def __init__(self, user_id, course_id, review_text=None, rating=None):
        self.user_id = user_id
        self.course_id = course_id
        self.combo_id = f"{course_id}+{user_id}"
        self.review_text = review_text
        self.rating = rating

    def to_dict(self):
        """Convert review to dictionary for JSON serialization"""
        return {
            'combo_id': self.combo_id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'review_text': self.review_text,
            'rating': self.rating,
            'posted': self.posted.isoformat() if self.posted else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
    def to_dict_with_user(self):
        return {
            **self.to_dict(),
            "user_name": self.user.name if self.user else None
        }

    def __repr__(self):
        return f"<CourseReview {self.combo_id}>"
