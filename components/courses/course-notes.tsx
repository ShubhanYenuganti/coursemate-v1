"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Save, Trash2, Edit, FileText, X } from "lucide-react"
import type { Course } from "@/contexts/course-context"
import { useToast } from "@/hooks/use-toast"

type Note = {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type CourseNotesProps = {
  course: Course
}

export function CourseNotes({ course }: CourseNotesProps) {
  // Replace the existing notes state with course-specific storage
  const [notesByCourse, setNotesByCourse] = useState<Record<string, Note[]>>({})
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const { toast } = useToast()

  // Load course-specific notes from localStorage on component mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(`course-notes-${course.id}`)
      if (savedNotes) {
        const courseNotes = JSON.parse(savedNotes)
        // Ensure dates are properly parsed and valid
        const validatedNotes = courseNotes
          .map((note: any) => ({
            ...note,
            createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
          }))
          .filter((note: any) => !isNaN(note.createdAt.getTime()) && !isNaN(note.updatedAt.getTime())) // Filter out invalid dates

        setNotesByCourse((prev) => ({
          ...prev,
          [course.id]: validatedNotes,
        }))
      }
    } catch (error) {
      console.error("Error loading course notes from localStorage:", error)
    }
  }, [course.id])

  // Save course-specific notes to localStorage whenever they change
  useEffect(() => {
    const courseNotes = notesByCourse[course.id] || []
    if (courseNotes.length > 0) {
      localStorage.setItem(`course-notes-${course.id}`, JSON.stringify(courseNotes))
    }
  }, [notesByCourse, course.id])

  // Get notes for the current course
  const notes = notesByCourse[course.id] || []

  // Update handleCreateNote function
  const handleCreateNote = () => {
    const now = new Date()
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: `Note ${notes.length + 1}`,
      content: "",
      createdAt: now,
      updatedAt: now,
    }

    setNotesByCourse((prev) => ({
      ...prev,
      [course.id]: [...(prev[course.id] || []), newNote],
    }))
    setActiveNote(newNote)
    setIsEditing(true)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
  }

  const handleEditNote = (note: Note) => {
    setActiveNote(note)
    setIsEditing(true)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  // Update handleSaveNote function
  const handleSaveNote = () => {
    if (!activeNote) return

    const updatedNote = {
      ...activeNote,
      title: editTitle,
      content: editContent,
      updatedAt: new Date(),
    }

    setNotesByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).map((note) => (note.id === activeNote.id ? updatedNote : note)),
    }))
    setActiveNote(updatedNote)
    setIsEditing(false)

    toast({
      title: "Note saved",
      description: "Your note has been saved successfully",
    })
  }

  // Update handleDeleteNote function
  const handleDeleteNote = (noteId: string) => {
    setNotesByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((note) => note.id !== noteId),
    }))

    if (activeNote?.id === noteId) {
      setActiveNote(null)
      setIsEditing(false)
    }

    toast({
      title: "Note deleted",
      description: "Your note has been deleted",
    })
  }

  // Helper function to safely format dates
  const formatDate = (date: Date | string | undefined, format: "short" | "long" = "short") => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date || new Date())

      if (isNaN(dateObj.getTime())) {
        return "Unknown date"
      }

      if (format === "short") {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(dateObj)
      } else {
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        }).format(dateObj)
      }
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Unknown date"
    }
  }

  return (
    <Card className="flex h-[600px]">
      <div className="w-64 border-r p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">My Notes</h3>
          <Button size="sm" variant="ghost" onClick={handleCreateNote}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No notes yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateNote}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-2 rounded-md cursor-pointer ${
                  activeNote?.id === note.id ? "bg-primary/10" : "hover:bg-gray-100"
                }`}
                onClick={() => setActiveNote(note)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">{note.title}</h4>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditNote(note)
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNote(note.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate">{note.content.substring(0, 50)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(note.updatedAt, "short")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeNote ? (
          isEditing ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="note-title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-gray-600"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <input
                  id="note-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Note title"
                />
              </div>
              <div>
                <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <Textarea
                  id="note-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[400px]"
                  placeholder="Write your note here..."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveNote}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{activeNote.title}</h2>
                <Button variant="outline" size="sm" onClick={() => handleEditNote(activeNote)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="prose max-w-none">
                {activeNote.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-500">Last updated: {formatDate(activeNote.updatedAt, "long")}</div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No note selected</h3>
            <p className="text-gray-500 mb-6">Select a note from the sidebar or create a new one</p>
            <Button onClick={handleCreateNote}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
