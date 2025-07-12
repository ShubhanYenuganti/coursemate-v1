# LlamaIndex Integration Guide

This guide explains how to integrate LlamaIndex with your CourseMate application to automatically process uploaded documents and store them in your PostgreSQL vector database.

## Overview

The integration allows you to:
- ✅ Automatically process uploaded documents (PDF, DOCX, TXT)
- ✅ Generate embeddings and store them in PostgreSQL
- ✅ Enable semantic search across your course materials
- ✅ Power AI chat with context from uploaded documents
- ✅ Handle document deletion and cleanup

## Prerequisites

1. **Vector Database Setup**: Complete the vector database setup first
2. **OpenAI API Key**: Required for generating embeddings
3. **Python Dependencies**: LlamaIndex and related packages

## Step 1: Install Dependencies

Install the required LlamaIndex packages:

```bash
cd backend
pip install llama-index==0.10.0 llama-index-embeddings-openai==0.1.0 llama-index-vector-stores-postgres==0.1.0 llama-index-readers-file==0.1.0
```

Or update your requirements.txt and install:

```bash
pip install -r requirements.txt
```

## Step 2: Set Up Environment Variables

Ensure your `.env` file has the necessary variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_postgresql_connection_string
```

## Step 3: Run Vector Database Setup

If you haven't already, set up the vector database:

```bash
cd backend
python create_vector_table.py
```

## Step 4: Test the Integration

Run the LlamaIndex integration test:

```bash
cd backend
python test_llama_index.py
```

Expected output:
```
🧪 Testing LlamaIndex Integration...
==================================================
1️⃣ Testing LlamaIndex service initialization...
✅ LlamaIndex service initialized successfully

2️⃣ Testing document processing...
✅ Document processing successful
   Chunks processed: X

3️⃣ Testing document search...
✅ Document search successful
   Found X results

4️⃣ Testing document summary...
✅ Document summary successful
   Status: processed

==================================================
🎉 LlamaIndex integration test completed!
```

## How It Works

### 1. Document Upload Flow

When a user uploads a document:

1. **File Upload**: User uploads a file through the materials interface
2. **File Type Check**: System checks if the file type is supported (PDF, DOCX, TXT)
3. **File Storage**: File is saved to S3 or local storage
4. **Vector Processing**: If supported, LlamaIndex processes the document:
   - Extracts text content
   - Splits into chunks
   - Generates embeddings
   - Stores in PostgreSQL vector database
5. **Response**: Returns upload status with vector processing results

### 2. Supported File Types

- **PDF**: Uses PDFReader to extract text
- **DOCX/DOC**: Uses DocxReader to extract text
- **TXT**: Direct text file reading
- **Other files**: Uploaded but not processed for vectors

### 3. Vector Processing Details

- **Chunk Size**: 1000 tokens per chunk
- **Chunk Overlap**: 200 tokens overlap between chunks
- **Embedding Model**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Storage**: PostgreSQL with pgvector extension

## API Integration

### Upload Response

The upload endpoint now returns additional information:

```json
{
  "url": "file_url",
  "filename": "document.pdf",
  "vector_processed": true,
  "chunks_processed": 15,
  "message": "Document uploaded and processed"
}
```

### Error Handling

If vector processing fails, the file is still uploaded but with a warning:

```json
{
  "url": "file_url",
  "filename": "document.pdf",
  "vector_processed": false,
  "warning": "Document uploaded but vector processing failed: API error"
}
```

## Frontend Integration

### Upload Status Display

The frontend now shows vector processing status:

- ✅ **Green checkmark**: Document processed successfully
- ⚠️ **Yellow warning**: Processing failed but file uploaded
- 📊 **Chunk count**: Number of text chunks created

### File List Updates

Uploaded files show:
- File name and type
- Vector processing status
- Number of chunks processed
- Any warnings or errors

## Usage Examples

### 1. Upload a PDF Document

```javascript
// Frontend upload
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch(`/api/courses/${courseId}/materials/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Upload result:', result);
// {
//   url: "courses/123/document.pdf",
//   filename: "document.pdf",
//   vector_processed: true,
//   chunks_processed: 25,
//   message: "Document uploaded and processed"
// }
```

### 2. Search Documents

```javascript
// Search through uploaded documents
const searchResponse = await fetch('/api/embeddings/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: "What is machine learning?",
    course_id: courseId,
    similarity_threshold: 0.7,
    limit: 5
  })
});

const searchResults = await searchResponse.json();
console.log('Search results:', searchResults);
```

## Troubleshooting

### Common Issues

1. **LlamaIndex Import Errors**
   ```bash
   pip install --upgrade llama-index
   ```

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check your OpenAI account has sufficient credits
   - Ensure network connectivity

3. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Check PostgreSQL is running
   - Ensure pgvector extension is installed

4. **File Processing Errors**
   - Check file permissions
   - Verify supported file types
   - Check file size limits

### Debug Mode

Enable debug logging in the LlamaIndex service:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Performance Tips

1. **Chunk Size**: Adjust chunk_size in LlamaIndexService for your use case
2. **Batch Processing**: Process multiple documents in parallel
3. **Caching**: Cache embeddings for frequently accessed documents
4. **Cleanup**: Regularly delete old embeddings to save space

## Integration with AI Chat

The vector database powers your AI chat interface:

1. **User asks a question** in the chat
2. **System searches** uploaded documents for relevant content
3. **Context is provided** to the AI model
4. **AI responds** with information from your course materials

## Next Steps

1. **Test the Integration**: Upload some documents and verify processing
2. **Monitor Performance**: Check processing times and storage usage
3. **Enhance Search**: Add filters and advanced search features
4. **Optimize**: Fine-tune chunk sizes and processing parameters

## Support

If you encounter issues:
1. Check the test script output for specific errors
2. Verify all prerequisites are met
3. Review the logs for detailed error messages
4. Ensure all environment variables are properly set

The LlamaIndex integration provides a powerful foundation for semantic search and AI-powered features in your CourseMate application! 