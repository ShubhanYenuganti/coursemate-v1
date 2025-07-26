import uuid
from datetime import datetime
from app.init import db

class UserCourseMaterial(db.Model):
    __tablename__ = 'user_course_materials'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    course_id = db.Column(db.String, nullable=False, index=True)  # This stores the combo_id value (course_id+user_id)
    file_path = db.Column(db.String(500), nullable=False)
    material_name = db.Column(db.String(255), nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    file_type = db.Column(db.String(20), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    original_filename = db.Column(db.String(255), nullable=True)

    # Relationships
    user = db.relationship('User', backref=db.backref('user_course_materials', lazy=True, cascade='all, delete-orphan'))
    # Note: course relationship removed because we're using combo_id instead of foreign key

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,  # This contains the combo_id value
            'file_path': self.file_path,
            'material_name': self.material_name,
            'is_pinned': self.is_pinned,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'thumbnail_path': self.thumbnail_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'original_filename': self.original_filename
        } 