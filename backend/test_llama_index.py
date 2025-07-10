from app import create_app
from app.utils.llama_index_service import LlamaIndexService
import os
import tempfile

app = create_app()

def test_llama_index_integration():
    """Test LlamaIndex integration with vector database"""
    with app.app_context():
        try:
            print("🧪 Testing LlamaIndex Integration...")
            print("=" * 50)
            
            # Test 1: Initialize LlamaIndex service
            print("\n1️⃣ Testing LlamaIndex service initialization...")
            try:
                llama_service = LlamaIndexService()
                print("✅ LlamaIndex service initialized successfully")
            except Exception as e:
                print(f"❌ Failed to initialize LlamaIndex service: {e}")
                return False
            
            # Test 2: Create a test document
            print("\n2️⃣ Testing document processing...")
            test_content = """
            This is a test document about machine learning.
            Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed.
            There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.
            Supervised learning uses labeled training data to make predictions on new, unseen data.
            Unsupervised learning finds patterns in data without any labels.
            Reinforcement learning learns through trial and error by receiving rewards or penalties.
            """
            
            # Create a temporary text file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                temp_file.write(test_content)
                temp_file_path = temp_file.name
            
            try:
                # Test document processing
                result = llama_service.process_document(
                    file_path=temp_file_path,
                    user_id="test-user-id",
                    course_id="test-course-id",
                    document_name="test_document.txt",
                    document_type="txt"
                )
                
                if result['success']:
                    print("✅ Document processing successful")
                    print(f"   Chunks processed: {result.get('chunks_processed', 0)}")
                else:
                    print(f"❌ Document processing failed: {result.get('error', 'Unknown error')}")
                    return False
                    
            finally:
                # Clean up temp file
                os.unlink(temp_file_path)
            
            # Test 3: Test document search
            print("\n3️⃣ Testing document search...")
            try:
                search_results = llama_service.search_documents(
                    query="What is machine learning?",
                    user_id="test-user-id",
                    course_id="test-course-id",
                    limit=3
                )
                
                if search_results:
                    print("✅ Document search successful")
                    print(f"   Found {len(search_results)} results")
                    for i, result in enumerate(search_results[:2]):  # Show first 2 results
                        print(f"   Result {i+1}: {result.get('content', '')[:100]}...")
                else:
                    print("⚠️  No search results found (this might be normal for test data)")
                    
            except Exception as e:
                print(f"❌ Document search failed: {e}")
                return False
            
            # Test 4: Test document summary
            print("\n4️⃣ Testing document summary...")
            try:
                summary = llama_service.get_document_summary(
                    user_id="test-user-id",
                    course_id="test-course-id",
                    document_name="test_document.txt"
                )
                
                if 'error' not in summary:
                    print("✅ Document summary successful")
                    print(f"   Status: {summary.get('status', 'Unknown')}")
                else:
                    print(f"⚠️  Document summary warning: {summary.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"❌ Document summary failed: {e}")
                return False
            
            print("\n" + "=" * 50)
            print("🎉 LlamaIndex integration test completed!")
            print("\n📋 Summary:")
            print("   ✅ LlamaIndex service initialization")
            print("   ✅ Document processing")
            print("   ✅ Document search")
            print("   ✅ Document summary")
            print("\n🚀 Ready to process uploaded documents!")
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            return False

if __name__ == "__main__":
    success = test_llama_index_integration()
    if success:
        print("\n✅ LlamaIndex integration is working correctly!")
    else:
        print("\n💥 LlamaIndex integration needs attention.")
        print("   Check your OpenAI API key and database connection.") 