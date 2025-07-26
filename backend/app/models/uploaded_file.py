from datetime import datetime
from ..extensions import db

class UploadedFile(db.Model):
    __tablename__ = 'uploaded_files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.String, nullable=True)  # Changed to String to match User model
    course_id = db.Column(db.String(50), nullable=True)  # Add course_id for course-specific materials
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    chunks = db.relationship('MaterialChunk', backref='file', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'chunk_count': len(self.chunks) if self.chunks else 0
        }
