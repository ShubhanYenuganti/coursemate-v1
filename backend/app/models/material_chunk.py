from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from pgvector.sqlalchemy import Vector
from ..extensions import db

class MaterialChunk(db.Model):
    __tablename__ = 'material_chunks'
    
    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('uploaded_files.id'), nullable=False)
    chunk_index = db.Column(db.Integer, nullable=False)
    chunk_text = db.Column(db.Text, nullable=False)
    embedding = db.Column(Vector(1536))  # OpenAI embeddings are 1536 dimensions
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'chunk_index': self.chunk_index,
            'chunk_text': self.chunk_text[:200] + '...' if len(self.chunk_text) > 200 else self.chunk_text,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
