from datetime import datetime
from app.init import db

class CourseEnrollment(db.Model):
    __tablename__ = 'course_enrollments'

    combo_id = db.Column(db.String, db.ForeignKey('courses.combo_id'), primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    course_id = db.Column(db.String, nullable=False, index=True)  # Keep it, but don't make it a FK again
    status = db.Column(db.String)
    access_privileges = db.Column(db.Boolean, name="access_privileges")
    posted_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('course_collaborations', lazy=True, cascade='all, delete-orphan'))
    course = db.relationship('Course', backref=db.backref('course_collaborators', lazy=True, cascade='all, delete-orphan'), foreign_keys=[combo_id])

    def __init__(self, user_id, course_id, status=None, access_privileges=False):
        self.user_id = user_id
        self.course_id = course_id
        self.combo_id = f"{course_id}+{user_id}"
        self.status = status
        self.access_privileges = access_privileges
        self.posted_at = datetime.utcnow()

    def to_dict(self):
        return {
            'combo_id': self.combo_id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'status': self.status,
            'access_privileges': self.access_privileges,
            'posted_at': self.posted_at.isoformat() if self.posted_at else None
        }

    def to_dict_with_user(self):
        return {
            **self.to_dict(),
            "user_name": self.user.name if self.user else None
        }

    def __repr__(self):
        return f"<CourseEnrollment {self.combo_id}>"
