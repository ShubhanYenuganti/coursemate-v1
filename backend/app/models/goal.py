import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

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
    due_date = Column(DateTime(timezone=True), nullable=True)
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
    
    created_at = Column(DateTime(timezone=True),
                    default=lambda: datetime.now(timezone.utc))   
    updated_at = Column(DateTime(timezone=True),
                    default=lambda: datetime.now(timezone.utc),
                    onupdate =lambda: datetime.now(timezone.utc))    
    start_time = Column(TIMESTAMP(timezone=True))   # timestamptz in Postgres
    end_time   = Column(TIMESTAMP(timezone=True))
    
    # Google Calendar Fields
    google_event_id = Column(String, nullable=True)
    google_etag = Column(String(40), nullable=True)
    google_source = Column(String(255), nullable=True)
    google_calendar_color = Column(String(7), nullable=True)  # Hex color code (e.g., "#4285f4")
    is_external = Column(Boolean, default=False)
    google_calendar_id = Column(String, nullable=True)
    sync_status = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="goals")
    course = relationship("Course", back_populates="goals")

    def __init__(self, user_id, course_id, goal_id, goal_descr, task_id, task_title, 
                 subtask_id, subtask_descr, due_date=None, goal_completed=False, 
                 task_descr=None, task_completed=False, subtask_type="other", 
                 subtask_completed=False, google_event_id=None, google_etag=None, google_source=None, google_calendar_color=None, is_external=False, start_time=None, end_time=None, sync_status="Not Synced", google_calendar_id=None):
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
        
        # Google Calendar Fields
        self.google_event_id = google_event_id
        self.google_etag = google_etag
        self.google_source = google_source
        self.google_calendar_color = google_calendar_color
        self.is_external = is_external
        self.start_time = start_time
        self.end_time = end_time
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = self.created_at
        self.sync_status = sync_status
        self.google_calendar_id = google_calendar_id
        
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
    
    def _fmt(self, dt):
        if not dt:
            return None
        
        return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'goal_id': self.goal_id,
            'goal_descr': self.goal_descr,
            'due_date': self._fmt(self.due_date),
            'goal_completed': self.goal_completed,
            'task_id': self.task_id,
            'task_title': self.task_title,
            'task_descr': self.task_descr,
            'task_completed': self.task_completed,
            'subtask_id': self.subtask_id,
            'subtask_descr': self.subtask_descr,
            'subtask_type': self.subtask_type,
            'subtask_completed': self.subtask_completed,
            'created_at': self._fmt(self.created_at),
            'updated_at': self._fmt(self.updated_at),
            'google_event_id': self.google_event_id,
            'google_etag': self.google_etag,
            'google_source': self.google_source,
            'google_calendar_color': self.google_calendar_color,
            'is_external': self.is_external,
            'start_time': self._fmt(self.start_time),
            'end_time': self._fmt(self.end_time),
            'sync_status': self.sync_status,
            'google_calendar_id': self.google_calendar_id
        } 