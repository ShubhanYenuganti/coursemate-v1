# Vector Database Setup Guide

This guide will help you set up a vector database in PostgreSQL using pgAdmin for storing document embeddings in your CourseMate application.

## Overview

The vector database allows you to:
- ✅ Store document embeddings for semantic search
- ✅ Search through uploaded documents using natural language
- ✅ Power AI chat with context from your course materials
- ✅ Support multiple file types (PDF, DOCX, TXT)
- ✅ User and course-specific document isolation

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database (version 12 or higher)
2. **pgAdmin**: For database management
3. **OpenAI API Key**: For generating embeddings
4. **Python Dependencies**: Additional packages for text processing

## Step 1: Install pgvector Extension

### Option A: Using pgAdmin
1. Open pgAdmin and connect to your database
2. Open the Query Tool (SQL Editor)
3. Run this SQL command:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Option B: Using psql command line
```bash
psql -d your_database_name -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Option C: Using the provided script
```bash
cd backend
python create_vector_table.py
```

## Step 2: Install Python Dependencies

Install the required Python packages:

```bash
cd backend
pip install tiktoken==0.5.1 PyPDF2==3.0.1 python-docx==0.8.11
```

Or update your requirements.txt and install:

```bash
pip install -r requirements.txt
```

## Step 3: Set Up Environment Variables

Add your OpenAI API key to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 4: Run the Vector Database Setup

Execute the setup script to create all necessary database structures:

```bash
cd backend
python create_vector_table.py
```

Expected output:
```
🚀 Starting Vector Database Setup...
==================================================
📦 Enabling pgvector extension...
✅ pgvector extension enabled

📋 Creating document_embeddings table...
✅ document_embeddings table created

🔍 Creating performance indexes...
✅ Performance indexes created

🔍 Creating similarity search function...
✅ Similarity search function created

💾 Creating embedding insertion function...
✅ Embedding insertion function created

==================================================
✅ Vector database setup completed successfully!

📊 Database schema:
   - document_embeddings table with vector support
   - HNSW index for fast similarity search
   - User and course isolation
   - Metadata storage for additional context

🔧 Available functions:
   - find_similar_documents() - for semantic search
   - insert_document_embedding() - for storing embeddings
```

## Step 5: Test the Setup

Run the test script to verify everything is working:

```bash
cd backend
python test_vector_db.py
```

Expected output:
```
🧪 Testing Vector Database Setup...
==================================================
1️⃣ Testing pgvector extension...
✅ pgvector extension is enabled

2️⃣ Testing document_embeddings table...
✅ document_embeddings table exists

3️⃣ Testing vector column type...
✅ embedding column has vector type

4️⃣ Testing text chunking...
✅ Text chunking works - created X chunks

5️⃣ Testing embedding generation...
✅ Embedding generation works

6️⃣ Testing database functions...
✅ find_similar_documents function exists
✅ insert_document_embedding function exists

==================================================
🎉 All vector database tests passed!
```

## Database Schema

### document_embeddings Table

```sql
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
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

### Indexes for Performance

- **User/Course Index**: `idx_doc_embeddings_user_course` for filtering
- **Document Name Index**: `idx_doc_embeddings_document_name` for searching
- **Vector Index**: `idx_doc_embeddings_embedding_hnsw` for similarity search

## API Endpoints

Once set up, you'll have access to these API endpoints:

### Upload Document
```
POST /api/embeddings/upload
Content-Type: multipart/form-data

Parameters:
- file: The document file (PDF, DOCX, TXT)
- course_id: The course ID to associate with
```

### Search Documents
```
POST /api/embeddings/search
Content-Type: application/json

{
    "query": "What is machine learning?",
    "course_id": "course-uuid",
    "similarity_threshold": 0.7,
    "limit": 5
}
```

### Get Course Documents
```
GET /api/embeddings/documents/{course_id}
```

### Delete Document
```
DELETE /api/embeddings/documents/{course_id}/{document_name}
```

## Usage Examples

### 1. Upload a Document

```python
import requests

# Upload a PDF document
with open('lecture_notes.pdf', 'rb') as f:
    files = {'file': f}
    data = {'course_id': 'your-course-id'}
    
    response = requests.post(
        'http://localhost:5000/api/embeddings/upload',
        files=files,
        data=data,
        headers={'Authorization': f'Bearer {your_jwt_token}'}
    )
    
    print(response.json())
```

### 2. Search Documents

```python
import requests

# Search for similar content
data = {
    'query': 'Explain the concept of neural networks',
    'course_id': 'your-course-id',
    'similarity_threshold': 0.7,
    'limit': 5
}

response = requests.post(
    'http://localhost:5000/api/embeddings/search',
    json=data,
    headers={'Authorization': f'Bearer {your_jwt_token}'}
)

results = response.json()
for result in results['results']:
    print(f"Document: {result['document_name']}")
    print(f"Similarity: {result['similarity']:.3f}")
    print(f"Content: {result['content_chunk'][:200]}...")
    print("---")
```

## Integration with AI Chat

The vector database powers the AI chat interface by providing relevant context from uploaded documents. When a user asks a question, the system:

1. Generates an embedding for the question
2. Searches for similar document chunks
3. Uses the relevant content as context for the AI response

## Troubleshooting

### Common Issues

1. **pgvector extension not found**
   - Make sure you're using PostgreSQL 12+ and have pgvector installed
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **OpenAI API errors**
   - Verify your API key is correct
   - Check your OpenAI account has sufficient credits
   - Ensure network connectivity

3. **File upload errors**
   - Check file permissions in the uploads directory
   - Verify supported file types (PDF, DOCX, TXT)
   - Ensure sufficient disk space

4. **Database connection issues**
   - Verify your DATABASE_URL in .env
   - Check PostgreSQL is running
   - Ensure database user has necessary permissions

### Performance Tips

1. **Index Optimization**: The HNSW index provides fast similarity search
2. **Chunk Size**: Adjust chunk_size in EmbeddingService for your use case
3. **Batch Processing**: Use batch embedding generation for multiple documents
4. **Cleanup**: Regularly delete old embeddings to save space

## Next Steps

1. **Frontend Integration**: Add document upload UI to your course pages
2. **AI Chat Enhancement**: Integrate document search with your chat interface
3. **Advanced Features**: Add document summarization, question answering
4. **Performance Monitoring**: Track embedding generation and search performance

## Support

If you encounter issues:
1. Check the test script output for specific errors
2. Verify all prerequisites are met
3. Review the database logs for detailed error messages
4. Ensure all environment variables are properly set 