import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.init import db

class DocumentEmbedding(db.Model):
    """Model for storing document embeddings with vector support"""
    __tablename__ = 'document_embeddings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign keys
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    course_id = Column(String, ForeignKey('courses.combo_id'), nullable=False, index=True)
    
    # Document information
    document_name = Column(String(255), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)  # pdf, docx, txt, etc.
    file_path = Column(String(500), nullable=False)
    
    # Content and embedding
    content_chunk = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column('embedding', db.Text)  # Will be cast to vector type in PostgreSQL
    doc_metadata = Column(JSONB, default={})  # Renamed from metadata to avoid SQLAlchemy conflict
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="document_embeddings")
    course = relationship("Course", back_populates="document_embeddings")
    
    def __repr__(self):
        return f"<DocumentEmbedding(id={self.id}, document='{self.document_name}', chunk={self.chunk_index})>"
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'course_id': self.course_id,
            'document_name': self.document_name,
            'document_type': self.document_type,
            'file_path': self.file_path,
            'content_chunk': self.content_chunk,
            'chunk_index': self.chunk_index,
            'metadata': self.doc_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def find_similar_documents(cls, query_embedding, user_id, course_id, similarity_threshold=0.7, limit=5):
        """Find similar documents using vector similarity search"""
        from sqlalchemy import text
        
        # Convert embedding list to PostgreSQL vector format
        embedding_str = f"[{','.join(map(str, query_embedding))}]"
        
        query = text("""
            SELECT 
                de.id,
                de.document_name,
                de.content_chunk,
                de.chunk_index,
                1 - (de.embedding <=> :embedding) as similarity,
                de.doc_metadata
            FROM document_embeddings de
            WHERE de.user_id = :user_id 
                AND de.course_id = :course_id
                AND 1 - (de.embedding <=> :embedding) > :similarity_threshold
            ORDER BY de.embedding <=> :embedding
            LIMIT :limit
        """)
        
        result = db.session.execute(query, {
            'embedding': embedding_str,
            'user_id': user_id,
            'course_id': course_id,
            'similarity_threshold': similarity_threshold,
            'limit': limit
        })
        
        return [dict(row) for row in result]
    
    @classmethod
    def insert_embedding(cls, user_id, course_id, document_name, document_type, 
                        file_path, content_chunk, chunk_index, embedding, metadata=None):
        """Insert a new document embedding"""
        from sqlalchemy import text
        
        # Convert embedding list to PostgreSQL vector format
        embedding_str = f"[{','.join(map(str, embedding))}]"
        
        query = text("""
            INSERT INTO document_embeddings (
                user_id, course_id, document_name, document_type, 
                file_path, content_chunk, chunk_index, embedding, doc_metadata
            ) VALUES (
                :user_id, :course_id, :document_name, :document_type,
                :file_path, :content_chunk, :chunk_index, :embedding, :doc_metadata
            ) RETURNING id
        """)
        
        result = db.session.execute(query, {
            'user_id': user_id,
            'course_id': course_id,
            'document_name': document_name,
            'document_type': document_type,
            'file_path': file_path,
            'content_chunk': content_chunk,
            'chunk_index': chunk_index,
            'embedding': embedding_str,
            'doc_metadata': metadata or {}
        })
        
        db.session.commit()
        return result.scalar()
    
    @classmethod
    def get_documents_by_course(cls, user_id, course_id):
        """Get all documents for a specific course"""
        return cls.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).order_by(cls.document_name, cls.chunk_index).all()
    
    @classmethod
    def delete_document_embeddings(cls, user_id, course_id, document_name):
        """Delete all embeddings for a specific document"""
        cls.query.filter_by(
            user_id=user_id,
            course_id=course_id,
            document_name=document_name
        ).delete()
        db.session.commit() 