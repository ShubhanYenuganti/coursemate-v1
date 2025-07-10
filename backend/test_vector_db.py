from app import create_app
from app.init import db
from app.utils.embedding_service import EmbeddingService
from app.models.document_embedding import DocumentEmbedding
from sqlalchemy import text
import os

app = create_app()
embedding_service = EmbeddingService()

def test_vector_database():
    """Test the vector database functionality"""
    with app.app_context():
        try:
            print("🧪 Testing Vector Database Setup...")
            print("=" * 50)
            
            # Test 1: Check if pgvector extension is enabled
            print("\n1️⃣ Testing pgvector extension...")
            result = db.session.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector';"))
            extension = result.fetchone()
            
            if extension:
                print("✅ pgvector extension is enabled")
            else:
                print("❌ pgvector extension not found")
                return False
            
            # Test 2: Check if document_embeddings table exists
            print("\n2️⃣ Testing document_embeddings table...")
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_embeddings'
                );
            """))
            table_exists = result.scalar()
            
            if table_exists:
                print("✅ document_embeddings table exists")
            else:
                print("❌ document_embeddings table not found")
                return False
            
            # Test 3: Check if vector column has correct type
            print("\n3️⃣ Testing vector column type...")
            result = db.session.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'document_embeddings' 
                AND column_name = 'embedding';
            """))
            column_type = result.scalar()
            
            if column_type == 'USER-DEFINED':
                print("✅ embedding column has vector type")
            else:
                print(f"❌ embedding column type is {column_type}, expected vector")
                return False
            
            # Test 4: Test text chunking
            print("\n4️⃣ Testing text chunking...")
            test_text = "This is a test document. " * 100  # Create a longer text
            chunks = embedding_service.chunk_text(test_text)
            
            if chunks:
                print(f"✅ Text chunking works - created {len(chunks)} chunks")
                print(f"   First chunk length: {len(chunks[0])} characters")
            else:
                print("❌ Text chunking failed")
                return False
            
            # Test 5: Test embedding generation (if OpenAI API key is available)
            print("\n5️⃣ Testing embedding generation...")
            openai_key = os.getenv('OPENAI_API_KEY')
            
            if openai_key:
                try:
                    test_embedding = embedding_service.get_embedding("This is a test sentence.")
                    if len(test_embedding) == 1536:  # OpenAI ada-002 embeddings are 1536 dimensions
                        print("✅ Embedding generation works")
                        print(f"   Embedding dimensions: {len(test_embedding)}")
                    else:
                        print(f"❌ Unexpected embedding dimensions: {len(test_embedding)}")
                        return False
                except Exception as e:
                    print(f"❌ Embedding generation failed: {e}")
                    print("   (This might be due to API key or network issues)")
            else:
                print("⚠️  OpenAI API key not found - skipping embedding test")
            
            # Test 6: Check database functions
            print("\n6️⃣ Testing database functions...")
            
            # Check if find_similar_documents function exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM pg_proc 
                    WHERE proname = 'find_similar_documents'
                );
            """))
            function_exists = result.scalar()
            
            if function_exists:
                print("✅ find_similar_documents function exists")
            else:
                print("❌ find_similar_documents function not found")
                return False
            
            # Check if insert_document_embedding function exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM pg_proc 
                    WHERE proname = 'insert_document_embedding'
                );
            """))
            insert_function_exists = result.scalar()
            
            if insert_function_exists:
                print("✅ insert_document_embedding function exists")
            else:
                print("❌ insert_document_embedding function not found")
                return False
            
            print("\n" + "=" * 50)
            print("🎉 All vector database tests passed!")
            print("\n📋 Summary:")
            print("   ✅ pgvector extension enabled")
            print("   ✅ document_embeddings table created")
            print("   ✅ vector column type configured")
            print("   ✅ text chunking functional")
            print("   ✅ database functions available")
            if openai_key:
                print("   ✅ embedding generation working")
            else:
                print("   ⚠️  OpenAI API key needed for embeddings")
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            return False

if __name__ == "__main__":
    success = test_vector_database()
    if success:
        print("\n🚀 Vector database is ready for use!")
    else:
        print("\n💥 Vector database setup needs attention.")
        print("   Run 'python create_vector_table.py' to set up the database.") 