"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  BookOpen,
  Calendar,
  Clock,
  Search,
  X,
  File,
  Download,
  Trash2,
  MessageSquare,
  Brain,
  CalendarDays,
} from "lucide-react"
import { CourseUploadForm, type UploadedFile } from "@/components/courses/course-upload-form"
import { FilePreviewModal } from "@/components/courses/file-preview-modal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CourseChat } from "@/components/courses/course-chat"
import { CourseNotes } from "@/components/courses/course-notes"
import { CourseResources } from "@/components/courses/course-resources"
import type { Course } from "@/contexts/course-context"
import { SchedulerTab } from "@/components/courses/scheduler-tab"
import { StudyTab } from "@/components/courses/study-tab"

type CourseDetailProps = {
  course: Course
}

export default function CourseDetail({ course }: CourseDetailProps) {
  // Replace the existing uploadedFiles state with course-specific storage
  const [uploadedFilesByCourse, setUploadedFilesByCourse] = useState<Record<string, UploadedFile[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const { toast } = useToast()

  // Load course-specific files from localStorage on component mount
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(`course-files-${course.id}`)
      if (savedFiles) {
        const courseFiles = JSON.parse(savedFiles)
        // Ensure dates are properly parsed and valid
        const validatedFiles = courseFiles
          .map((file: any) => ({
            ...file,
            uploadDate: file.uploadDate ? new Date(file.uploadDate) : new Date(),
          }))
          .filter((file: any) => !isNaN(file.uploadDate.getTime())) // Filter out invalid dates

        setUploadedFilesByCourse((prev) => ({
          ...prev,
          [course.id]: validatedFiles,
        }))
      }
    } catch (error) {
      console.error("Error loading course files from localStorage:", error)
    }
  }, [course.id])

  // Save course-specific files to localStorage whenever they change
  useEffect(() => {
    const courseFiles = uploadedFilesByCourse[course.id] || []
    if (courseFiles.length > 0) {
      localStorage.setItem(`course-files-${course.id}`, JSON.stringify(courseFiles))
    }
  }, [uploadedFilesByCourse, course.id])

  // Get files for the current course
  const uploadedFiles = uploadedFilesByCourse[course.id] || []

  // Format term name for display
  const formatTermName = (termKey?: string) => {
    if (!termKey) return ""
    return termKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Update handleFileUploaded function
  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFilesByCourse((prev) => ({
      ...prev,
      [course.id]: [...(prev[course.id] || []), file],
    }))
  }

  // Handle file download
  const handleDownload = (file: UploadedFile, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the preview modal
    const link = document.createElement("a")
    link.href = file.url
    link.download = file.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Download started",
      description: `${file.fileName} is being downloaded`,
    })
  }

  // Update handleRemove function
  const handleRemove = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUploadedFilesByCourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((file) => file.id !== fileId),
    }))

    toast({
      title: "File removed",
      description: "The file has been removed from your course materials",
    })
  }

  const filteredFiles = uploadedFiles.filter(
    (file) =>
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getFilePreview = (file: UploadedFile) => {
    if (file.fileType.startsWith("image/")) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-t-md overflow-hidden">
          <img
            src={file.url || "/placeholder.svg"}
            alt={file.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              target.nextElementSibling?.classList.remove("hidden")
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      )
    }

    if (file.fileType === "application/pdf") {
      return (
        <div className="w-full h-32 bg-red-50 rounded-t-md flex items-center justify-center border-2 border-red-100">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-1">📄</div>
            <div className="text-xs text-red-600 font-medium">PDF</div>
          </div>
        </div>
      )
    }

    if (file.fileType.includes("word") || file.fileType.includes("document")) {
      return (
        <div className="w-full h-32 bg-blue-50 rounded-t-md flex items-center justify-center border-2 border-blue-100">
          <div className="text-center">
            <div className="text-blue-500 text-2xl mb-1">📝</div>
            <div className="text-xs text-blue-600 font-medium">DOC</div>
          </div>
        </div>
      )
    }

    if (file.fileType.includes("presentation") || file.fileType.includes("powerpoint")) {
      return (
        <div className="w-full h-32 bg-orange-50 rounded-t-md flex items-center justify-center border-2 border-orange-100">
          <div className="text-center">
            <div className="text-orange-500 text-2xl mb-1">📊</div>
            <div className="text-xs text-orange-600 font-medium">PPT</div>
          </div>
        </div>
      )
    }

    if (file.fileType.includes("text")) {
      return (
        <div className="w-full h-32 bg-gray-50 rounded-t-md flex items-center justify-center border-2 border-gray-100">
          <div className="text-center">
            <div className="text-gray-500 text-2xl mb-1">📃</div>
            <div className="text-xs text-gray-600 font-medium">TXT</div>
          </div>
        </div>
      )
    }

    // Default preview for unknown file types
    return (
      <div className="w-full h-32 bg-gray-50 rounded-t-md flex items-center justify-center border-2 border-gray-100">
        <div className="text-center">
          <File className="h-8 w-8 text-gray-400 mx-auto mb-1" />
          <div className="text-xs text-gray-600 font-medium">FILE</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {course.code}: {course.name}
        </h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <Card className="flex items-center gap-2 p-3">
          <BookOpen className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Credits</p>
            <p className="font-medium">{course.credits}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 p-3">
          <Calendar className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Term</p>
            <p className="font-medium">
              {course.termType === "semester" ? formatTermName(course.semester) : formatTermName(course.quarter)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-2 p-3">
          <Clock className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Added</p>
            <p className="font-medium">Recently</p>
          </div>
        </Card>
      </div>

      <Tabs key={course.id} defaultValue="content">
        <TabsList className="mb-4">
          <TabsTrigger value="content">Course Content</TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="scheduler">
            <CalendarDays className="h-4 w-4 mr-2" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="study">
            <Brain className="h-4 w-4 mr-2" />
            Study
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Course Materials</h2>
            <p className="mt-2 text-gray-600">
              Upload and manage your course materials, lecture notes, and other content.
            </p>

            <div className="mt-6">
              <CourseUploadForm courseId={course.id} onFileUploaded={handleFileUploaded} />
            </div>

            <div className="mt-8 border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Uploaded Content</h3>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {filteredFiles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-md cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] bg-white relative group"
                      onClick={() => setSelectedFile(file)}
                    >
                      {getFilePreview(file)}

                      {/* Action buttons - appear on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                          onClick={(e) => handleDownload(file, e)}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm text-red-600 hover:text-red-700"
                          onClick={(e) => handleRemove(file.id, e)}
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-medium truncate" title={file.title}>
                          {file.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {file.uploadDate && !isNaN(file.uploadDate.getTime())
                              ? new Intl.DateTimeFormat("en-US", {
                                  month: "short",
                                  day: "numeric",
                                }).format(file.uploadDate)
                              : "Unknown date"}
                          </span>
                          <span className="text-xs text-gray-400">{(file.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No content uploaded yet</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Use the upload form above to add lecture notes, slides, or other materials
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <CourseChat course={course} uploadedFiles={uploadedFiles} />
        </TabsContent>

        <TabsContent value="notes">
          <CourseNotes course={course} />
        </TabsContent>

        <TabsContent value="resources">
          <CourseResources course={course} />
        </TabsContent>

        <TabsContent value="scheduler">
          <SchedulerTab course={course} />
        </TabsContent>

        <TabsContent value="study">
          <StudyTab course={course} uploadedFiles={uploadedFiles} />
        </TabsContent>
      </Tabs>

      {/* File Preview Modal */}
      {selectedFile && <FilePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />}
    </div>
  )
}
