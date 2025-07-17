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
                return {
                    "answer": "I don't have any relevant information to answer your question. Please upload some materials first.",
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
            prompt = f"""Based on the following context, please answer the question. Provide a clear, comprehensive answer without mentioning sources in your response - the sources will be listed separately.

Context:
{context}

Question: {question}

Please provide a direct, helpful answer based on the information provided."""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context. Give direct, clear answers without mentioning sources or saying 'according to the context'. Just provide the information naturally."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.1
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
                    "quiz": [],
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
                "quiz": quiz_data["questions"],
                "type": question_type,
                "topic": topic or "General",
                "generated_from": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error generating quiz: {str(e)}")
            return {
                "quiz": [],
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
            for chunk, _ in relevant_chunks:
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
                relevant_chunks = [(chunk, 0.0) for chunk in chunks]
            
            if not relevant_chunks:
                return {
                    "summary": "No materials available to summarize. Please upload some materials first.",
                    "key_points": [],
                    "topic": topic or "General"
                }
            
            # Prepare context
            context_parts = []
            for chunk, _ in relevant_chunks:
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
