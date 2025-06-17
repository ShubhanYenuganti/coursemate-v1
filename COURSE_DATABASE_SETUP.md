# Course Database System Setup Guide

## Overview

I've implemented a complete course database system following the same pattern as your existing user database. This system allows users to:

- ✅ Create and manage courses through the UI
- ✅ Store course data in a user-specific database
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Pin/unpin courses
- ✅ Archive/unarchive courses
- ✅ Track progress and last accessed dates
- ✅ Search and filter courses
- ✅ Responsive UI with loading states

## Architecture

### Backend Components

1. **Course Model** (`backend/app/models/course.py`)
   - UUID-based primary key
   - Foreign key relationship to User
   - All course fields from your CreateCourseModal
   - JSON fields for tags, collaborators, materials
   - Timestamps for created/updated/last_accessed

2. **Course Routes** (`backend/app/routes/courses.py`)
   - RESTful API endpoints
   - JWT authentication required
   - User-specific course access (security)
   - Filtering and sorting support

3. **Course Service** (`lib/api/courseService.ts`)
   - Frontend API client
   - TypeScript interfaces
   - Error handling and authentication

### Frontend Components

4. **Updated Courses Page** (`app/courses/page.tsx`)
   - Integrated with backend API
   - Real-time course loading
   - Error handling and loading states
   - Type-safe course operations

5. **Enhanced CreateCourseModal** (`app/courses/components/CreateCourseModal.tsx`)
   - Saves to backend database
   - Loading states and error handling
   - Refreshes course list after creation

## Setup Instructions

### 1. Database Migration

First, run the migration to create the course table:

```bash
cd backend
python create_course_migration.py
```

Expected output:
```
🚀 Starting Course Table Migration...
==================================================
✅ Successfully created course table and related indexes
📋 Course table schema:
   - id: String (UUID, Primary Key)
   - user_id: String (Foreign Key to users.id)
   ...
✅ Migration completed successfully!
```

### 2. Start the Backend Server

```bash
cd backend
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the server
python run.py
```

### 3. Start the Frontend

```bash
# In the project root
npm run dev
```

### 4. Test the System

You can test the API endpoints directly:

```bash
cd backend
python test_course_api.py
```

This will:
- Create a test user
- Test all course CRUD operations
- Verify the database is working correctly

## Database Schema

### Course Table Structure

```sql
CREATE TABLE courses (
    id VARCHAR PRIMARY KEY,           -- UUID
    user_id VARCHAR NOT NULL,         -- Foreign key to users.id
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    course_code VARCHAR(20),
    semester VARCHAR(50) NOT NULL,
    professor VARCHAR(100),
    units INTEGER DEFAULT 3,
    variable_units BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    visibility VARCHAR DEFAULT 'Public',
    tags JSON,                        -- Array of tags
    collaborators JSON,               -- Array of collaborator emails
    daily_progress INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    badge VARCHAR DEFAULT 'Creator',
    course_image VARCHAR(500),
    materials JSON,                   -- Array of file paths
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Key Features

- **User Isolation**: Each user only sees their own courses
- **UUID Primary Keys**: Secure, non-guessable IDs
- **JSON Fields**: Flexible storage for arrays (tags, collaborators, materials)
- **Cascade Delete**: When a user is deleted, their courses are automatically removed
- **Timestamps**: Automatic tracking of creation, updates, and access times

## API Endpoints

### Authentication Required
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Course Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | Get all user's courses |
| POST | `/api/courses` | Create a new course |
| GET | `/api/courses/{id}` | Get specific course |
| PUT | `/api/courses/{id}` | Update course |
| DELETE | `/api/courses/{id}` | Delete course |
| POST | `/api/courses/{id}/toggle-pin` | Toggle pin status |
| POST | `/api/courses/{id}/toggle-archive` | Toggle archive status |
| PUT | `/api/courses/{id}/progress` | Update progress |

### Query Parameters (GET /api/courses)

- `show_archived=true/false` - Include archived courses
- `search=term` - Search in title, subject, course code
- `semester=Fall 2024` - Filter by semester
- `sort_by=title|progress|last_accessed` - Sort order

## Frontend Usage

### Creating Courses

1. Click the "+" floating button
2. Fill out the course form
3. Click "Save" - course is automatically saved to your database
4. The course list refreshes with your new course

### Managing Courses

- **Pin/Unpin**: Click the star icon
- **Archive**: Use the dropdown menu
- **Edit Progress**: Coming soon (can be done via API)
- **Search**: Use the search bar in filters
- **Filter**: By semester, subject, progress level

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Displayed to user with retry options
- **Authentication Errors**: Redirect to login
- **Validation Errors**: Form-level error messages
- **Server Errors**: Graceful error display

## Security Features

- **User Isolation**: Users can only access their own courses
- **JWT Authentication**: All API calls require valid tokens
- **SQL Injection Protection**: Using SQLAlchemy ORM
- **Input Validation**: Server-side validation of all inputs

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check if database file exists
   ls backend/instance/
   
   # Recreate database
   cd backend
   python create_course_migration.py
   ```

2. **Authentication Errors**
   ```bash
   # Check if user is logged in
   # Look for token in browser localStorage
   console.log(localStorage.getItem('token'))
   ```

3. **API Connection Errors**
   ```bash
   # Verify backend is running
   curl http://localhost:5000/
   
   # Check CORS configuration in backend/app/init.py
   ```

### Development Tools

- **API Testing**: Use `backend/test_course_api.py`
- **Database Inspection**: Use `backend/find_db.py`
- **Logs**: Check browser console and terminal output

## Next Steps

The system is now fully functional. You can:

1. **Add File Upload**: Implement actual file storage for course materials
2. **Add Collaboration**: Implement sharing courses with other users
3. **Add Analytics**: Track course engagement and progress over time
4. **Add Notifications**: Remind users about courses they haven't accessed
5. **Add Export**: Allow users to export their course data

## Testing

Run the comprehensive test suite:

```bash
# Test backend API
cd backend
python test_course_api.py

# Manual testing
# 1. Create a course through the UI
# 2. Verify it appears in the course list
# 3. Test pin/unpin functionality
# 4. Test archive functionality
# 5. Test search and filtering
```

## Support

The system follows the same patterns as your existing user database:
- Same authentication flow
- Same error handling patterns
- Same database connection setup
- Same API response formats

If you encounter any issues, check the existing user routes and authentication setup as a reference.

---

🎉 **Your course database system is now ready to use!** Users can create, manage, and track their courses through the beautiful UI, with all data securely stored in the user-specific database. 