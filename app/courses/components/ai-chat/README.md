# AI Chat Interface - Course-Specific Implementation

This directory contains the new AI Chat interface that replicates the exact same UI/UX as the `/chat/enhanced` page but specifically for AI conversations within each course.

## Components

### `NewAIChatInterface.tsx`
The main component that provides a tabbed interface:
- **Chat Tab**: RAG-powered AI chat for course materials
- **Generate Tab**: AI-powered study material generation
- Matches the structure of `/chat/enhanced` page

### `RAGChatCourse.tsx`
Chat interface component (similar to RAGChat):
- Course-specific AI conversations using RAG
- Displays messages with source materials
- Shows confidence scores when available
- Integrates with course materials and context

### `MaterialGenerationCourse.tsx`
Study material generation component:
- **Quiz Generation**: Multiple choice, true/false, short answer quizzes
- **Flashcard Generation**: Interactive flashcards with flip animations
- **Summary Generation**: Comprehensive summaries with key points
- All generation is course-specific using uploaded materials

### Legacy Components (replaced)
- `AIChatList.tsx` - Sidebar conversation list (replaced by tabbed interface)
- `AIChatWindow.tsx` - Chat window (replaced by RAGChatCourse)
- `QuickPrompts.tsx` - Quick prompt suggestions (replaced by tabs)

### `types.ts`
TypeScript interfaces for the AI chat system

## Features

✅ **Tabbed Interface**: Clean separation between Chat and Generate functions
✅ **RAG Integration**: Context-aware responses using course materials
✅ **Material Generation**: Create quizzes, flashcards, and summaries
✅ **Interactive Elements**: Clickable flashcards, submittable quizzes
✅ **Course Context**: All AI interactions are scoped to specific course
✅ **Source Display**: Shows which materials AI used for responses
✅ **Real-time Loading**: Loading states for all AI operations
✅ **Responsive Design**: Matches enhanced chat page design exactly

## API Integration

### Chat API
- Endpoint: `/api/chat/send`
- Sends course ID for context-aware responses
- Returns responses with source materials

### Generation APIs
- Quiz: `/api/materials/generate/quiz`
- Flashcards: `/api/materials/generate/flashcards`
- Summary: `/api/materials/generate/summary`
- All include course ID for context

## Usage

The interface is used in the course page:

```tsx
// In course page
import { NewAIChatInterface } from "../components/ai-chat";

// Use in tab content
ai: <NewAIChatInterface courseId={course.dbId} />
```

## Design Consistency

The interface maintains perfect visual consistency with `/chat/enhanced`:
- Identical header layout with title and description
- Same tabbed navigation structure
- Matching card designs and spacing
- Consistent button styles and interactions
- Same loading animations and states

## Implementation Notes

This implementation completely replaced the previous conversation-based chat interface with a more focused, educational tool that matches the enhanced chat page structure while being specifically designed for course-based learning.
