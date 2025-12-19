# Files and Directories to Remove

This document lists all files and directories that should be removed to keep only:
- Login/logout Google OAuth
- My courses page (`/courses`)
- Discover courses page (`/courses/discover`)
- Landing page for a course (`/courses/[courseId]`) with tabs: overview, materials, AI chat, generate
- Materials (uploaded files for courses)
- AI chat (course-specific)
- Generate page (quiz, flashcards, summaries)
---

## 🗑️ Frontend Files to Remove

### App Routes (app/)
```

```

### Course Components to Remove
```
app/courses/components/FlashcardViewer.tsx          # Standalone viewer (if not used)
app/courses/components/QuizViewer.tsx                # Standalone viewer (if not used)
```

### Dashboard Components
```
```

### Other Components
```
app/components/NotificationsDropdown.tsx  # Notifications (unless needed)
```

### Contexts to Remove
```
app/context/CallContext.tsx       # Call context
app/context/SocketContext.tsx     # Socket context (unless needed for chat)
```

### API Services (lib/api/)
```
```

### Other Files
```
pages/_app.tsx                     # Review if needed (Next.js pages router)
```

---

## 🗑️ Backend Files to Remove

### Routes (backend/app/routes/)
```
backend/app/routes/calendar.py     # Calendar routes
backend/app/routes/goals.py       # Goals routes
backend/app/routes/tasks.py       # Tasks routes
backend/app/routes/chat.py        # Standalone chat routes (keep conversations.py)
backend/app/routes/test.py        # Test routes
```

### Models (backend/app/models/)
```
backend/app/models/goal.py         # Goals model
backend/app/models/task.py         # Tasks model
backend/app/models/community.py   # Community model
backend/app/models/annotations.py  # Annotations model (if not used)
```

### Other Backend Files
```
backend/chat.py                    # Standalone chat implementation
backend/create_community_tables.py # Community migration
backend/create_tasks_migration.py  # Tasks migration
backend/add_tasks_column.py        # Tasks migration
```

---

## ✏️ Files to Modify

### Course Detail Page
**File:** `app/courses/[courseId]/page.tsx`
- Remove imports: `StudyPlanTab`, `CommunityTab`
- Remove from `tabOrder`: `'study'`, `'community'`
- Remove from `tabContentMap`: `study` and `community` entries
- Remove from `tabLabel`: `study` and `community` entries

### Course Detail Tabs Component
**File:** `app/courses/components/CourseDetailTabs.tsx`
- Remove from `TABS` array: `{ key: "study", ... }` and `{ key: "community", ... }`

### Course Detail Header (if needed)
**File:** `app/courses/components/CourseDetailHeader.tsx`
- Review and remove any study/community related features

---

## ✅ Files to KEEP

### Authentication
```
app/login/                         # Login page
app/signup/                        # Signup page
app/token-handler/                 # Token handler for OAuth
app/verify-email/                  # Email verification
components/auth/                   # Auth components
backend/app/routes/oauth.py        # OAuth routes
backend/app/routes/auth.py         # Auth routes
```

### Courses (Core Features)
```
app/courses/page.tsx               # My courses page
app/courses/discover/              # Discover courses page
app/courses/[courseId]/page.tsx   # Course detail page (modified)
app/courses/layout.tsx             # Courses layout
```

### Course Components (Keep)
```
app/courses/components/CourseCard.tsx
app/courses/components/CourseDetailHeader.tsx
app/courses/components/CourseDetailTabs.tsx (modified)
app/courses/components/CourseFilters.tsx
app/courses/components/CourseHeader.tsx
app/courses/components/CourseListItem.tsx
app/courses/components/CreateCourseModal.tsx
app/courses/components/EmptyState.tsx
app/courses/components/EnrolledUsersList.tsx
app/courses/components/ImageCropModal.tsx
app/courses/components/LeaveCourseButton.tsx
app/courses/components/MaterialsList.tsx
app/courses/components/PinnedResources.tsx
app/courses/components/RecommendedResources.tsx
app/courses/components/ShareInviteFeature.tsx
app/courses/components/UploadMaterials.tsx
```

### AI Chat Components (Keep)
```
app/courses/components/ai-chat/NewAIChatInterface.tsx
app/courses/components/ai-chat/RAGChatCourse.tsx
app/courses/components/ai-chat/MaterialGenerationCourse.tsx
app/courses/components/ai-chat/MaterialsManagerCourse.tsx
app/courses/components/ai-chat/QuizGenerator.tsx
app/courses/components/ai-chat/FlashcardGenerator.tsx
app/courses/components/ai-chat/SummaryGenerator.tsx
app/courses/components/ai-chat/ConversationChatInterface.tsx
app/courses/components/ai-chat/ConversationSidebar.tsx
app/courses/components/ai-chat/conversationService.ts
app/courses/components/ai-chat/MaterialSelector.tsx
app/courses/components/ai-chat/types.ts
app/courses/components/ai-chat/index.ts
app/courses/components/ai-chat/README.md
```

### Discover Courses Components (Keep)
```
app/courses/discover/page.tsx
app/courses/discover/components/
app/courses/discover/data/
app/courses/discover/types.ts
app/courses/discover/[courseId]/preview/
```

### API Services (Keep)
```
lib/api/apiService.ts              # Base API service
lib/api/authService.ts             # Auth API
lib/api/courseService.ts           # Course API
lib/api/friendService.ts           # Friends API (for course sharing/collaboration)
lib/api/messageService.ts          # Messages API (for friend messaging/collaboration)
lib/api/notificationService.ts     # Notifications API (for course invites)
```

### Core Files (Keep)
```
app/page.tsx                       # Landing page
app/layout.tsx                     # Root layout
app/globals.css                    # Global styles
app/(auth)/layout.tsx              # Auth layout
lib/                               # Library utilities
components/ui/                     # UI components
hooks/                             # React hooks
contexts/                          # Context providers (review)
utils/                             # Utility functions
```

### Backend Core (Keep)
```
backend/app/routes/courses.py           # Course routes
backend/app/routes/conversations.py      # Conversation routes (for course AI chat)
backend/app/routes/materials.py          # Materials routes
backend/app/routes/oauth.py              # OAuth routes
backend/app/routes/auth.py               # Auth routes
backend/app/routes/users.py              # User routes
backend/app/routes/health.py             # Health check
backend/app/routes/uploads.py            # File uploads
backend/app/routes/embeddings.py         # Embeddings (if used)
```

### Backend Models (Keep)
```
backend/app/models/user.py
backend/app/models/course.py
backend/app/models/conversation.py
backend/app/models/conversation_message.py
backend/app/models/user_course_material.py
backend/app/models/course_uploaded_file.py
backend/app/models/document_embedding.py
backend/app/models/material_chunk.py
backend/app/models/processed_materials.py
backend/app/models/course_enrollment.py
```

### Backend Services (Keep)
```
backend/app/services/course_rag_service.py  # Course RAG service
```

---

## 📝 Summary

**Total directories to remove:** ~15-20
**Total files to remove:** ~100-150
**Files to modify:** 2-3

The main areas being removed:
1. Dashboard functionality
2. Calendar integration
3. Call/video features
4. Career prep
5. Standalone chat (keeping course-specific chat)
6. Onboarding flow
7. Study plan features
8. Community features
9. Goals and tasks
10. Friends and messaging
11. Notifications (unless needed for basic functionality)

