import uuid
from datetime import datetime
from app.init import db
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import Text
from app.utils.s3 import get_presigned_url
import os

class Course(db.Model):
    __tablename__ = 'courses'

    combo_id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    id = db.Column(db.String, nullable=False, index=True)  # shared course UUID
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Basic course information
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    course_code = db.Column(db.String(20), nullable=True)
    semester = db.Column(db.String(50), nullable=False)
    professor = db.Column(db.String(100), nullable=True)
    units = db.Column(db.Integer, default=3)
    variable_units = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text, nullable=False)
    
    # Course metadata
    visibility = db.Column(db.Enum('Public', 'Private', 'Only Me', 'Friends Only', name='visibility_enum'), default='Public')
    tags = db.Column(db.JSON, default=list)  # Store as JSON array
    collaborators = db.Column(db.JSON, default=list)  # Store email/usernames as JSON array
    
    # Progress and status
    daily_progress = db.Column(db.Integer, default=0)  # 0-100
    is_pinned = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    badge = db.Column(db.Enum('Creator', 'Enrolled', name='badge_enum'), default='Creator')
    
    # File storage (store file paths/URLs)
    course_image = db.Column(db.String(500), nullable=True)  # Path to uploaded image/S3 key
    materials = db.Column(db.JSON, default=list)  # Array of file paths/metadata
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to User
    user = db.relationship('User', backref=db.backref('courses', lazy=True, cascade='all, delete-orphan'))
    
    # Relationship to Goals
    goals = db.relationship("Goal", back_populates="course", lazy=True, cascade='all, delete-orphan')
    
    document_embeddings = db.relationship("DocumentEmbedding", back_populates="course")
    
    def to_dict(self):
        """Convert course to dictionary for JSON serialization"""
        
        course_image_url = self.course_image
        if os.environ.get('FILE_STORAGE') == 'S3' and self.course_image:
            course_image_url = get_presigned_url(self.course_image)

        return {
            'combo_id': self.combo_id,
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'subject': self.subject,
            'course_code': self.course_code,
            'semester': self.semester,
            'professor': self.professor,
            'units': self.units,
            'variable_units': self.variable_units,
            'description': self.description,
            'visibility': self.visibility,
            'tags': self.tags or [],
            'collaborators': self.collaborators or [],
            'daily_progress': self.daily_progress,
            'is_pinned': self.is_pinned,
            'is_archived': self.is_archived,
            'badge': self.badge,
            'course_image': course_image_url,
            'materials': self.materials or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None
        }
    
    def update_last_accessed(self):
        """Update the last accessed timestamp"""
        self.last_accessed = datetime.utcnow()
        db.session.commit() 