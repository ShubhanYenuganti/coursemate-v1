import os
import openai
from typing import List, Dict, Optional
import json
from datetime import datetime

class ChatGPTWrapper:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_KEY')
        if not self.api_key:
            raise ValueError("OPENAI_KEY not found in environment variables")
        
        openai.api_key = self.api_key
        self.model = "gpt-3.5-turbo"
        
    def generate_response(
        self, 
        message: str, 
        conversation_history: List[Dict] = None,
        course_context: str = None,
        materials_context: str = None
    ) -> Dict:
        """
        Generate a response using ChatGPT with course context
        
        Args:
            message: User's input message
            conversation_history: Previous messages in the conversation
            course_context: Information about the current course
            materials_context: Relevant course materials content
            
        Returns:
            Dict containing response and metadata
        """
        try:
            # Build system prompt with course context
            system_prompt = self._build_system_prompt(course_context, materials_context)
            
            # Prepare conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history (last 10 messages to stay within token limits)
            if conversation_history:
                for msg in conversation_history[-10:]:
                    role = "user" if msg.get("type") == "user" else "assistant"
                    messages.append({"role": role, "content": msg.get("content", "")})
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Make API call
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                top_p=1.0,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )
            
            # Extract response content
            ai_response = response.choices[0].message.content.strip()
            
            # Generate mock sources (you can enhance this to actually find relevant materials)
            sources = self._generate_sources(message, materials_context)
            
            return {
                "success": True,
                "response": ai_response,
                "sources": sources,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except openai.error.RateLimitError:
            return {
                "success": False,
                "error": "Rate limit exceeded. Please try again in a moment.",
                "error_type": "rate_limit"
            }
        except openai.error.AuthenticationError:
            return {
                "success": False,
                "error": "Authentication failed. Please check your API key.",
                "error_type": "auth_error"
            }
        except openai.error.InvalidRequestError as e:
            return {
                "success": False,
                "error": f"Invalid request: {str(e)}",
                "error_type": "invalid_request"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"An unexpected error occurred: {str(e)}",
                "error_type": "general_error"
            }
    
    def _build_system_prompt(self, course_context: str = None, materials_context: str = None) -> str:
        """Build the system prompt with course context"""
        base_prompt = """You are an AI teaching assistant for a university course. Your role is to help students understand course materials, answer questions, and provide educational guidance.

Key behaviors:
- Be helpful, accurate, and educational
- Cite specific course materials when relevant
- Encourage critical thinking
- Break down complex concepts into understandable parts
- Provide examples when helpful
- If you're unsure about course-specific content, say so
- Suggest students consult with their instructor for clarification when appropriate"""

        if course_context:
            base_prompt += f"\n\nCourse Information:\n{course_context}"
        
        if materials_context:
            base_prompt += f"\n\nRelevant Course Materials:\n{materials_context}"
            
        return base_prompt
    
    def _generate_sources(self, message: str, materials_context: str = None) -> List[Dict]:
        """
        Generate source references based on the message content
        This is a simplified version - you can enhance this to actually search through materials
        """
        sources = []
        
        # Simple keyword matching for demo purposes
        if any(keyword in message.lower() for keyword in ['lecture', 'class', 'lesson']):
            sources.append({
                "title": "Course Lecture Notes",
                "page": 12,
                "type": "pdf"
            })
        
        if any(keyword in message.lower() for keyword in ['chapter', 'reading', 'textbook']):
            sources.append({
                "title": "Course Textbook - Chapter 3",
                "page": 45,
                "type": "pdf"
            })
            
        if any(keyword in message.lower() for keyword in ['video', 'recording', 'watch']):
            sources.append({
                "title": "Lecture Recording - Week 2",
                "timestamp": "15:30",
                "type": "video"
            })
        
        return sources
    
    def summarize_conversation(self, conversation_history: List[Dict]) -> str:
        """Generate a summary of the conversation for memory/notes"""
        try:
            # Extract just the conversation content
            conversation_text = ""
            for msg in conversation_history:
                role = "Student" if msg.get("type") == "user" else "AI Assistant"
                conversation_text += f"{role}: {msg.get('content', '')}\n"
            
            # Create summarization prompt
            messages = [
                {
                    "role": "system", 
                    "content": "Summarize this educational conversation between a student and AI assistant. Focus on key concepts discussed, questions asked, and important information provided. Keep it concise but comprehensive."
                },
                {"role": "user", "content": conversation_text}
            ]
            
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=messages,
                max_tokens=300,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"Summary generation failed: {str(e)}"

# Initialize the wrapper
chat_wrapper = ChatGPTWrapper() 