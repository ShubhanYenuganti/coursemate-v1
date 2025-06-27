import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from app.init import db


class Goal(db.Model):
    """Goal model for course study goals with tasks and subtasks in a fully denormalized structure.
    Each row contains all fields (goal, task, subtask) and represents a specific subtask.
    Multiple rows can share the same goal_id and task_id."""
    __tablename__ = 'users_courses_goal'

    id = Column(String, primary_key=True)  # Primary key for the row
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    course_id = Column(String, ForeignKey('courses.id'), nullable=False)
    
    # Goal fields
    goal_id = Column(String, nullable=False)  # ID of the goal this row belongs to
    goal_descr = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    goal_completed = Column(Boolean, default=False)
    
    # Task fields
    task_id = Column(String, nullable=False)  # ID of the task this row belongs to
    task_title = Column(String(255), nullable=False)
    task_descr = Column(Text, nullable=True)
    task_completed = Column(Boolean, default=False)
    
    # Subtask fields
    subtask_id = Column(String, nullable=False)  # ID of the subtask this row represents
    subtask_descr = Column(String(255), nullable=False)
    subtask_type = Column(String(50), nullable=False, default="other")
    subtask_completed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="goals")
    course = relationship("Course", back_populates="goals")

    def __init__(self, user_id, course_id, goal_id, goal_descr, task_id, task_title, 
                 subtask_id, subtask_descr, due_date=None, goal_completed=False, 
                 task_descr=None, task_completed=False, subtask_type="other", 
                 subtask_completed=False):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.course_id = course_id
        
        # Goal fields
        self.goal_id = goal_id
        self.goal_descr = goal_descr
        self.due_date = due_date
        self.goal_completed = goal_completed
        
        # Task fields
        self.task_id = task_id
        self.task_title = task_title
        self.task_descr = task_descr
        self.task_completed = task_completed
        
        # Subtask fields
        self.subtask_id = subtask_id
        self.subtask_descr = subtask_descr
        self.subtask_type = subtask_type
        self.subtask_completed = subtask_completed
        
        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at

    @classmethod
    def create_for_goal(cls, user_id, course_id, goal_descr, due_date=None):
        """Create a new goal with a single task and subtask"""
        goal_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        subtask_id = str(uuid.uuid4())
        
        # Create more meaningful default task and subtask names based on the goal
        task_title = f"Plan for {goal_descr[:30]}" if len(goal_descr) > 30 else f"Plan for {goal_descr}"
        subtask_descr = "First step"
        
        return cls(
            user_id=user_id,
            course_id=course_id,
            goal_id=goal_id,
            goal_descr=goal_descr,
            due_date=due_date,
            task_id=task_id,
            task_title=task_title,
            task_descr="",
            subtask_id=subtask_id,
            subtask_descr=subtask_descr,
            subtask_type="other"
        ), goal_id, task_id

    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'goal_id': self.goal_id,
            'goal_descr': self.goal_descr,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'goal_completed': self.goal_completed,
            'task_id': self.task_id,
            'task_title': self.task_title,
            'task_descr': self.task_descr,
            'task_completed': self.task_completed,
            'subtask_id': self.subtask_id,
            'subtask_descr': self.subtask_descr,
            'subtask_type': self.subtask_type,
            'subtask_completed': self.subtask_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 