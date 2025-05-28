"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, FileText, Sparkles, Loader2 } from "lucide-react"
import type { Course } from "@/contexts/course-context"
import type { UploadedFile } from "@/components/courses/course-upload-form"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  citations?: Citation[]
}

type Citation = {
  fileId: string
  fileName: string
  fileTitle: string
  excerpt: string
}

type CourseChatProps = {
  course: Course
  uploadedFiles: UploadedFile[]
}

export function CourseChat({ course, uploadedFiles }: CourseChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to the ${course.code} AI assistant! I can help answer questions about your course materials. What would you like to know?`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI thinking and response
    setTimeout(() => {
      const hasFiles = uploadedFiles.length > 0
      let aiResponse: Message

      if (hasFiles) {
        // Generate response with citations if files exist
        const randomFileIndex = Math.floor(Math.random() * uploadedFiles.length)
        const randomFile = uploadedFiles[randomFileIndex]

        // Generate a response based on the question
        let responseContent = ""
        const question = userMessage.content.toLowerCase()

        if (question.includes("what") && question.includes("course")) {
          responseContent = `This is ${course.code}: ${course.name}, a ${course.credits}-credit course offered in ${
            course.termType === "semester" ? course.semester : course.quarter
          }.`
        } else if (question.includes("summary") || question.includes("overview")) {
          responseContent = `Based on your uploaded materials, ${course.code} covers fundamental concepts and practical applications in the field. The course is structured around weekly lectures and assignments.`
        } else if (question.includes("assignment") || question.includes("homework")) {
          responseContent = `According to the course materials, assignments are typically due on Fridays by 11:59 PM. Each assignment is worth 10% of your final grade.`
        } else if (question.includes("exam") || question.includes("test") || question.includes("midterm")) {
          responseContent = `The course has two exams: a midterm (worth 25%) and a final exam (worth 35%). Based on your materials, the midterm will cover chapters 1-5.`
        } else {
          responseContent = `Based on the content in "${randomFile.title}", the course materials suggest that this topic is covered in week 3 of the syllabus. The key concepts include theoretical frameworks and practical applications.`
        }

        aiResponse = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          citations: [
            {
              fileId: randomFile.id,
              fileName: randomFile.fileName,
              fileTitle: randomFile.title,
              excerpt: `Excerpt from ${randomFile.title}: This document contains important information about the course structure, assignments, and grading policy.`,
            },
          ],
        }
      } else {
        // Generic response if no files
        aiResponse = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content:
            "I don't have enough information to answer that question. Try uploading some course materials like syllabi, lecture notes, or assignments so I can provide more specific help.",
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Course Assistant</h2>
        <div className="flex items-center ml-auto gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
          <Sparkles className="h-3 w-3" />
          <span>Powered by AI</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-primary/20 text-xs space-y-1">
                  <p className="font-medium">Sources:</p>
                  {message.citations.map((citation, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{citation.fileTitle}</p>
                        <p className="opacity-80 text-xs">{citation.excerpt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 text-xs opacity-70">
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                }).format(message.timestamp)}
              </div>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[80%] rounded-lg p-3 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question about your course materials..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {uploadedFiles.length > 0
            ? `AI assistant can reference ${uploadedFiles.length} uploaded document${
                uploadedFiles.length === 1 ? "" : "s"
              }`
            : "Upload course materials to get more accurate answers"}
        </p>
      </div>
    </Card>
  )
}
