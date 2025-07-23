import os
from typing import List, Dict, Any, Tuple
from .document_processor import DocumentProcessor
from .rag_service import RAGService
from ..models.uploaded_file import UploadedFile
from ..models.material_chunk import MaterialChunk
from ..extensions import db
import openai

class CourseRAGService(RAGService):
    """Extended RAG service for course-specific materials"""
    
    def __init__(self, openai_api_key: str = None):
        super().__init__(openai_api_key)
        self.course_document_processor = CourseDocumentProcessor(openai_api_key)
    
    def answer_question_for_course(self, question: str, course_id: str, user_id: str, top_k: int = 5) -> Dict[str, Any]:
        """Answer a question using course-specific materials"""
        try:
            # Step 1: Retrieve relevant chunks from course materials
            relevant_chunks = self.course_document_processor.similarity_search_for_course(
                question, course_id, user_id, top_k
            )
            
            if not relevant_chunks:
                # Handle when no course materials are available
                return {
                    "answer": "I'd love to help you with that question! However, I don't see any materials uploaded for this course yet. To provide you with accurate, helpful answers based on your specific coursework, please upload some documents or files using the Materials tab first. Once you do that, I'll be able to dive deep into your content and give you detailed explanations, examples, and answers tailored to your studies.",
                    "source_files": [],
                    "confidence": 0.0,
                    "context_used": 0
                }
            
            # Step 2: Prepare context from retrieved chunks
            context_parts = []
            source_files = set()
            
            for chunk, distance, filename in relevant_chunks:
                context_parts.append(chunk.chunk_text)
                source_files.add(filename)
            
            context = "\n\n".join(context_parts)
            
            # Step 3: Generate answer using GPT with course context
            prompt = f"""You are a knowledgeable and friendly study assistant helping a student with their course materials. You have access to their uploaded course documents and should provide helpful explanations based on this content.

Here are the relevant materials from their course documents:

{context}

Student's question: {question}

Instructions for your response:
- Be conversational and engaging, as if you're a helpful tutor
- Provide thorough explanations that help them understand the concept
- Use examples from their course materials when helpful
- Break down complex topics into digestible parts
- Always base your answers on the provided course materials
- If the materials don't contain enough information, acknowledge this and explain what you can tell them from the available content
- Use a warm, encouraging tone that makes learning feel approachable

Please respond to their question:"""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a warm, knowledgeable study assistant who helps students understand their course materials. Base your responses on their uploaded course documents and be encouraging and thorough in explanations."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.3
            )
            
            answer = response.choices[0].message.content
            
            # Calculate average confidence based on similarity scores
            avg_similarity = sum(1 - dist for _, dist, _ in relevant_chunks) / len(relevant_chunks)
            
            return {
                "answer": answer,
                "source_files": list(source_files),
                "confidence": avg_similarity,
                "context_used": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error answering question for course {course_id}: {str(e)}")
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "source_files": [],
                "confidence": 0.0,
                "context_used": 0
            }


class CourseDocumentProcessor(DocumentProcessor):
    """Extended document processor for course-specific materials"""
    
    def process_and_store_course_file(self, file_path: str, filename: str, course_id: str, user_id: str = None) -> UploadedFile:
        """Process a file for a specific course: extract text, chunk it, generate embeddings, and store in database"""
        try:
            # Extract text from file
            text = self.extract_text_from_file(file_path, filename)
            
            # Clean the text to remove null characters
            text = self._clean_text(text)
            
            # Create uploaded file record with course_id
            uploaded_file = UploadedFile(
                filename=filename,
                user_id=user_id,
                course_id=course_id
            )
            db.session.add(uploaded_file)
            db.session.flush()  # Get the ID
            
            # Chunk the text
            chunks = self.chunk_text(text)
            
            # Process each chunk
            for i, chunk_text in enumerate(chunks):
                # Clean chunk text
                chunk_text = self._clean_text(chunk_text)
                
                if chunk_text.strip():  # Only process non-empty chunks
                    # Generate embedding
                    embedding = self.get_embedding(chunk_text)
                    
                    # Create chunk record
                    chunk = MaterialChunk(
                        file_id=uploaded_file.id,
                        chunk_index=i,
                        chunk_text=chunk_text,
                        embedding=embedding
                    )
                    db.session.add(chunk)
            
            db.session.commit()
            return uploaded_file
            
        except Exception as e:
            db.session.rollback()
            print(f"Error processing course file {filename}: {str(e)}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing null characters and other problematic characters"""
        if not text:
            return ""
        
        # Remove null characters and other control characters
        cleaned_text = text.replace('\x00', '')  # Remove NUL characters
        cleaned_text = ''.join(char for char in cleaned_text if ord(char) >= 32 or char in '\n\r\t')
        
        # Remove excessive whitespace
        cleaned_text = ' '.join(cleaned_text.split())
        
        return cleaned_text
    
    def similarity_search_for_course(self, query: str, course_id: str, user_id: str, top_k: int = 5) -> List[Tuple[MaterialChunk, float, str]]:
        """Perform similarity search against stored chunks for a specific course"""
        try:
            # Get query embedding
            query_embedding = self.get_embedding(query)
            
            # Query chunks that belong to files from the specific course
            results_query = db.session.query(
                MaterialChunk,
                MaterialChunk.embedding.cosine_distance(query_embedding).label('distance'),
                UploadedFile.filename
            ).join(
                UploadedFile, MaterialChunk.file_id == UploadedFile.id
            ).filter(
                UploadedFile.course_id == course_id,
                UploadedFile.user_id == user_id
            ).order_by(
                MaterialChunk.embedding.cosine_distance(query_embedding)
            ).limit(top_k)
            
            results = []
            for chunk, distance, filename in results_query:
                results.append((chunk, distance, filename))
            
            return results
            
        except Exception as e:
            print(f"Error performing course similarity search: {str(e)}")
            return []
    
    def get_course_materials_count(self, course_id: str, user_id: str) -> int:
        """Get the number of materials uploaded for a specific course"""
        try:
            count = db.session.query(UploadedFile).filter(
                UploadedFile.course_id == course_id,
                UploadedFile.user_id == user_id
            ).count()
            return count
        except Exception as e:
            print(f"Error getting course materials count: {str(e)}")
            return 0
