import os
import tempfile
from typing import List, Dict, Any, Optional
from llama_index.core import Document, VectorStoreIndex
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.core.node_parser import SentenceSplitter
from llama_index.readers.file import PDFReader, DocxReader
from dotenv import load_dotenv
import logging
import psycopg2

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LlamaIndexService:
    """Service for processing documents with LlamaIndex and storing in PostgreSQL vector database"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_KEY')
        if not self.openai_api_key:
            raise ValueError("OPENAI_KEY environment variable is required")
        
        # Configure text splitter
        self.text_splitter = SentenceSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        # PostgreSQL connection string
        self.db_url = os.getenv('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Log and print the database URL and table name for debugging
        logger.info(f"Connecting to DB: {self.db_url}")
        logger.info(f"Using table: document_embeddings")
        print(f"[LlamaIndexService] Connecting to DB: {self.db_url}")
        print(f"[LlamaIndexService] Using table: document_embeddings")
        
        # Parse connection string to extract components
        self._parse_connection_string()
        
        # Set up the embed model
        self.embed_model = OpenAIEmbedding(
            model="text-embedding-ada-002",
            api_key=self.openai_api_key
        )
    
    def _parse_connection_string(self):
        """Parse DATABASE_URL to extract connection parameters"""
        # Example: postgresql://user:password@host:port/database
        if self.db_url.startswith('postgresql://'):
            # Remove postgresql:// prefix
            url = self.db_url.replace('postgresql://', '')
            
            # Split into user:pass@host:port/database
            if '@' in url:
                auth_part, rest = url.split('@', 1)
                if ':' in auth_part:
                    self.db_user, self.db_password = auth_part.split(':', 1)
                else:
                    self.db_user = auth_part
                    self.db_password = ''
                
                if '/' in rest:
                    host_port, self.db_name = rest.split('/', 1)
                    if ':' in host_port:
                        self.db_host, self.db_port = host_port.split(':', 1)
                        self.db_port = int(self.db_port)
                    else:
                        self.db_host = host_port
                        self.db_port = 5432
                else:
                    self.db_host = rest
                    self.db_port = 5432
                    self.db_name = 'coursemate'
            else:
                # No authentication
                self.db_user = 'postgres'
                self.db_password = ''
                if '/' in url:
                    host_port, self.db_name = url.split('/', 1)
                    if ':' in host_port:
                        self.db_host, self.db_port = host_port.split(':', 1)
                        self.db_port = int(self.db_port)
                    else:
                        self.db_host = host_port
                        self.db_port = 5432
                else:
                    self.db_host = url
                    self.db_port = 5432
                    self.db_name = 'coursemate'
        else:
            # Fallback to default values
            self.db_host = 'localhost'
            self.db_port = 5432
            self.db_name = 'coursemate'
            self.db_user = 'postgres'
            self.db_password = ''
    
    def process_document(self, file_path: str, user_id: str, course_id: str, 
                        document_name: str, document_type: str) -> Dict[str, Any]:
        """Process a document and store its embeddings in the vector database"""
        try:
            logger.info(f"Processing document: {document_name}")
            
            # Read document based on file type
            documents = self._read_document(file_path, document_type, user_id, course_id, document_name)
            logger.info(f"Loaded {len(documents)} document(s) for vectorization.")
            if not documents:
                raise ValueError(f"Could not read document: {document_name}")
            logger.info(f"First document chunk: {documents[0].text[:200] if documents else 'N/A'}")
            logger.info(f"First document metadata: {documents[0].metadata if documents else 'N/A'}")

            # Create vector store
            vector_store = PGVectorStore.from_params(
                database=self.db_name,
                host=self.db_host,
                password=self.db_password,
                port=self.db_port,
                user=self.db_user,
                table_name="document_embeddings",
            )
            logger.info(f"PGVectorStore initialized for table 'document_embeddings'.")

            # Create storage context with the vector store
            from llama_index.core import StorageContext
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            print(f"[DEBUG] storage_context.vector_store: {type(storage_context.vector_store)}")

            # Create index with embed_model and storage_context
            try:
                index = VectorStoreIndex.from_documents(
                    documents,
                    embed_model=self.embed_model,
                    storage_context=storage_context,
                    transformations=[self.text_splitter],
                    show_progress=True
                )
                logger.info(f"VectorStoreIndex created. Chunks processed: {len(documents)}")
                print(f"[DEBUG] Storage context: {index.storage_context}")
                print(f"[DEBUG] Vector store: {vector_store}")
                logger.info(f"[DEBUG] Storage context: {index.storage_context}")
                logger.info(f"[DEBUG] Vector store: {vector_store}")
                # Persist the index to ensure data is saved to the vector store
                try:
                    print(f"[DEBUG] Calling persist() on storage context...")
                    index.storage_context.persist()
                    print(f"[DEBUG] Finished persist() call.")
                    logger.info("Persisted index to vector store.")
                except Exception as persist_error:
                    logger.error(f"Error during persist: {persist_error}")
                    print(f"[LlamaIndexService] Error during persist: {persist_error}")
                    import traceback
                    traceback.print_exc()
            except Exception as e:
                logger.error(f"Error during VectorStoreIndex.from_documents: {str(e)}")
                print(f"[LlamaIndexService] Error during VectorStoreIndex.from_documents: {e}")
                import traceback
                traceback.print_exc()
                raise
            
            # Add metadata to the vector store
            self._add_metadata_to_store(vector_store, user_id, course_id, document_name, document_type)
            
            logger.info(f"Successfully processed document: {document_name}")
            
            return {
                'success': True,
                'document_name': document_name,
                'chunks_processed': len(documents),
                'message': f'Document {document_name} processed and stored in vector database'
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'document_name': document_name
            }
    
    def _read_document(self, file_path: str, document_type: str, user_id: str, course_id: str, document_name: str) -> List[Document]:
        """Read document content based on file type"""
        try:
            if document_type.lower() == 'pdf':
                reader = PDFReader()
                documents = reader.load_data(file_path)
            elif document_type.lower() in ['docx', 'doc']:
                reader = DocxReader()
                documents = reader.load_data(file_path)
            elif document_type.lower() == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                documents = [Document(text=content)]
            else:
                raise ValueError(f"Unsupported file type: {document_type}")
            
            # Add metadata to documents
            for doc in documents:
                doc.metadata.update({
                    'file_path': file_path,
                    'document_type': document_type,
                    'user_id': user_id,
                    'course_id': course_id,
                    'document_name': document_name
                })
            
            return documents
            
        except Exception as e:
            logger.error(f"Error reading document {file_path}: {str(e)}")
            return []
    
    def _add_metadata_to_store(self, vector_store: PGVectorStore, user_id: str, 
                              course_id: str, document_name: str, document_type: str):
        """Add user and course metadata to the vector store"""
        try:
            # This would need to be implemented based on your specific vector store setup
            # For now, we'll use the existing embedding service approach
            pass
        except Exception as e:
            logger.error(f"Error adding metadata to vector store: {str(e)}")
    
    def search_documents(self, query: str, user_id: str, course_id: str, 
                        similarity_threshold: float = 0.7, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents using the vector database"""
        try:
            # Create vector store
            vector_store = PGVectorStore.from_params(
                database=self.db_name,
                host=self.db_host,
                password=self.db_password,
                port=self.db_port,
                user=self.db_user,
                table_name="document_embeddings",
            )
            
            # Create query engine with embed_model
            index = VectorStoreIndex.from_vector_store(vector_store, embed_model=self.embed_model)
            query_engine = index.as_query_engine(
                similarity_top_k=limit,
                response_mode="compact"
            )
            
            # Execute query
            response = query_engine.query(query)
            
            # Format results
            results = []
            for node in response.source_nodes:
                results.append({
                    'content': node.text,
                    'document_name': node.metadata.get('document_name', 'Unknown'),
                    'similarity': node.score if hasattr(node, 'score') else 0.0,
                    'metadata': node.metadata
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []
    
    def delete_document_embeddings(self, user_id: str, course_id: str, document_name: str):
        """Delete embeddings for a specific document"""
        try:
            # Create vector store
            vector_store = PGVectorStore.from_params(
                database=self.db_name,
                host=self.db_host,
                password=self.db_password,
                port=self.db_port,
                user=self.db_user,
                table_name="document_embeddings",
            )
            
            # Delete embeddings for the specific document
            # This would need to be implemented based on your vector store's delete capabilities
            logger.info(f"Deleted embeddings for document: {document_name}")
            
        except Exception as e:
            logger.error(f"Error deleting embeddings for document {document_name}: {str(e)}")
            raise
    
    def get_document_summary(self, user_id: str, course_id: str, document_name: str) -> Dict[str, Any]:
        """Get summary information about a document's embeddings"""
        try:
            # Create vector store
            vector_store = PGVectorStore.from_params(
                database=self.db_name,
                host=self.db_host,
                password=self.db_password,
                port=self.db_port,
                user=self.db_user,
                table_name="document_embeddings",
            )
            
            # Get document statistics
            # This would need to be implemented based on your vector store's capabilities
            return {
                'document_name': document_name,
                'status': 'processed',
                'message': 'Document embeddings available for search'
            }
            
        except Exception as e:
            logger.error(f"Error getting document summary: {str(e)}")
            return {'error': str(e)} 

def insert_placeholder_embedding(user_id, course_id, document_name, file_path, document_type, chunk_index=0, content_chunk="Placeholder content."):
    db_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO document_embeddings (
                chunk_index, embedding, doc_metadata, created_at, file_path, content_chunk,
                user_id, course_id, document_name, document_type
            )
            VALUES (
                %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s
            )
        ''', [
            chunk_index,  # chunk_index
            [0.0]*1536,   # placeholder embedding (adjust dimension if needed)
            '{"status": "placeholder"}',  # doc_metadata as JSON string
            file_path,
            content_chunk,
            user_id,
            course_id,
            document_name,
            document_type
        ])
        conn.commit()
        cur.close()
        conn.close()
        print(f"[Manual Insert] Inserted placeholder row for {document_name}")
    except Exception as e:
        print(f"[Manual Insert] Failed to insert placeholder: {e}")

def update_embedding_row(user_id, course_id, document_name, chunk_index, embedding, content_chunk, doc_metadata):
    import psycopg2
    import os
    db_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute('''
            UPDATE document_embeddings
            SET embedding = %s,
                content_chunk = %s,
                doc_metadata = %s
            WHERE user_id = %s
              AND course_id = %s
              AND document_name = %s
              AND chunk_index = %s
        ''', [
            embedding,
            content_chunk,
            doc_metadata,
            user_id,
            course_id,
            document_name,
            chunk_index
        ])
        conn.commit()
        cur.close()
        conn.close()
        print(f"[Manual Update] Updated row for {document_name} chunk {chunk_index}")
    except Exception as e:
        print(f"[Manual Update] Failed to update row: {e}")

def test_manual_insert():
    import psycopg2
    import os
    db_url = os.getenv('DATABASE_URL')
    print(f"[Manual Insert Test] Connecting to DB: {db_url}")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        # Insert a test row matching the actual schema
        cur.execute('''
            INSERT INTO document_embeddings (
                chunk_index, embedding, doc_metadata, created_at, file_path, content_chunk,
                user_id, course_id, document_name, document_type
            )
            VALUES (
                %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s
            )
        ''',
        [
            0,  # chunk_index
            [0.0]*1536,  # embedding (dummy vector, adjust dimension if needed)
            '{"test": "manual insert"}',  # doc_metadata as JSON string
            '/tmp/test.txt',  # file_path
            'This is a test chunk.',  # content_chunk
            'test_user',  # user_id
            'test_course',  # course_id
            'test_document.txt',  # document_name
            'txt'  # document_type
        ])
        conn.commit()
        print("[Manual Insert Test] Inserted test row into document_embeddings.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[Manual Insert Test] Failed to insert: {e}")

# Uncomment to run the manual insert test
# test_manual_insert() 

def process_and_update_embeddings(self, file_path, user_id, course_id, document_name, document_type):
    import json
    # Read and chunk the document
    documents = self._read_document(file_path, document_type, user_id, course_id, document_name)
    if not documents:
        print(f"No chunks found for {document_name}")
        return

    # Get embeddings for all chunks (batch if available)
    texts = [doc.text for doc in documents]
    try:
        # Try batch embedding
        embeddings = self.embed_model.get_text_embeddings(texts)
    except AttributeError:
        # Fallback to single embedding per chunk
        embeddings = [self.embed_model.get_text_embedding(doc.text) for doc in documents]

    for chunk_index, (doc, embedding) in enumerate(zip(documents, embeddings)):
        update_embedding_row(
            user_id=user_id,
            course_id=course_id,
            document_name=document_name,
            chunk_index=chunk_index,
            embedding=embedding,
            content_chunk=doc.text,
            doc_metadata=json.dumps(doc.metadata)
        ) 