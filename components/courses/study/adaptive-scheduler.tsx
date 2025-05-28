"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { format, addDays, isSameDay } from "date-fns"
import { CalendarIcon, Clock, Play, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Course } from "@/contexts/course-context"

type StudyBlock = {
  id: string
  title: string
  date: Date
  startTime: string
  duration: number
  completed: boolean
}

type AdaptiveSchedulerProps = {
  course: Course
  onStartSession: (session: { id: string; title: string; duration: number }) => void
}

export function AdaptiveScheduler({ course, onStartSession }: AdaptiveSchedulerProps) {
  const [examDate, setExamDate] = useState<Date | undefined>(addDays(new Date(), 14))
  const [workHours, setWorkHours] = useState<string[]>(["09:00", "17:00"])
  const [sleepHours, setSleepHours] = useState<string[]>(["23:00", "07:00"])
  const [preferredDuration, setPreferredDuration] = useState<number>(25)
  const [preferredBreaks, setPreferredBreaks] = useState<number>(5)
  const [includeWeekends, setIncludeWeekends] = useState<boolean>(false)
  const [studyBlocksByCourse, setStudyBlocksByCourse] = useState<Record<string, StudyBlock[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isGenerating, setIsGenerating] = useState(false)

  // Load course-specific study blocks
  useEffect(() => {
    try {
      const savedBlocks = localStorage.getItem(`course-study-blocks-${course.id}`)
      if (savedBlocks) {
        const courseBlocks = JSON.parse(savedBlocks).map((block: any) => ({
          ...block,
          date: new Date(block.date),
        }))
        setStudyBlocksByCourse((prev) => ({
          ...prev,
          [course.id]: courseBlocks,
        }))
      } else {
        // Set default blocks for new courses
        setStudyBlocksByCourse((prev) => ({
          ...prev,
          [course.id]: [
            {
              id: "block-1",
              title: "Review Chapter 3",
              date: new Date(),
              startTime: "10:00",
              duration: 25,
              completed: false,
            },
            {
              id: "block-2",
              title: "Practice Problems 1-10",
              date: new Date(),
              startTime: "14:30",
              duration: 45,
              completed: false,
            },
          ],
        }))
      }
    } catch (error) {
      console.error("Error loading study blocks:", error)
    }
  }, [course.id])

  // Save study blocks to localStorage
  useEffect(() => {
    const courseBlocks = studyBlocksByCourse[course.id] || []
    if (courseBlocks.length > 0) {
      localStorage.setItem(`course-study-blocks-${course.id}`, JSON.stringify(courseBlocks))
    }
  }, [studyBlocksByCourse, course.id])

  // Update all references to studyBlocks to use studyBlocksByCourse[course.id] || []
  const studyBlocks = studyBlocksByCourse[course.id] || []

  // Update setStudyBlocks calls to use setStudyBlocksByCourse
  const setStudyBlocks = (updater: any) => {
    setStudyBlocksByCourse((prev) => ({
      ...prev,
      [course.id]: typeof updater === "function" ? updater(prev[course.id] || []) : updater,
    }))
  }

  // Filter study blocks for the selected date
  const filteredBlocks = studyBlocks.filter((block) => isSameDay(block.date, selectedDate))

  // Generate a schedule based on user preferences
  const generateSchedule = () => {
    setIsGenerating(true)

    // Simulate API call or complex calculation
    setTimeout(() => {
      // In a real app, this would use an algorithm to generate optimal study blocks
      // based on the user's preferences, exam dates, work hours, sleep habits, etc.
      const newBlocks: StudyBlock[] = [
        {
          id: `block-${Date.now()}-1`,
          title: `${course.code} - Review Key Concepts`,
          date: selectedDate,
          startTime: "09:30",
          duration: preferredDuration,
          completed: false,
        },
        {
          id: `block-${Date.now()}-2`,
          title: `${course.code} - Practice Problems`,
          date: selectedDate,
          startTime: "13:00",
          duration: preferredDuration + 10,
          completed: false,
        },
        {
          id: `block-${Date.now()}-3`,
          title: `${course.code} - Summarize Notes`,
          date: selectedDate,
          startTime: "16:30",
          duration: preferredDuration - 5,
          completed: false,
        },
      ]

      setStudyBlocks((prev) => [...prev, ...newBlocks])
      setIsGenerating(false)
    }, 1500)
  }

  // Mark a study block as completed
  const toggleBlockCompletion = (blockId: string) => {
    setStudyBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, completed: !block.completed } : block)),
    )
  }

  // Delete a study block
  const deleteBlock = (blockId: string) => {
    setStudyBlocks((prev) => prev.filter((block) => block.id !== blockId))
  }

  // Start a study session with the Pomodoro timer
  const startSession = (block: StudyBlock) => {
    onStartSession({
      id: block.id,
      title: block.title,
      duration: block.duration,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Adaptive Study Schedule</h2>
        <p className="text-muted-foreground">
          Optimize your study time with personalized schedules based on your preferences and deadlines.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Preferences</h3>

          {/* Exam Date */}
          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal" id="exam-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={examDate} onSelect={setExamDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Work Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work-start">Work Start</Label>
              <Select value={workHours[0]} onValueChange={(value) => setWorkHours([value, workHours[1]])}>
                <SelectTrigger id="work-start">
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                      {`${String(i).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-end">Work End</Label>
              <Select value={workHours[1]} onValueChange={(value) => setWorkHours([workHours[0], value])}>
                <SelectTrigger id="work-end">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                      {`${String(i).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sleep Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sleep-start">Sleep Start</Label>
              <Select value={sleepHours[0]} onValueChange={(value) => setSleepHours([value, sleepHours[1]])}>
                <SelectTrigger id="sleep-start">
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                      {`${String(i).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep-end">Sleep End</Label>
              <Select value={sleepHours[1]} onValueChange={(value) => setSleepHours([sleepHours[0], value])}>
                <SelectTrigger id="sleep-end">
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                      {`${String(i).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferred Study Duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="study-duration">Preferred Study Duration: {preferredDuration} minutes</Label>
            </div>
            <Slider
              id="study-duration"
              min={5}
              max={60}
              step={5}
              value={[preferredDuration]}
              onValueChange={(value) => setPreferredDuration(value[0])}
            />
          </div>

          {/* Preferred Break Duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="break-duration">Preferred Break Duration: {preferredBreaks} minutes</Label>
            </div>
            <Slider
              id="break-duration"
              min={1}
              max={15}
              step={1}
              value={[preferredBreaks]}
              onValueChange={(value) => setPreferredBreaks(value[0])}
            />
          </div>

          {/* Include Weekends */}
          <div className="flex items-center space-x-2">
            <Switch id="include-weekends" checked={includeWeekends} onCheckedChange={setIncludeWeekends} />
            <Label htmlFor="include-weekends">Include weekends in schedule</Label>
          </div>

          <Button className="w-full" onClick={generateSchedule} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Optimal Schedule"}
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Schedule</h3>

          {/* Date Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
            </PopoverContent>
          </Popover>

          {/* Study Blocks for Selected Date */}
          <div className="space-y-3 mt-4">
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">No study blocks scheduled for this day</p>
                <Button variant="outline" className="mt-2" onClick={generateSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Study Blocks
                </Button>
              </div>
            ) : (
              filteredBlocks.map((block) => (
                <Card key={block.id} className={cn("overflow-hidden", block.completed && "opacity-60")}>
                  <CardContent className="p-0">
                    <div className="flex items-center p-4">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={block.completed}
                            onChange={() => toggleBlockCompletion(block.id)}
                            className="mr-2 h-4 w-4 rounded border-gray-300"
                          />
                          <h4 className={cn("font-medium", block.completed && "line-through")}>{block.title}</h4>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {block.startTime} • {block.duration} minutes
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startSession(block)}
                          disabled={block.completed}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => deleteBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
