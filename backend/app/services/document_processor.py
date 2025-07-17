import os
import openai
import PyPDF2
import docx
from typing import List, Tuple
from ..models.uploaded_file import UploadedFile
from ..models.material_chunk import MaterialChunk
from ..extensions import db

class DocumentProcessor:
    def __init__(self, openai_api_key: str = None):
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_KEY')
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
    
    def extract_text_from_file(self, file_path: str, filename: str) -> str:
        """Extract text from various file types"""
        file_extension = filename.lower().split('.')[-1]
        
        try:
            if file_extension == 'pdf':
                return self._extract_text_from_pdf(file_path)
            elif file_extension == 'txt':
                return self._extract_text_from_txt(file_path)
            elif file_extension in ['docx', 'doc']:
                return self._extract_text_from_docx(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
        except Exception as e:
            print(f"Error extracting text from {filename}: {str(e)}")
            raise
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into chunks with overlap"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to end at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                for i in range(end - 100, end):
                    if i > start and text[i] in '.!?\n':
                        end = i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position (with overlap)
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using OpenAI API"""
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        try:
            response = openai.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error getting embedding: {str(e)}")
            raise
    
    def process_and_store_file(self, file_path: str, filename: str, user_id: int = None) -> UploadedFile:
        """Process a file: extract text, chunk it, generate embeddings, and store in database"""
        try:
            # Extract text from file
            text = self.extract_text_from_file(file_path, filename)
            
            # Create uploaded file record
            uploaded_file = UploadedFile(
                filename=filename,
                user_id=user_id
            )
            db.session.add(uploaded_file)
            db.session.flush()  # Get the ID
            
            # Chunk the text
            chunks = self.chunk_text(text)
            
            # Process each chunk
            for i, chunk_text in enumerate(chunks):
                # Generate embedding
                embedding = self.get_embedding(chunk_text)
                
                # Create chunk record
                chunk = MaterialChunk(
                    file_id=uploaded_file.id,
                    chunk_index=i,
                    chunk_text=chunk_text,
                    embedding=embedding  # pgvector will handle the list automatically
                )
                db.session.add(chunk)
            
            db.session.commit()
            return uploaded_file
            
        except Exception as e:
            db.session.rollback()
            print(f"Error processing file {filename}: {str(e)}")
            raise
    
    def similarity_search(self, query: str, top_k: int = 5) -> List[Tuple[MaterialChunk, float, str]]:
        """Perform similarity search against stored chunks"""
        try:
            # Get query embedding
            query_embedding = self.get_embedding(query)
            
            # Use SQLAlchemy ORM with pgvector functions and join with uploaded_files
            from sqlalchemy import func
            from pgvector.sqlalchemy import Vector
            
            # Query using ORM with distance function and filename
            results_query = db.session.query(
                MaterialChunk,
                MaterialChunk.embedding.cosine_distance(query_embedding).label('distance'),
                UploadedFile.filename
            ).join(
                UploadedFile, MaterialChunk.file_id == UploadedFile.id
            ).order_by(
                MaterialChunk.embedding.cosine_distance(query_embedding)
            ).limit(top_k)
            
            results = []
            for chunk, distance, filename in results_query:
                results.append((chunk, distance, filename))
            
            return results
            
        except Exception as e:
            print(f"Error performing similarity search: {str(e)}")
            # Fallback to simpler approach if the above fails
            try:
                # Simple query without distance calculation for debugging
                chunks_query = db.session.query(MaterialChunk, UploadedFile.filename).join(
                    UploadedFile, MaterialChunk.file_id == UploadedFile.id
                ).limit(top_k)
                return [(chunk, 0.5, filename) for chunk, filename in chunks_query]  # Dummy distance
            except Exception as e2:
                print(f"Fallback query also failed: {str(e2)}")
                raise
