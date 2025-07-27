# Quiz Save to Materials Feature

This feature allows users to save AI-generated quizzes as materials in their course, making them available for future reference and study.

## Components Added

### 1. Backend Endpoint (`/api/courses/{course_id}/materials/save-quiz`)
- **Method**: POST
- **Purpose**: Saves quiz data as a JSON material in the database
- **Request Body**: 
  ```json
  {
    "quiz_data": {
      "questions": [...],
      "type": "multiple_choice",
      "topic": "Linear Algebra",
      "generated_from": 5
    },
    "material_name": "Quiz: Linear Algebra"
  }
  ```
- **Response**: Returns the saved material object with S3 URL

### 2. QuizViewer Component (`app/courses/components/QuizViewer.tsx`)
- **Purpose**: Interactive quiz viewing component (non-PDF format)
- **Features**:
  - Display quiz questions with proper formatting
  - Support for multiple choice, true/false, and short answer questions
  - Interactive answer submission and validation
  - Show correct answers and explanations
  - Score tracking and progress display
  - Reset functionality
  - "Show All Answers" toggle for quick review

### 3. Enhanced MaterialGenerationCourse Component
- **New Feature**: "Save to Materials" button appears after generating a quiz
- **Functionality**: Saves the current quiz to the course materials with one click
- **UI**: Loading state and success/error feedback

### 4. Enhanced MaterialsManagerCourse Component
- **New Features**:
  - Detects quiz materials (file_type: 'quiz')
  - Special brain icon for quiz files (purple color)
  - Custom purple badge for quiz materials
  - Quiz-specific viewer (opens QuizViewer instead of PDF viewer)
  - Seamless integration with existing file management

## How It Works

1. **Generate Quiz**: User generates a quiz using the AI chat interface
2. **Save Quiz**: User clicks "Save to Materials" button
3. **Storage**: Quiz data is saved as JSON to S3 and registered in database
4. **View Quiz**: Quiz appears in materials list with brain icon and QUIZ badge
5. **Interactive View**: Clicking "View" opens the QuizViewer component
6. **Study Mode**: Users can take the quiz, submit answers, and see explanations

## File Types Supported

The system now supports these material types:
- **PDF**: Opens in PDF viewer with annotations
- **Images**: Opens in image preview modal
- **Quiz**: Opens in interactive QuizViewer component
- **Other**: Shows download/external link options

## Database Schema

Quiz materials are stored with:
- `file_type`: 'quiz'
- `content_type`: 'application/json'
- `file_path`: S3 path to JSON file
- `material_name`: User-friendly name (e.g., "Quiz: Linear Algebra")

## Benefits

1. **Persistent Storage**: Quizzes are saved permanently with the course
2. **Interactive Learning**: Full quiz functionality with scoring and explanations
3. **Easy Access**: Quizzes appear alongside other course materials
4. **Seamless UX**: Same interface for all material types
5. **Study Aid**: Users can retake quizzes and review explanations anytime

## Future Enhancements

- Quiz statistics and performance tracking
- Quiz sharing between users
- Quiz templates and customization
- Export quiz results
- Quiz difficulty analysis
