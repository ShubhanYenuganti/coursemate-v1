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
    def answer_question_for_course(self, question: str, course_id: str, user_id: str, top_k: int = 5, conversation_context: List[Dict] = None) -> Dict[str, Any]:
        """Answer a question using course-specific materials with optional conversation context"""
        try:
            print(f"DEBUG: answer_question_for_course called with course_id: {course_id}, user_id: {user_id}, question: {question}")
            
            # Step 1: Retrieve relevant chunks from course materials
            relevant_chunks = self.course_document_processor.similarity_search_for_course(
                question, course_id, user_id, top_k
            )
            
            if not relevant_chunks:
                # Handle when no course materials are available - provide conversational, general help
                # Step: Prepare conversation history for general response
                conversation_history = ""
                if conversation_context and len(conversation_context) > 1:  # More than just current message
                    history_parts = []
                    for msg in conversation_context[:-1]:  # Exclude current message
                        role = "Human" if msg['role'] == 'user' else "Assistant"
                        history_parts.append(f"{role}: {msg['content']}")
                    conversation_history = "\n\n".join(history_parts)
                
                # Step: Generate a conversational response for general questions
                general_prompt = f"""You are a friendly, knowledgeable AI tutor and study companion. A student is asking you a question.

IMPORTANT: No course materials were found for this question. Please mention this in your response and explain why this might have happened.

{f"Previous conversation: {conversation_history}" if conversation_history else ""}

Student's question: {question}

Provide a helpful, conversational response that:
- STARTS by mentioning that you couldn't find any relevant course materials for this question
- Explains possible reasons (no materials uploaded, materials don't contain relevant info, or need to upload specific documents)
- Still tries to answer their question to the best of your general knowledge if it's an academic question
- Suggests uploading relevant course materials for more specific, targeted help
- Uses an engaging, supportive tone that makes learning feel approachable
- Encourages them to try uploading documents like syllabi, study guides, or lecture notes

Remember: Be helpful and encouraging while being transparent about the lack of course materials."""

                try:
                    response = openai.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a friendly, knowledgeable AI tutor who helps students with both general academic questions and course-specific questions when materials are available. Always be encouraging and conversational."},
                            {"role": "user", "content": general_prompt}
                        ],
                        max_tokens=600,
                        temperature=0.4
                    )
                    
                    return {
                        "answer": response.choices[0].message.content,
                        "source_files": [],
                        "confidence": 0.5,  # Medium confidence for general responses
                        "context_used": 0
                    }
                except Exception as e:
                    return {
                        "answer": "I'd love to help you with that question! However, I'm having some technical difficulties right now. Try asking again in a moment, or feel free to upload some course materials in the Materials tab so I can provide more specific assistance based on your coursework.",
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
            
            # Step 3: Prepare conversation context if provided
            conversation_history = ""  # Initialize the variable
            if conversation_context and len(conversation_context) > 1:  # More than just current message
                history_parts = []
                for msg in conversation_context[:-1]:  # Exclude current message
                    role = "Human" if msg['role'] == 'user' else "Assistant"
                    history_parts.append(f"{role}: {msg['content']}")
                conversation_history = "\n\n".join(history_parts)
            
            # Step 4: Generate answer using GPT with course context and conversation history
            if conversation_history:
                prompt = f"""You are a knowledgeable and friendly AI tutor helping a student with their studies. You have access to their uploaded course documents and can also help with general academic questions.

IMPORTANT: Course materials were found and are being used to answer this question. Please mention this in your response.

Previous conversation:
{conversation_history}

Here are the relevant materials from their course documents:

{context}

Student's question: {question}

Instructions for your response:
- START by mentioning that you found relevant information in their course materials
- Be conversational and engaging, like a helpful friend and tutor
- Consider our previous conversation when answering (e.g., "As we discussed earlier...", "Building on what we covered...")
- Use the course materials as your primary source for this response
- For broader concepts, supplement with your general knowledge while highlighting what comes from their materials
- Provide thorough but easy-to-understand explanations
- Use examples from their course materials when helpful
- Break down complex topics into digestible parts
- Use a warm, encouraging, and conversational tone
- Be clear about what information comes from their uploaded documents vs. your general knowledge

Please provide a helpful, conversational response:"""
            else:
                prompt = f"""You are a knowledgeable and friendly AI tutor helping a student with their studies. You have access to their uploaded course documents and can also help with general academic questions.

IMPORTANT: Course materials were found and are being used to answer this question. Please mention this in your response.

Here are the relevant materials from their course documents:

{context}

Student's question: {question}

Instructions for your response:
- START by mentioning that you found relevant information in their course materials
- Be conversational and engaging, like a helpful friend and tutor
- Use the course materials as your primary source for this response
- For broader concepts, supplement with your general knowledge while highlighting what comes from their materials
- Provide thorough but easy-to-understand explanations
- Use examples from their course materials when helpful
- Break down complex topics into digestible parts
- Use a warm, encouraging, and conversational tone
- Be clear about what information comes from their uploaded documents vs. your general knowledge

Please provide a helpful, conversational response:"""
            
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a warm, knowledgeable AI tutor who helps students with both course-specific questions (using their uploaded materials) and general academic questions. Always be conversational, encouraging, and thorough in your explanations."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.4
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
            print(f"DEBUG: Searching for materials - course_id: {course_id}, user_id: {user_id}, query: {query}")
            
            # Check if there are any uploaded files for this course
            file_count = db.session.query(UploadedFile).filter(
                UploadedFile.course_id == course_id,
                UploadedFile.user_id == user_id
            ).count()
            print(f"DEBUG: Found {file_count} uploaded files for course {course_id}")
            
            # Check if there are any chunks for this course
            chunk_count = db.session.query(MaterialChunk).join(
                UploadedFile, MaterialChunk.file_id == UploadedFile.id
            ).filter(
                UploadedFile.course_id == course_id,
                UploadedFile.user_id == user_id
            ).count()
            print(f"DEBUG: Found {chunk_count} material chunks for course {course_id}")
            
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
                print(f"DEBUG: Found chunk with distance {distance} from file {filename}")
                results.append((chunk, distance, filename))
            
            print(f"DEBUG: Returning {len(results)} results")
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
