from app import create_app
from app.init import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    conn = db.engine.connect()
    
    try:
        print("🚀 Starting Vector Database Setup...")
        print("=" * 50)
        
        # 1. Enable pgvector extension
        print("📦 Enabling pgvector extension...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        print("✅ pgvector extension enabled")
        
        # 2. Create document_embeddings table
        print("\n📋 Creating document_embeddings table...")
        
        # First, drop the existing table if it exists (to fix the column type issue)
        conn.execute(text("DROP TABLE IF EXISTS document_embeddings CASCADE;"))
        
        conn.execute(text("""
            CREATE TABLE document_embeddings (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                course_id VARCHAR NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                content_chunk TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                embedding vector(1536),  -- OpenAI embeddings are 1536 dimensions
                doc_metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                
                -- Indexes for better performance
                CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            );
        """))
        print("✅ document_embeddings table created")
        
        # 3. Create indexes for better performance
        print("\n🔍 Creating performance indexes...")
        
        # Index on user_id and course_id for filtering
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_doc_embeddings_user_course 
            ON document_embeddings(user_id, course_id);
        """))
        
        # Index on document_name for searching
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_doc_embeddings_document_name 
            ON document_embeddings(document_name);
        """))
        
        # Index on embedding for similarity search (using HNSW for better performance)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_doc_embeddings_embedding_hnsw 
            ON document_embeddings USING hnsw (embedding vector_cosine_ops);
        """))
        
        print("✅ Performance indexes created")
        
        # 4. Create a function for similarity search
        print("\n🔍 Creating similarity search function...")
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION find_similar_documents(
                query_embedding vector(1536),
                user_id_param VARCHAR,
                course_id_param VARCHAR,
                similarity_threshold FLOAT DEFAULT 0.7,
                limit_count INTEGER DEFAULT 5
            )
            RETURNS TABLE (
                id INTEGER,
                document_name VARCHAR,
                content_chunk TEXT,
                chunk_index INTEGER,
                similarity FLOAT,
                doc_metadata JSONB
            )
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    de.id,
                    de.document_name,
                    de.content_chunk,
                    de.chunk_index,
                    1 - (de.embedding <=> query_embedding) as similarity,
                    de.doc_metadata
                FROM document_embeddings de
                WHERE de.user_id = user_id_param 
                    AND de.course_id = course_id_param
                    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
                ORDER BY de.embedding <=> query_embedding
                LIMIT limit_count;
            END;
            $$;
        """))
        print("✅ Similarity search function created")
        
        # 5. Create a function to insert embeddings
        print("\n💾 Creating embedding insertion function...")
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION insert_document_embedding(
                p_user_id VARCHAR,
                p_course_id VARCHAR,
                p_document_name VARCHAR,
                p_document_type VARCHAR,
                p_file_path VARCHAR,
                p_content_chunk TEXT,
                p_chunk_index INTEGER,
                p_embedding vector(1536),
                p_doc_metadata JSONB DEFAULT '{}'
            )
            RETURNS INTEGER
            LANGUAGE plpgsql
            AS $$
            DECLARE
                embedding_id INTEGER;
            BEGIN
                INSERT INTO document_embeddings (
                    user_id, course_id, document_name, document_type, 
                    file_path, content_chunk, chunk_index, embedding, doc_metadata
                ) VALUES (
                    p_user_id, p_course_id, p_document_name, p_document_type,
                    p_file_path, p_content_chunk, p_chunk_index, p_embedding, p_doc_metadata
                ) RETURNING id INTO embedding_id;
                
                RETURN embedding_id;
            END;
            $$;
        """))
        print("✅ Embedding insertion function created")
        
        conn.commit()
        
        print("\n" + "=" * 50)
        print("✅ Vector database setup completed successfully!")
        print("\n📊 Database schema:")
        print("   - document_embeddings table with vector support")
        print("   - HNSW index for fast similarity search")
        print("   - User and course isolation")
        print("   - Metadata storage for additional context")
        print("\n🔧 Available functions:")
        print("   - find_similar_documents() - for semantic search")
        print("   - insert_document_embedding() - for storing embeddings")
        
    except Exception as e:
        print(f"❌ Error during vector database setup: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close() 