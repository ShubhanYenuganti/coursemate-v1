import uuid
from datetime import datetime
from app.init import db
from sqlalchemy.orm import relationship
from sqlalchemy import Text, JSON


class CommunityPost(db.Model):
    __tablename__ = 'users_courses_community'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = db.Column(db.String, db.ForeignKey('courses.combo_id'), nullable=False, index=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Post content
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(Text, nullable=False)  # Rich HTML content from TiptapEditor
    type = db.Column(db.Enum('question', 'discussion', 'study-group', 'resource-sharing', 'help-wanted', 'deleted', name='post_type_enum'), nullable=False)
    
    # Post metadata
    tags = db.Column(JSON, default=list)  # Store as JSON array
    is_pinned = db.Column(db.Boolean, default=False)
    is_resolved = db.Column(db.Boolean, default=False)
    has_accepted_answer = db.Column(db.Boolean, default=False)
    
    # Engagement metrics
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="community_posts")
    course = relationship("Course", backref="community_posts")
    answers = relationship("CommunityAnswer", back_populates="post", cascade="all, delete-orphan")
    votes = relationship("CommunityPostVote", back_populates="post", cascade="all, delete-orphan")
    post_views = relationship("CommunityPostView", backref="post", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'type': self.type,
            'author': {
                'id': self.user.id,
                'name': self.user.name,
                'role': 'student',  # Default role, can be enhanced later
            },
            'tags': self.tags or [],
            'isPinned': self.is_pinned,
            'isResolved': self.is_resolved,
            'hasAcceptedAnswer': self.has_accepted_answer,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'answerCount': len(self.answers),
            'viewCount': self.view_count,
            'createdAt': self.created_at.isoformat() + 'Z',
            'updatedAt': self.updated_at.isoformat() + 'Z',
            'lastActivity': self.last_activity.isoformat() + 'Z',
        }


class CommunityAnswer(db.Model):
    __tablename__ = 'users_courses_community_answers'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String, db.ForeignKey('users_courses_community.id'), nullable=False, index=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Answer content
    content = db.Column(Text, nullable=False)  # Rich HTML content from TiptapEditor
    latex_blocks = db.Column(JSON, default=list)  # Store LaTeX blocks separately for processing
    
    # Answer metadata
    is_accepted = db.Column(db.Boolean, default=False)
    is_helpful = db.Column(db.Boolean, default=False)
    
    # Engagement metrics
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    post = relationship("CommunityPost", back_populates="answers")
    user = relationship("User", backref="community_answers")
    votes = relationship("CommunityAnswerVote", back_populates="answer", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'postId': self.post_id,
            'content': self.content,
            'latexBlocks': self.latex_blocks or [],
            'author': {
                'id': self.user.id,
                'name': self.user.name,
                'role': 'student',  # Default role
                'reputation': 0  # Can be calculated later
            },
            'isAccepted': self.is_accepted,
            'isHelpful': self.is_helpful,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'createdAt': self.created_at.isoformat() + 'Z',
            'updatedAt': self.updated_at.isoformat() + 'Z',
        }


class CommunityPostVote(db.Model):
    __tablename__ = 'users_courses_community_post_votes'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String, db.ForeignKey('users_courses_community.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    vote_type = db.Column(db.Enum('upvote', 'downvote', name='vote_type_enum'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    post = relationship("CommunityPost", back_populates="votes")
    user = relationship("User", backref="community_post_votes")
    
    # Ensure one vote per user per post
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='unique_post_vote'),)


class CommunityAnswerVote(db.Model):
    __tablename__ = 'users_courses_community_answer_votes'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_id = db.Column(db.String, db.ForeignKey('users_courses_community_answers.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    vote_type = db.Column(db.Enum('upvote', 'downvote', name='answer_vote_type_enum'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    answer = relationship("CommunityAnswer", back_populates="votes")
    user = relationship("User", backref="community_answer_votes")
    
    # Ensure one vote per user per answer
    __table_args__ = (db.UniqueConstraint('answer_id', 'user_id', name='unique_answer_vote'),)


class CommunityPostView(db.Model):
    __tablename__ = 'users_courses_community_post_views'

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String, db.ForeignKey('users_courses_community.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String, nullable=False)  # Track by session to handle page reloads
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="community_post_views")
    
    # Ensure one view per user per session per post
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', 'session_id', name='unique_post_view'),)
