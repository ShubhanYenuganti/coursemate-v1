import openai
import os
from typing import List, Dict, Any
from app.models.document_embedding import DocumentEmbedding
import tiktoken
from dotenv import load_dotenv

load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

class EmbeddingService:
    """Service for handling document embeddings and vector operations"""
    
    def __init__(self):
        self.encoding = tiktoken.get_encoding("cl100k_base")  # OpenAI's encoding
        self.chunk_size = 1000  # tokens per chunk
        self.chunk_overlap = 200  # tokens overlap between chunks
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks for embedding"""
        tokens = self.encoding.encode(text)
        chunks = []
        
        for i in range(0, len(tokens), self.chunk_size - self.chunk_overlap):
            chunk_tokens = tokens[i:i + self.chunk_size]
            chunk_text = self.encoding.decode(chunk_tokens)
            if chunk_text.strip():  # Only add non-empty chunks
                chunks.append(chunk_text.strip())
        
        return chunks
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a text using OpenAI API"""
        try:
            response = openai.Embedding.create(
                input=text,
                model="text-embedding-ada-002"
            )
            return response['data'][0]['embedding']
        except Exception as e:
            print(f"Error getting embedding: {e}")
            raise
    
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts in batch"""
        try:
            response = openai.Embedding.create(
                input=texts,
                model="text-embedding-ada-002"
            )
            return [data['embedding'] for data in response['data']]
        except Exception as e:
            print(f"Error getting batch embeddings: {e}")
            raise
    
    def process_document(self, user_id: str, course_id: str, document_name: str, 
                        document_type: str, file_path: str, content: str, 
                        metadata: Dict[str, Any] = None) -> List[int]:
        """Process a document and store its embeddings"""
        # Chunk the content
        chunks = self.chunk_text(content)
        
        if not chunks:
            print(f"No content chunks found for document: {document_name}")
            return []
        
        # Get embeddings for all chunks
        embeddings = self.get_embeddings_batch(chunks)
        
        # Store embeddings in database
        embedding_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            try:
                embedding_id = DocumentEmbedding.insert_embedding(
                    user_id=user_id,
                    course_id=course_id,
                    document_name=document_name,
                    document_type=document_type,
                    file_path=file_path,
                    content_chunk=chunk,
                    chunk_index=i,
                    embedding=embedding,
                    metadata=metadata or {}
                )
                embedding_ids.append(embedding_id)
            except Exception as e:
                print(f"Error storing embedding {i} for document {document_name}: {e}")
                continue
        
        print(f"Stored {len(embedding_ids)} embeddings for document: {document_name}")
        return embedding_ids
    
    def search_documents(self, query: str, user_id: str, course_id: str, 
                        similarity_threshold: float = 0.7, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents using semantic search"""
        try:
            # Get embedding for the query
            query_embedding = self.get_embedding(query)
            
            # Find similar documents
            similar_docs = DocumentEmbedding.find_similar_documents(
                query_embedding=query_embedding,
                user_id=user_id,
                course_id=course_id,
                similarity_threshold=similarity_threshold,
                limit=limit
            )
            
            return similar_docs
        except Exception as e:
            print(f"Error searching documents: {e}")
            return []
    
    def delete_document_embeddings(self, user_id: str, course_id: str, document_name: str):
        """Delete all embeddings for a specific document"""
        try:
            DocumentEmbedding.delete_document_embeddings(user_id, course_id, document_name)
            print(f"Deleted embeddings for document: {document_name}")
        except Exception as e:
            print(f"Error deleting embeddings for document {document_name}: {e}")
            raise
    
    def get_document_summary(self, user_id: str, course_id: str, document_name: str) -> Dict[str, Any]:
        """Get summary information about a document's embeddings"""
        try:
            embeddings = DocumentEmbedding.get_documents_by_course(user_id, course_id)
            document_embeddings = [e for e in embeddings if e.document_name == document_name]
            
            if not document_embeddings:
                return {"error": "Document not found"}
            
            return {
                "document_name": document_name,
                "total_chunks": len(document_embeddings),
                "document_type": document_embeddings[0].document_type,
                "file_path": document_embeddings[0].file_path,
                "created_at": document_embeddings[0].created_at.isoformat() if document_embeddings[0].created_at else None,
                "total_content_length": sum(len(e.content_chunk) for e in document_embeddings)
            }
        except Exception as e:
            print(f"Error getting document summary: {e}")
            return {"error": str(e)} 