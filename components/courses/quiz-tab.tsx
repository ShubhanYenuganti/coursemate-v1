"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Brain,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Target,
  Sparkles,
  BarChart3,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Course } from "@/contexts/course-context"
import type { UploadedFile } from "@/components/courses/course-upload-form"

type QuizQuestion = {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  correctAnswer: string | number
  explanation?: string
}

type Quiz = {
  id: string
  title: string
  description: string
  questions: QuizQuestion[]
  timeLimit?: number // in minutes
  createdAt: Date
  difficulty: "easy" | "medium" | "hard"
}

type QuizAttempt = {
  id: string
  quizId: string
  answers: Record<string, string | number>
  score: number
  totalQuestions: number
  completedAt: Date
  timeSpent: number // in seconds
}

type QuizTabProps = {
  course: Course
  uploadedFiles: UploadedFile[]
}

export function QuizTab({ course, uploadedFiles }: QuizTabProps) {
  const [quizzesByCourse, setQuizzesByCourse] = useState<Record<string, Quiz[]>>({})
  const [attemptsByCourse, setAttemptsByCourse] = useState<Record<string, QuizAttempt[]>>({})
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>({})
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  // Load course-specific quizzes and attempts from localStorage
  useEffect(() => {
    try {
      const savedQuizzes = localStorage.getItem(`course-quizzes-${course.id}`)
      if (savedQuizzes) {
        const courseQuizzes = JSON.parse(savedQuizzes).map((quiz: any) => ({
          ...quiz,
          createdAt: new Date(quiz.createdAt),
        }))
        setQuizzesByCourse((prev) => ({
          ...prev,
          [course.id]: courseQuizzes,
        }))
      }

      const savedAttempts = localStorage.getItem(`course-quiz-attempts-${course.id}`)
      if (savedAttempts) {
        const courseAttempts = JSON.parse(savedAttempts).map((attempt: any) => ({
          ...attempt,
          completedAt: new Date(attempt.completedAt),
        }))
        setAttemptsByCourse((prev) => ({
          ...prev,
          [course.id]: courseAttempts,
        }))
      }
    } catch (error) {
      console.error("Error loading quiz data from localStorage:", error)
    }
  }, [course.id])

  // Save quizzes to localStorage
  useEffect(() => {
    const courseQuizzes = quizzesByCourse[course.id] || []
    if (courseQuizzes.length > 0) {
      localStorage.setItem(`course-quizzes-${course.id}`, JSON.stringify(courseQuizzes))
    }
  }, [quizzesByCourse, course.id])

  // Save attempts to localStorage
  useEffect(() => {
    const courseAttempts = attemptsByCourse[course.id] || []
    if (courseAttempts.length > 0) {
      localStorage.setItem(`course-quiz-attempts-${course.id}`, JSON.stringify(courseAttempts))
    }
  }, [attemptsByCourse, course.id])

  // Timer effect for active quizzes
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isQuizActive && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isQuizActive, timeRemaining])

  const quizzes = quizzesByCourse[course.id] || []
  const attempts = attemptsByCourse[course.id] || []

  // Generate AI quiz from course materials
  const generateAIQuiz = async () => {
    setIsGenerating(true)

    // Simulate AI generation
    setTimeout(() => {
      const aiQuiz: Quiz = {
        id: `quiz-${Date.now()}`,
        title: `${course.code} - AI Generated Quiz`,
        description: `Auto-generated quiz based on your course materials for ${course.name}`,
        difficulty: "medium",
        timeLimit: 15,
        createdAt: new Date(),
        questions: [
          {
            id: "q1",
            question: "What is the main topic covered in this course?",
            type: "multiple-choice",
            options: ["Data Structures and Algorithms", "Web Development", "Machine Learning", "Database Design"],
            correctAnswer: 0,
            explanation: "Based on your course materials, this appears to be the primary focus.",
          },
          {
            id: "q2",
            question: "True or False: This course includes practical programming exercises.",
            type: "true-false",
            options: ["True", "False"],
            correctAnswer: 0,
            explanation: "Your uploaded materials suggest hands-on programming components.",
          },
          {
            id: "q3",
            question: "What is the most important concept to understand in this course?",
            type: "short-answer",
            correctAnswer: "problem solving",
            explanation: "Problem-solving skills are fundamental to this subject area.",
          },
        ],
      }

      setQuizzesByCourse((prev) => ({
        ...prev,
        [course.id]: [...(prev[course.id] || []), aiQuiz],
      }))

      setIsGenerating(false)
      toast({
        title: "Quiz generated!",
        description: "AI has created a new quiz based on your course materials.",
      })
    }, 3000)
  }

  // Start a quiz
  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz)
    setCurrentQuestionIndex(0)
    setUserAnswers({})
    setIsQuizActive(true)
    setShowResults(false)
    setTimeRemaining(quiz.timeLimit ? quiz.timeLimit * 60 : null)
  }

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string | number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  // Submit quiz
  const handleSubmitQuiz = () => {
    if (!activeQuiz) return

    let score = 0
    activeQuiz.questions.forEach((question) => {
      const userAnswer = userAnswers[question.id]
      if (userAnswer === question.correctAnswer) {
        score++
      }
    })

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizId: activeQuiz.id,
      answers: userAnswers,
      score,
      totalQuestions: activeQuiz.questions.length,
      completedAt: new Date(),
      timeSpent: activeQuiz.timeLimit ? activeQuiz.timeLimit * 60 - (timeRemaining || 0) : 0,
    }

    setAttemptsByCourse((prev) => ({
      ...prev,
      [course.id]: [...(prev[course.id] || []), attempt],
    }))

    setLastAttempt(attempt)
    setIsQuizActive(false)
    setShowResults(true)

    toast({
      title: "Quiz completed!",
      description: `You scored ${score}/${activeQuiz.questions.length} (${Math.round(
        (score / activeQuiz.questions.length) * 100,
      )}%)`,
    })
  }

  // Delete quiz
  const deleteQuiz = (quizId: string) => {
    setQuizzesByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((quiz) => quiz.id !== quizId),
    }))

    // Also remove related attempts
    setAttemptsByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((attempt) => attempt.quizId !== quizId),
    }))

    toast({
      title: "Quiz deleted",
      description: "The quiz and all related attempts have been removed.",
    })
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get quiz statistics
  const getQuizStats = (quizId: string) => {
    const quizAttempts = attempts.filter((attempt) => attempt.quizId === quizId)
    if (quizAttempts.length === 0) return null

    const scores = quizAttempts.map((attempt) => (attempt.score / attempt.totalQuestions) * 100)
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const bestScore = Math.max(...scores)

    return {
      attempts: quizAttempts.length,
      avgScore: Math.round(avgScore),
      bestScore: Math.round(bestScore),
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Course Quizzes</h2>
          <p className="text-muted-foreground">Test your knowledge and track your progress</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateAIQuiz}
            disabled={isGenerating}
            className="gap-2"
            variant={uploadedFiles.length > 0 ? "default" : "outline"}
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "AI Generate Quiz"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
                <DialogDescription>Create a custom quiz for {course.code}</DialogDescription>
              </DialogHeader>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Manual quiz creation coming soon!</p>
                <p className="text-sm text-muted-foreground mt-2">For now, try the AI-generated quiz feature above.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Quiz Interface */}
      {isQuizActive && activeQuiz && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">{activeQuiz.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                </p>
              </div>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>

            <Progress value={((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100} className="mb-6" />

            {activeQuiz.questions[currentQuestionIndex] && (
              <div className="space-y-4">
                <h4 className="text-lg">{activeQuiz.questions[currentQuestionIndex].question}</h4>

                {activeQuiz.questions[currentQuestionIndex].type === "multiple-choice" && (
                  <div className="space-y-2">
                    {activeQuiz.questions[currentQuestionIndex].options?.map((option, index) => (
                      <Button
                        key={index}
                        variant={
                          userAnswers[activeQuiz.questions[currentQuestionIndex].id] === index ? "default" : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() => handleAnswerSelect(activeQuiz.questions[currentQuestionIndex].id, index)}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </Button>
                    ))}
                  </div>
                )}

                {activeQuiz.questions[currentQuestionIndex].type === "true-false" && (
                  <div className="flex gap-4">
                    <Button
                      variant={userAnswers[activeQuiz.questions[currentQuestionIndex].id] === 0 ? "default" : "outline"}
                      onClick={() => handleAnswerSelect(activeQuiz.questions[currentQuestionIndex].id, 0)}
                    >
                      True
                    </Button>
                    <Button
                      variant={userAnswers[activeQuiz.questions[currentQuestionIndex].id] === 1 ? "default" : "outline"}
                      onClick={() => handleAnswerSelect(activeQuiz.questions[currentQuestionIndex].id, 1)}
                    >
                      False
                    </Button>
                  </div>
                )}

                {activeQuiz.questions[currentQuestionIndex].type === "short-answer" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={(userAnswers[activeQuiz.questions[currentQuestionIndex].id] as string) || ""}
                    onChange={(e) => handleAnswerSelect(activeQuiz.questions[currentQuestionIndex].id, e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              {currentQuestionIndex === activeQuiz.questions.length - 1 ? (
                <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  disabled={!userAnswers[activeQuiz.questions[currentQuestionIndex].id]}
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Results */}
      {showResults && lastAttempt && activeQuiz && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold">Quiz Complete!</h3>
              <p className="text-lg">
                You scored {lastAttempt.score}/{lastAttempt.totalQuestions} (
                {Math.round((lastAttempt.score / lastAttempt.totalQuestions) * 100)}%)
              </p>
            </div>

            <div className="space-y-4">
              {activeQuiz.questions.map((question, index) => {
                const userAnswer = lastAttempt.answers[question.id]
                const isCorrect = userAnswer === question.correctAnswer

                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{question.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your answer:{" "}
                          {question.type === "multiple-choice" ? question.options?.[userAnswer as number] : userAnswer}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600 mt-1">
                            Correct answer:{" "}
                            {question.type === "multiple-choice"
                              ? question.options?.[question.correctAnswer as number]
                              : question.correctAnswer}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-sm text-muted-foreground mt-2 italic">{question.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center mt-6">
              <Button onClick={() => setShowResults(false)}>Back to Quizzes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz List */}
      {!isQuizActive && !showResults && (
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No quizzes yet</h3>
                <p className="text-muted-foreground mb-6">
                  {uploadedFiles.length > 0
                    ? "Generate an AI quiz from your course materials or create a custom quiz."
                    : "Upload some course materials first, then generate an AI quiz or create a custom quiz."}
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={generateAIQuiz} disabled={isGenerating || uploadedFiles.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "AI Generate Quiz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => {
                const stats = getQuizStats(quiz.id)
                return (
                  <Card key={quiz.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{quiz.title}</h3>
                            <Badge
                              variant={
                                quiz.difficulty === "easy"
                                  ? "secondary"
                                  : quiz.difficulty === "medium"
                                    ? "default"
                                    : "destructive"
                              }
                            >
                              {quiz.difficulty}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{quiz.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {quiz.questions.length} questions
                            </span>
                            {quiz.timeLimit && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {quiz.timeLimit} minutes
                              </span>
                            )}
                            {stats && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-4 w-4" />
                                Best: {stats.bestScore}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => startQuiz(quiz)}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Quiz
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteQuiz(quiz.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
