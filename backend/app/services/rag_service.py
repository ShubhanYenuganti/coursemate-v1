import openai
import os
from typing import List, Dict, Any
from .document_processor import DocumentProcessor

class RAGService:
    def __init__(self, openai_api_key: str = None):
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_KEY')
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
        self.document_processor = DocumentProcessor(openai_api_key)
    
    def answer_question(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """Answer a question using RAG (Retrieval-Augmented Generation)"""
        try:
            # Step 1: Retrieve relevant chunks
            relevant_chunks = self.document_processor.similarity_search(question, top_k)
            
            if not relevant_chunks:
                # Handle conversational messages even without materials
                greeting_words = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening']
                question_lower = question.lower().strip()
                
                if any(greeting in question_lower for greeting in greeting_words):
                    return {
                        "answer": "Hello! I'm your AI study assistant, and I'm here to help you with your coursework. Right now, I don't see any materials uploaded to work with. To get started, please upload some documents, PDFs, or text files using the Materials tab, and then I'll be able to answer questions about your content, help explain concepts, and even generate study materials like quizzes and flashcards for you. What would you like to study today?",
                        "source_files": [],
                        "confidence": 1.0
                    }
                else:
                    return {
                        "answer": "I'd love to help you with that question! However, I don't currently have any materials uploaded to reference. To provide you with accurate, helpful answers based on your specific coursework, please upload some documents or files using the Materials tab first. Once you do that, I'll be able to dive deep into your content and give you detailed explanations, examples, and answers tailored to your studies.",
                        "source_files": [],
                        "confidence": 0.0
                    }
            
            # Step 2: Prepare context from retrieved chunks
            context_parts = []
            source_files = set()
            
            for chunk, distance, filename in relevant_chunks:
                context_parts.append(chunk.chunk_text)
                source_files.add(filename)
            
            context = "\n\n".join(context_parts)
            
            # Step 3: Generate answer using GPT
            prompt = f"""You are a knowledgeable and friendly study assistant having a conversation with a student. You have access to their uploaded course materials and documents. Your goal is to help them understand concepts, answer questions, and provide helpful explanations.

Here are the relevant materials from their uploaded documents:

{context}

Student's question or message: {question}

Instructions for your response:
- Be conversational and engaging, as if you're a helpful tutor sitting with the student
- If they greet you (like "hello", "hi"), respond warmly and ask how you can help with their studies
- For academic questions, provide thorough explanations that help them truly understand the concept
- Use examples from their materials when helpful
- Break down complex topics into digestible parts
- If the question is unclear, ask clarifying questions to better help them
- Always base your answers on the provided materials, but present the information in a natural, conversational way
- If the materials don't contain enough information to fully answer their question, acknowledge this and explain what you can tell them from the available content
- Use a warm, encouraging tone that makes learning feel approachable

Please respond to their message now:"""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a warm, knowledgeable study assistant who helps students understand their course materials. You're having a natural conversation with them, always basing your responses on their uploaded documents. Be encouraging, thorough in explanations, and conversational in tone. Never mention 'sources' or 'context' - just naturally incorporate the information into your helpful responses."},
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
            print(f"Error answering question: {str(e)}")
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "source_files": [],
                "confidence": 0.0
            }
    
    def generate_quiz(self, topic: str = None, num_questions: int = 5, question_type: str = "multiple_choice") -> Dict[str, Any]:
        """Generate quiz questions from uploaded materials"""
        try:
            # If no specific topic, get a sample of chunks for general quiz
            if topic:
                relevant_chunks = self.document_processor.similarity_search(topic, top_k=10)
            else:
                # Get random chunks from all materials
                from ..models.material_chunk import MaterialChunk
                from ..models.uploaded_file import UploadedFile
                from ..extensions import db
                chunks_query = db.session.query(MaterialChunk, UploadedFile.filename).join(
                    UploadedFile, MaterialChunk.file_id == UploadedFile.id
                ).limit(10)
                relevant_chunks = [(chunk, 0.0, filename) for chunk, filename in chunks_query]
            
            if not relevant_chunks:
                return {
                    "questions": [],
                    "message": "No materials available to generate quiz from. Please upload some materials first."
                }
            
            # Prepare context
            context_parts = []
            for chunk, _, _ in relevant_chunks:
                context_parts.append(chunk.chunk_text)
            
            context = "\n\n".join(context_parts[:5])  # Limit context size
            
            # Generate quiz based on question type
            if question_type == "multiple_choice":
                prompt = f"""Based on the following material, create {num_questions} multiple choice questions with 4 options each. Make sure the questions test understanding of key concepts.

Material:
{context}

Format your response as JSON with this structure:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Generate {num_questions} high-quality multiple choice questions."""

            elif question_type == "true_false":
                prompt = f"""Based on the following material, create {num_questions} true/false questions that test understanding of key concepts.

Material:
{context}

Format your response as JSON with this structure:
{{
  "questions": [
    {{
      "question": "Statement to evaluate",
      "correct_answer": true,
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Generate {num_questions} high-quality true/false questions."""

            else:  # open_ended
                prompt = f"""Based on the following material, create {num_questions} open-ended questions that test deep understanding of key concepts.

Material:
{context}

Format your response as JSON with this structure:
{{
  "questions": [
    {{
      "question": "Open-ended question here?",
      "sample_answer": "A good sample answer",
      "key_points": ["Key point 1", "Key point 2", "Key point 3"]
    }}
  ]
}}

Generate {num_questions} thought-provoking open-ended questions."""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert quiz generator. Always respond with valid JSON in the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            import json
            quiz_data = json.loads(response.choices[0].message.content)
            
            return {
                "questions": quiz_data["questions"],
                "type": question_type,
                "topic": topic or "General",
                "generated_from": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error generating quiz: {str(e)}")
            return {
                "questions": [],
                "message": f"Error generating quiz: {str(e)}"
            }
    
    def generate_flashcards(self, topic: str = None, num_cards: int = 10) -> Dict[str, Any]:
        """Generate flashcards from uploaded materials"""
        try:
            # Get relevant content
            if topic:
                relevant_chunks = self.document_processor.similarity_search(topic, top_k=8)
            else:
                from ..models.material_chunk import MaterialChunk
                from ..models.uploaded_file import UploadedFile
                from ..extensions import db
                chunks_query = db.session.query(MaterialChunk, UploadedFile.filename).join(
                    UploadedFile, MaterialChunk.file_id == UploadedFile.id
                ).limit(8)
                relevant_chunks = [(chunk, 0.0, filename) for chunk, filename in chunks_query]
            
            if not relevant_chunks:
                return {
                    "flashcards": [],
                    "message": "No materials available to generate flashcards from. Please upload some materials first."
                }
            
            # Prepare context
            context_parts = []
            for chunk, _, _ in relevant_chunks:
                context_parts.append(chunk.chunk_text)
            
            context = "\n\n".join(context_parts)
            
            prompt = f"""Based on the following material, create {num_cards} flashcards for studying. Each flashcard should have a clear question/term on the front and a comprehensive answer/definition on the back.

Material:
{context}

Format your response as JSON with this structure:
{{
  "flashcards": [
    {{
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Topic category"
    }}
  ]
}}

Generate {num_cards} high-quality flashcards covering the most important concepts."""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at creating study materials. Always respond with valid JSON in the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1200,
                temperature=0.3
            )
            
            import json
            flashcard_data = json.loads(response.choices[0].message.content)
            
            return {
                "flashcards": flashcard_data["flashcards"],
                "topic": topic or "General",
                "generated_from": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error generating flashcards: {str(e)}")
            return {
                "flashcards": [],
                "message": f"Error generating flashcards: {str(e)}"
            }
    
    def generate_summary(self, topic: str = None) -> Dict[str, Any]:
        """Generate a summary of uploaded materials"""
        try:
            # Get relevant content
            if topic:
                relevant_chunks = self.document_processor.similarity_search(topic, top_k=10)
            else:
                from ..models.material_chunk import MaterialChunk
                chunks = MaterialChunk.query.limit(10).all()
                relevant_chunks = [(chunk, 0.0, "General") for chunk in chunks]
            
            if not relevant_chunks:
                return {
                    "summary": "No materials available to summarize. Please upload some materials first.",
                    "key_points": [],
                    "topic": topic or "General"
                }
            
            # Prepare context
            context_parts = []
            for chunk, _, filename in relevant_chunks:
                context_parts.append(chunk.chunk_text)
            
            context = "\n\n".join(context_parts)
            
            prompt = f"""Please create a comprehensive summary of the following material. Include the main topics, key concepts, and important details.

Material:
{context}

Format your response as JSON with this structure:
{{
  "summary": "A comprehensive summary of the material",
  "key_points": ["Key point 1", "Key point 2", "Key point 3", "etc."],
  "main_topics": ["Topic 1", "Topic 2", "Topic 3"]
}}

Provide a thorough but concise summary that captures the essential information."""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at summarizing academic and educational content. Always respond with valid JSON in the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.2
            )
            
            import json
            summary_data = json.loads(response.choices[0].message.content)
            
            return {
                **summary_data,
                "topic": topic or "General",
                "generated_from": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error generating summary: {str(e)}")
            return {
                "summary": f"Error generating summary: {str(e)}",
                "key_points": [],
                "topic": topic or "General"
            }
