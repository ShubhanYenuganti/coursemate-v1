from datetime import datetime
from ..extensions import db

class CourseUploadedFile(db.Model):
    __tablename__ = 'course_uploaded_files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, nullable=True)
    course_id = db.Column(db.String(255), nullable=False)  # Course UUID
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    chunks = db.relationship('CourseMaterialChunk', backref='file', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'chunk_count': len(self.chunks) if self.chunks else 0
        }
