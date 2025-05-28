"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Play,
  Pause,
  Sparkles,
  CreditCard,
  Trash2,
  CheckCircle,
  RotateCw,
  ChevronDown,
  FileText,
  ExternalLink,
} from "lucide-react"
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

type Flashcard = {
  id: string
  front: string
  back: string
  difficulty: "easy" | "medium" | "hard"
  lastReviewed?: Date
  correctCount: number
  incorrectCount: number
}

type FlashcardSet = {
  id: string
  title: string
  description: string
  cards: Flashcard[]
  createdAt: Date
  totalReviews: number
}

type StudySession = {
  id: string
  setId: string
  startTime: Date
  endTime?: Date
  cardsReviewed: number
  correctAnswers: number
}

type StudyFlashcardsProps = {
  course: Course
  uploadedFiles: UploadedFile[]
}

export function StudyFlashcards({ course, uploadedFiles }: StudyFlashcardsProps) {
  const [flashcardSetsByCourse, setFlashcardSetsByCourse] = useState<Record<string, FlashcardSet[]>>({})
  const [sessionsByCourse, setSessionsByCourse] = useState<Record<string, StudySession[]>>({})
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isStudyMode, setIsStudyMode] = useState(false)
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([])
  const { toast } = useToast()

  const [showResourceDialog, setShowResourceDialog] = useState(false)
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [availableResources, setAvailableResources] = useState<any[]>([])
  const [showResourceDropdown, setShowResourceDropdown] = useState(false)

  // Load course-specific flashcard sets from localStorage
  useEffect(() => {
    try {
      const savedSets = localStorage.getItem(`course-flashcards-${course.id}`)
      if (savedSets) {
        const courseSets = JSON.parse(savedSets).map((set: any) => ({
          ...set,
          createdAt: new Date(set.createdAt),
          cards: set.cards.map((card: any) => ({
            ...card,
            lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined,
          })),
        }))
        setFlashcardSetsByCourse((prev) => ({
          ...prev,
          [course.id]: courseSets,
        }))
      }

      const savedSessions = localStorage.getItem(`course-flashcard-sessions-${course.id}`)
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
      console.error("Error loading flashcard data from localStorage:", error)
    }
  }, [course.id])

  // Save flashcard sets to localStorage
  useEffect(() => {
    const courseSets = flashcardSetsByCourse[course.id] || []
    if (courseSets.length > 0) {
      localStorage.setItem(`course-flashcards-${course.id}`, JSON.stringify(courseSets))
    }
  }, [flashcardSetsByCourse, course.id])

  // Save sessions to localStorage
  useEffect(() => {
    const courseSessions = sessionsByCourse[course.id] || []
    if (courseSessions.length > 0) {
      localStorage.setItem(`course-flashcard-sessions-${course.id}`, JSON.stringify(courseSessions))
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

  const flashcardSets = flashcardSetsByCourse[course.id] || []
  const sessions = sessionsByCourse[course.id] || []

  // Generate AI flashcards from selected resources
  const generateAIFlashcards = async () => {
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

      const aiFlashcardSet: FlashcardSet = {
        id: `flashcard-set-${Date.now()}`,
        title: `${course.code} - AI Generated Flashcards`,
        description: `Auto-generated flashcards based on: ${selectedResourceTitles}`,
        createdAt: new Date(),
        totalReviews: 0,
        cards: [
          {
            id: "card-1",
            front: "What is the primary focus of your selected materials?",
            back: "Data structures and algorithms, including implementation and analysis of fundamental data structures",
            difficulty: "medium",
            correctCount: 0,
            incorrectCount: 0,
          },
          {
            id: "card-2",
            front: "Define Big O notation",
            back: "A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity, used to classify algorithms according to how their running time or space requirements grow as the input size grows",
            difficulty: "hard",
            correctCount: 0,
            incorrectCount: 0,
          },
          {
            id: "card-3",
            front: "What is a linked list?",
            back: "A linear data structure where elements are stored in nodes, and each node contains data and a reference (or link) to the next node in the sequence",
            difficulty: "easy",
            correctCount: 0,
            incorrectCount: 0,
          },
          {
            id: "card-4",
            front: "Difference between stack and queue",
            back: "Stack follows LIFO (Last In, First Out) principle where elements are added and removed from the same end. Queue follows FIFO (First In, First Out) principle where elements are added at one end and removed from the other",
            difficulty: "medium",
            correctCount: 0,
            incorrectCount: 0,
          },
          {
            id: "card-5",
            front: "What is recursion?",
            back: "A programming technique where a function calls itself to solve a smaller instance of the same problem, typically with a base case to prevent infinite recursion",
            difficulty: "medium",
            correctCount: 0,
            incorrectCount: 0,
          },
        ],
      }

      setFlashcardSetsByCourse((prev) => ({
        ...prev,
        [course.id]: [...(prev[course.id] || []), aiFlashcardSet],
      }))

      setIsGenerating(false)
      setSelectedResources([])
      toast({
        title: "Flashcards generated!",
        description: "AI has created a new flashcard set based on your selected resources.",
      })
    }, 3000)
  }

  // Start studying a flashcard set
  const startStudying = (set: FlashcardSet) => {
    setActiveSet(set)
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setIsStudyMode(true)
    setShuffledCards([...set.cards])

    const session: StudySession = {
      id: `session-${Date.now()}`,
      setId: set.id,
      startTime: new Date(),
      cardsReviewed: 0,
      correctAnswers: 0,
    }
    setCurrentSession(session)
  }

  // End study session
  const endStudySession = () => {
    if (currentSession) {
      const endedSession = {
        ...currentSession,
        endTime: new Date(),
      }

      setSessionsByCourse((prev) => ({
        ...prev,
        [course.id]: [...(prev[course.id] || []), endedSession],
      }))

      // Update set total reviews
      if (activeSet) {
        setFlashcardSetsByCourse((prev) => ({
          ...prev,
          [course.id]: (prev[course.id] || []).map((set) =>
            set.id === activeSet.id ? { ...set, totalReviews: set.totalReviews + 1 } : set,
          ),
        }))
      }
    }

    setIsStudyMode(false)
    setActiveSet(null)
    setCurrentSession(null)
  }

  // Shuffle cards
  const shuffleCards = () => {
    if (activeSet) {
      const shuffled = [...activeSet.cards].sort(() => Math.random() - 0.5)
      setShuffledCards(shuffled)
      setCurrentCardIndex(0)
      setIsFlipped(false)
    }
  }

  // Delete flashcard set
  const deleteFlashcardSet = (setId: string) => {
    setFlashcardSetsByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((set) => set.id !== setId),
    }))

    // Also remove related sessions
    setSessionsByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((session) => session.setId !== setId),
    }))

    toast({
      title: "Flashcard set deleted",
      description: "The flashcard set and all related sessions have been removed.",
    })
  }

  // Get set statistics
  const getSetStats = (setId: string) => {
    const setSessions = sessions.filter((session) => session.setId === setId)
    if (setSessions.length === 0) return null

    const totalReviews = setSessions.length

    return {
      totalReviews,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">AI-Generated Flashcards</h3>
          <p className="text-muted-foreground">Study with AI-powered flashcards created from your course materials</p>
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
            onClick={generateAIFlashcards}
            disabled={isGenerating || selectedResources.length === 0}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Flashcards"}
          </Button>
        </div>
      </div>

      {/* Study Mode Interface */}
      {isStudyMode && activeSet && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">{activeSet.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Card {currentCardIndex + 1} of {shuffledCards.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={shuffleCards}>
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={endStudySession}>
                  <Pause className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Progress value={((currentCardIndex + 1) / shuffledCards.length) * 100} className="mb-6" />

            {shuffledCards[currentCardIndex] && (
              <div className="space-y-6">
                <div className="relative h-64 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                  <div
                    className={`absolute inset-0 w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* Front of card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden">
                      <Card className="h-full border-2 border-primary/20">
                        <CardContent className="h-full flex items-center justify-center p-6">
                          <div className="text-center">
                            <p className="text-lg font-medium mb-4">{shuffledCards[currentCardIndex].front}</p>
                            <p className="text-sm text-muted-foreground">Click to reveal answer</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Back of card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                      <Card className="h-full border-2 border-green-200 bg-green-50">
                        <CardContent className="h-full flex items-center justify-center p-6">
                          <div className="text-center">
                            <p className="text-lg mb-4">{shuffledCards[currentCardIndex].back}</p>
                            <Badge variant="outline" className="mb-2">
                              {shuffledCards[currentCardIndex].difficulty}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {isFlipped && (
                  <div className="flex justify-center gap-4">
                    <Button
                      className="gap-2"
                      onClick={() => {
                        // Move to next card
                        if (currentCardIndex < shuffledCards.length - 1) {
                          setCurrentCardIndex(currentCardIndex + 1)
                          setIsFlipped(false)
                        } else {
                          endStudySession()
                          toast({
                            title: "Study session complete!",
                            description: `You reviewed ${shuffledCards.length} cards.`,
                          })
                        }
                      }}
                    >
                      {currentCardIndex < shuffledCards.length - 1 ? (
                        <>
                          <ChevronRight className="h-4 w-4" />
                          Next Card
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Complete Session
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentCardIndex(Math.max(0, currentCardIndex - 1))
                      setIsFlipped(false)
                    }}
                    disabled={currentCardIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <Button variant="outline" onClick={() => setIsFlipped(!isFlipped)}>
                    <RotateCw className="h-4 w-4 mr-2" />
                    Flip Card
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentCardIndex(Math.min(shuffledCards.length - 1, currentCardIndex + 1))
                      setIsFlipped(false)
                    }}
                    disabled={currentCardIndex === shuffledCards.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flashcard Sets List */}
      {!isStudyMode && (
        <div className="space-y-4">
          {flashcardSets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No flashcard sets yet</h3>
                <p className="text-muted-foreground mb-6">
                  {uploadedFiles.length > 0
                    ? "Generate AI flashcards from your course materials."
                    : "Upload some course materials first, then generate AI flashcards."}
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={generateAIFlashcards} disabled={isGenerating || uploadedFiles.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Flashcards"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {flashcardSets.map((set) => {
                const stats = getSetStats(set.id)
                return (
                  <Card key={set.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{set.title}</h3>
                            <Badge variant="outline">{set.cards.length} cards</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{set.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              {set.cards.length} cards
                            </span>
                            {stats && <span>Reviews: {stats.totalReviews}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => startStudying(set)}>
                            <Play className="h-4 w-4 mr-2" />
                            Study
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteFlashcardSet(set.id)}>
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
