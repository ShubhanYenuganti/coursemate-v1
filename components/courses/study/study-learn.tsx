"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { GraduationCap, Play, CheckCircle, RotateCcw, Sparkles, Target, TrendingUp, Brain, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Course } from "@/contexts/course-context"
import type { UploadedFile } from "@/components/courses/course-upload-form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, ExternalLink } from "lucide-react"

type LearnItem = {
  id: string
  term: string
  definition: string
  difficulty: "easy" | "medium" | "hard"
  mastery: number // 0-100
  lastStudied?: Date
  correctStreak: number
  totalAttempts: number
  correctAttempts: number
}

type LearnSet = {
  id: string
  title: string
  description: string
  items: LearnItem[]
  createdAt: Date
  totalSessions: number
}

type LearnSession = {
  id: string
  setId: string
  startTime: Date
  endTime?: Date
  itemsStudied: number
  masteryGained: number
  mode: "learn" | "review"
}

type StudyLearnProps = {
  course: Course
  uploadedFiles: UploadedFile[]
}

export function StudyLearn({ course, uploadedFiles }: StudyLearnProps) {
  const [learnSetsByCourse, setLearnSetsByCourse] = useState<Record<string, LearnSet[]>>({})
  const [sessionsByCourse, setSessionsByCourse] = useState<Record<string, LearnSession[]>>({})
  const [activeSet, setActiveSet] = useState<LearnSet | null>(null)
  const [currentItem, setCurrentItem] = useState<LearnItem | null>(null)
  const [isLearning, setIsLearning] = useState(false)
  const [currentSession, setCurrentSession] = useState<LearnSession | null>(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [showAnswer, setShowAnswer] = useState(false)
  const [studyQueue, setStudyQueue] = useState<LearnItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const { toast } = useToast()
  const [showResourceDropdown, setShowResourceDropdown] = useState(false)
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [availableResources, setAvailableResources] = useState<any[]>([])

  // Load course-specific learn sets from localStorage
  useEffect(() => {
    try {
      const savedSets = localStorage.getItem(`course-learn-${course.id}`)
      if (savedSets) {
        const courseSets = JSON.parse(savedSets).map((set: any) => ({
          ...set,
          createdAt: new Date(set.createdAt),
          items: set.items.map((item: any) => ({
            ...item,
            lastStudied: item.lastStudied ? new Date(item.lastStudied) : undefined,
          })),
        }))
        setLearnSetsByCourse((prev) => ({
          ...prev,
          [course.id]: courseSets,
        }))
      }

      const savedSessions = localStorage.getItem(`course-learn-sessions-${course.id}`)
      if (savedSessions) {
        const courseSessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
        }))
        setSessionsByCourse((prev) => ({
          ...prev,
          [course.id]: courseSessions,
        }))
      }
    } catch (error) {
      console.error("Error loading learn data from localStorage:", error)
    }
  }, [course.id])

  // Save learn sets to localStorage
  useEffect(() => {
    const courseSets = learnSetsByCourse[course.id] || []
    if (courseSets.length > 0) {
      localStorage.setItem(`course-learn-${course.id}`, JSON.stringify(courseSets))
    }
  }, [learnSetsByCourse, course.id])

  // Save sessions to localStorage
  useEffect(() => {
    const courseSessions = sessionsByCourse[course.id] || []
    if (courseSessions.length > 0) {
      localStorage.setItem(`course-learn-sessions-${course.id}`, JSON.stringify(courseSessions))
    }
  }, [sessionsByCourse, course.id])

  // Load available resources (uploaded files + external resources)
  useEffect(() => {
    const resources = [
      ...uploadedFiles.map((file) => ({
        id: file.id,
        title: file.title,
        type: "file",
        source: file.fileName,
      })),
    ]

    // Load external resources from localStorage
    try {
      const savedResources = localStorage.getItem(`course-resources-${course.id}`)
      if (savedResources) {
        const externalResources = JSON.parse(savedResources).map((resource: any) => ({
          id: resource.id,
          title: resource.title,
          type: "external",
          source: resource.url,
        }))
        resources.push(...externalResources)
      }
    } catch (error) {
      console.error("Error loading external resources:", error)
    }

    setAvailableResources(resources)
  }, [uploadedFiles, course.id])

  const learnSets = learnSetsByCourse[course.id] || []
  const sessions = sessionsByCourse[course.id] || []

  // Generate AI learn set from selected resources
  const generateAILearnSet = async () => {
    if (selectedResources.length === 0) {
      setShowResourceDropdown(true)
      return
    }

    setIsGenerating(true)

    // Simulate AI generation using selected resources
    setTimeout(() => {
      const selectedResourceTitles = availableResources
        .filter((r) => selectedResources.includes(r.id))
        .map((r) => r.title)
        .join(", ")

      const aiLearnSet: LearnSet = {
        id: `learn-set-${Date.now()}`,
        title: `${course.code} - AI Learn Mode`,
        description: `Adaptive learning session based on: ${selectedResourceTitles}`,
        createdAt: new Date(),
        totalSessions: 0,
        items: [
          {
            id: "item-1",
            term: "Algorithm",
            definition: "A step-by-step procedure for solving a problem or completing a task",
            difficulty: "easy",
            mastery: 0,
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
          },
          {
            id: "item-2",
            term: "Data Structure",
            definition: "A way of organizing and storing data so that it can be accessed and modified efficiently",
            difficulty: "medium",
            mastery: 0,
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
          },
          {
            id: "item-3",
            term: "Time Complexity",
            definition:
              "A measure of the amount of time an algorithm takes to complete as a function of the input size",
            difficulty: "hard",
            mastery: 0,
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
          },
          {
            id: "item-4",
            term: "Binary Search",
            definition:
              "A search algorithm that finds the position of a target value within a sorted array by repeatedly dividing the search interval in half",
            difficulty: "medium",
            mastery: 0,
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
          },
          {
            id: "item-5",
            term: "Recursion",
            definition:
              "A programming technique where a function calls itself to solve smaller instances of the same problem",
            difficulty: "hard",
            mastery: 0,
            correctStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
          },
        ],
      }

      setLearnSetsByCourse((prev) => ({
        ...prev,
        [course.id]: [...(prev[course.id] || []), aiLearnSet],
      }))

      setIsGenerating(false)
      setSelectedResources([])
      toast({
        title: "Learn set generated!",
        description: "AI has created a new adaptive learning set based on your selected resources.",
      })
    }, 3000)
  }
  // Start learning session
  const startLearning = (set: LearnSet, mode: "learn" | "review" = "learn") => {
    setActiveSet(set)
    setIsLearning(true)
    setSessionStats({ correct: 0, total: 0 })

    // Create study queue based on mode
    let queue: LearnItem[]
    if (mode === "learn") {
      // Prioritize items with low mastery
      queue = [...set.items].sort((a, b) => a.mastery - b.mastery)
    } else {
      // Review mode: focus on items that need reinforcement
      queue = set.items.filter((item) => item.mastery < 80 || item.correctStreak < 3)
    }

    setStudyQueue(queue)
    setCurrentItem(queue[0] || null)

    const session: LearnSession = {
      id: `session-${Date.now()}`,
      setId: set.id,
      startTime: new Date(),
      itemsStudied: 0,
      masteryGained: 0,
      mode,
    }
    setCurrentSession(session)
  }

  // Handle answer submission
  const handleAnswerSubmit = () => {
    if (!currentItem || !activeSet || !currentSession) return

    const isCorrect = userAnswer.toLowerCase().trim() === currentItem.definition.toLowerCase().trim()
    const isPartiallyCorrect =
      userAnswer.toLowerCase().includes(currentItem.definition.toLowerCase().substring(0, 10)) ||
      currentItem.definition.toLowerCase().includes(userAnswer.toLowerCase().substring(0, 10))

    let masteryChange = 0
    if (isCorrect) {
      masteryChange = 15
    } else if (isPartiallyCorrect) {
      masteryChange = 5
    } else {
      masteryChange = -5
    }

    // Update item statistics
    const updatedItem: LearnItem = {
      ...currentItem,
      mastery: Math.max(0, Math.min(100, currentItem.mastery + masteryChange)),
      lastStudied: new Date(),
      correctStreak: isCorrect ? currentItem.correctStreak + 1 : 0,
      totalAttempts: currentItem.totalAttempts + 1,
      correctAttempts: isCorrect ? currentItem.correctAttempts + 1 : currentItem.correctAttempts,
    }

    // Update the set with the new item data
    setLearnSetsByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).map((set) =>
        set.id === activeSet.id
          ? {
              ...set,
              items: set.items.map((item) => (item.id === currentItem.id ? updatedItem : item)),
            }
          : set,
      ),
    }))

    // Update session stats
    setSessionStats((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }))

    setShowAnswer(true)

    toast({
      title: isCorrect ? "Correct!" : isPartiallyCorrect ? "Partially correct" : "Incorrect",
      description: isCorrect
        ? `Mastery increased to ${updatedItem.mastery}%`
        : `The correct answer is: ${currentItem.definition}`,
      variant: isCorrect ? "default" : "destructive",
    })
  }

  // Move to next item
  const nextItem = () => {
    const currentIndex = studyQueue.findIndex((item) => item.id === currentItem?.id)
    const nextIndex = currentIndex + 1

    if (nextIndex < studyQueue.length) {
      setCurrentItem(studyQueue[nextIndex])
      setUserAnswer("")
      setShowAnswer(false)
    } else {
      endLearningSession()
    }
  }

  // End learning session
  const endLearningSession = () => {
    if (currentSession) {
      const endedSession = {
        ...currentSession,
        endTime: new Date(),
        itemsStudied: sessionStats.total,
        masteryGained: sessionStats.correct * 10, // Simplified calculation
      }

      setSessionsByCourse((prev) => ({
        ...prev,
        [course.id]: [...(prev[course.id] || []), endedSession],
      }))

      // Update set total sessions
      if (activeSet) {
        setLearnSetsByCourse((prev) => ({
          ...prev,
          [course.id]: (prev[course.id] || []).map((set) =>
            set.id === activeSet.id ? { ...set, totalSessions: set.totalSessions + 1 } : set,
          ),
        }))
      }

      toast({
        title: "Learning session complete!",
        description: `You studied ${sessionStats.total} items with ${Math.round(
          (sessionStats.correct / sessionStats.total) * 100,
        )}% accuracy.`,
      })
    }

    setIsLearning(false)
    setActiveSet(null)
    setCurrentSession(null)
    setCurrentItem(null)
    setUserAnswer("")
    setShowAnswer(false)
  }

  // Get set statistics
  const getSetStats = (set: LearnSet) => {
    const avgMastery = set.items.reduce((sum, item) => sum + item.mastery, 0) / set.items.length
    const masteredItems = set.items.filter((item) => item.mastery >= 80).length

    return {
      avgMastery: Math.round(avgMastery),
      masteredItems,
      totalItems: set.items.length,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">AI Learn Mode</h3>
          <p className="text-muted-foreground">Adaptive learning with spaced repetition, similar to Quizlet Learn</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu open={showResourceDropdown} onOpenChange={setShowResourceDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Select Resources ({selectedResources.length})
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
              <DropdownMenuLabel>Course Resources</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableResources.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No resources available. Upload files or add external resources first.
                </div>
              ) : (
                <>
                  {uploadedFiles.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Uploaded Files</DropdownMenuLabel>
                      {uploadedFiles.map((file) => (
                        <DropdownMenuCheckboxItem
                          key={file.id}
                          checked={selectedResources.includes(file.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedResources((prev) => [...prev, file.id])
                            } else {
                              setSelectedResources((prev) => prev.filter((id) => id !== file.id))
                            }
                          }}
                          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{file.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{file.fileName}</div>
                            </div>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableResources.filter((r) => r.type === "external").length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        External Resources
                      </DropdownMenuLabel>
                      {availableResources
                        .filter((r) => r.type === "external")
                        .map((resource) => (
                          <DropdownMenuCheckboxItem
                            key={resource.id}
                            checked={selectedResources.includes(resource.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedResources((prev) => [...prev, resource.id])
                              } else {
                                setSelectedResources((prev) => prev.filter((id) => id !== resource.id))
                              }
                            }}
                            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{resource.title}</div>
                                <div className="text-xs text-muted-foreground truncate">{resource.source}</div>
                              </div>
                            </div>
                          </DropdownMenuCheckboxItem>
                        ))}
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={generateAILearnSet}
            disabled={isGenerating || selectedResources.length === 0}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Learn Set"}
          </Button>
        </div>
      </div>

      {/* Learning Interface */}
      {isLearning && currentItem && activeSet && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">{activeSet.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Progress: {sessionStats.total} / {studyQueue.length} items
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{sessionStats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>

            <Progress value={(sessionStats.total / studyQueue.length) * 100} className="mb-6" />

            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge
                    variant={
                      currentItem.difficulty === "easy"
                        ? "secondary"
                        : currentItem.difficulty === "medium"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {currentItem.difficulty}
                  </Badge>
                  <Badge variant="outline">{currentItem.mastery}% mastery</Badge>
                </div>
                <h4 className="text-2xl font-bold mb-6">{currentItem.term}</h4>
              </div>

              {!showAnswer ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="answer" className="block text-sm font-medium mb-2">
                      What does this term mean?
                    </label>
                    <Input
                      id="answer"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && userAnswer.trim()) {
                          handleAnswerSubmit()
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={handleAnswerSubmit} disabled={!userAnswer.trim()} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Submit Answer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">Correct Answer:</h5>
                    <p>{currentItem.definition}</p>
                  </div>

                  {userAnswer && (
                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">Your Answer:</h5>
                      <p>{userAnswer}</p>
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    <Button onClick={nextItem} className="gap-2">
                      {studyQueue.findIndex((item) => item.id === currentItem.id) === studyQueue.length - 1 ? (
                        <>
                          <Target className="h-4 w-4" />
                          Finish Session
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Continue
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learn Sets List */}
      {!isLearning && (
        <div className="space-y-4">
          {learnSets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No learn sets yet</h3>
                <p className="text-muted-foreground mb-6">
                  {uploadedFiles.length > 0
                    ? "Generate an AI learn set from your course materials."
                    : "Upload some course materials first, then generate an AI learn set."}
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={generateAILearnSet} disabled={isGenerating || uploadedFiles.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Learn Set"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {learnSets.map((set) => {
                const stats = getSetStats(set)
                return (
                  <Card key={set.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{set.title}</h3>
                            <Badge variant="outline">{set.items.length} terms</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{set.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Brain className="h-4 w-4" />
                              {stats.avgMastery}% avg mastery
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {stats.masteredItems}/{stats.totalItems} mastered
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              {set.totalSessions} sessions
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => startLearning(set, "learn")}>
                            <Play className="h-4 w-4 mr-2" />
                            Learn
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => startLearning(set, "review")}
                            disabled={stats.masteredItems === 0}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Review
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
