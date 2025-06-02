import uuid
from datetime import datetime
from app import init

db = init.db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    role = db.Column(db.Enum('admin', 'student', name='role_enum'), default='student')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Add new fields for onboarding
    college = db.Column(db.String(200), nullable=True)
    year = db.Column(db.String(20), nullable=True)  # Using string to allow values like "freshman", "sophomore", etc.
    major = db.Column(db.String(100), nullable=True)