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
    
    def generate_quiz(self, topic: str = None, num_questions: int = 5, question_type: str = "multiple_choice", question_config:List[Dict] = None) -> Dict[str, Any]:
        """Generate quiz questions from uploaded materials
        
        Args:
            topic: Specific topic to focus on (optional)
            num_questions: number of questions (used if question_config not provided)
            question_type: default question type (used if question_config not provided)
            question_config: List of question configurations, e.g.:
            [
                {"type": "multiple_choice", "allow_multiple": False},
                {"type": "multiple_choice", "allow_multiple": True},
                {"type": "true_false"},
                {"type": "short_answer"}
            ]
        """
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
            
            if question_config:
                questions_to_generate = question_config
            else:
                questions_to_generate = [{"type": question_type, "allow_multiple": False}] * num_questions
                
            prompt = self._build_mixed_quiz_prompt(context, questions_to_generate, topic)

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert quiz generator. Always respond with valid JSON in the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            import json
            quiz_data = json.loads(response.choices[0].message.content)
            
            return {
                "questions": quiz_data["questions"],
                "topic": topic or "General",
                "generated_from": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error generating quiz: {str(e)}")
            return {
                "questions": [],
                "message": f"Error generating quiz: {str(e)}"
            }
    
    def _build_mixed_quiz_prompt(self, context: str, question_config: List[Dict], topic: str = None) -> str:
        """Builds a prompt for generating a mixed quiz based on question configurations."""
        
        questions_spec = []
        for i, config in enumerate(question_config, start=1):
            q_type = config.get("type", "multiple_choice")
            allow_multiple = config.get("allow_multiple", False)

            if q_type == "multiple_choice":
                if allow_multiple:
                    questions_spec.append(f"Question {i}: Multiple choice with MULTIPLE correct answers (select all that apply)")
                else:
                    questions_spec.append(f"Question {i}: Multiple choice with a SINGLE correct answer")
            elif q_type == "true_false":
                questions_spec.append(f"Question {i}: True/False")
            elif q_type == "short_answer":
                questions_spec.append(f"Question {i}: Short answer (open-ended)")
                
        questions_spec_text = "\n".join(questions_spec)

        prompt = f"""Based on the following material, create {len(question_config)} questions exactly as specified below.

Material:
{context}

Question Specifications:
{questions_spec_text}

Format your response as JSON with this EXACT structure:
{{
  "questions": [
    // For single-answer multiple choice:
    {{
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "allow_multiple": false,
      "explanation": "Why this answer is correct"
    }},
    // For multiple-answer multiple choice:
    {{
      "type": "multiple_choice",
      "question": "Question text here? (Select all that apply)",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": ["A", "C"],
      "allow_multiple": true,
      "explanation": "Why these answers are correct"
    }},
    // For true/false:
    {{
      "type": "true_false",
      "question": "Statement to evaluate",
      "correct_answer": true,
      "explanation": "Why this answer is correct"
    }},
    // For short answer:
    {{
      "type": "short_answer",
      "question": "Open-ended question here?",
      "sample_answer": "A good sample answer",
      "key_points": ["Key point 1", "Key point 2", "Key point 3"],
      "explanation": "What makes a good answer"
    }}
  ]
}}

IMPORTANT: 
- Generate exactly {len(question_config)} questions in the exact order and types specified
- For multiple-answer questions, correct_answer should be an array of letters
- For single-answer questions, correct_answer should be a single letter
- Always include the "type" field for each question
- For multiple choice questions, always include "allow_multiple" field"""

        return prompt
    
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