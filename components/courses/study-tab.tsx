"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, CreditCard, GraduationCap } from "lucide-react"
import { StudyQuizzes } from "@/components/courses/study/study-quizzes"
import { StudyFlashcards } from "@/components/courses/study/study-flashcards"
import { StudyLearn } from "@/components/courses/study/study-learn"
import type { Course } from "@/contexts/course-context"
import type { UploadedFile } from "@/components/courses/course-upload-form"

type StudyTabProps = {
  course: Course
  uploadedFiles: UploadedFile[]
}

export function StudyTab({ course, uploadedFiles }: StudyTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">AI-Powered Study Tools</h2>
        <p className="text-muted-foreground">
          Enhance your learning with AI-generated quizzes, flashcards, and adaptive learning sessions
        </p>
      </div>

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="quizzes" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Quizzes
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <CreditCard className="h-4 w-4" />
            AI Flashcards
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            AI Learn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes">
          <StudyQuizzes course={course} uploadedFiles={uploadedFiles} />
        </TabsContent>

        <TabsContent value="flashcards">
          <StudyFlashcards course={course} uploadedFiles={uploadedFiles} />
        </TabsContent>

        <TabsContent value="learn">
          <StudyLearn course={course} uploadedFiles={uploadedFiles} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
