"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type CourseUploadFormProps = {
  courseId: string
  onFileUploaded: (file: UploadedFile) => void
}

export type UploadedFile = {
  id: string
  title: string
  type: string
  fileName: string
  fileSize: number
  fileType: string
  uploadDate: Date
  url: string
}

export function CourseUploadForm({ courseId, onFileUploaded }: CourseUploadFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadData, setUploadData] = useState({
    title: "",
    type: "",
    file: null as File | null,
    fileName: "",
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadData((prev) => ({
        ...prev,
        file,
        fileName: file.name,
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUploadData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setUploadData((prev) => ({ ...prev, type: value }))
  }

  const clearFileSelection = () => {
    setUploadData((prev) => ({
      ...prev,
      file: null,
      fileName: "",
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!uploadData.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    if (!uploadData.title) {
      toast({
        title: "Error",
        description: "Please provide a title for your upload",
        variant: "destructive",
      })
      return
    }

    if (!uploadData.type) {
      toast({
        title: "Error",
        description: "Please select a content type",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    // Simulate upload process
    setTimeout(() => {
      // In a real app, this would upload the file to a storage service
      console.log("Uploading file for course:", courseId, uploadData)

      // Create a new uploaded file object
      const newFile: UploadedFile = {
        id: `file-${Date.now()}`,
        title: uploadData.title,
        type: uploadData.type,
        fileName: uploadData.fileName,
        fileSize: uploadData.file?.size || 0,
        fileType: uploadData.file?.type || "",
        uploadDate: new Date(),
        url: URL.createObjectURL(uploadData.file as Blob), // Create a temporary URL for the file
      }

      // Pass the new file to the parent component
      onFileUploaded(newFile)

      toast({
        title: "Upload successful",
        description: `${uploadData.title} has been uploaded`,
      })

      // Reset form
      setUploadData({
        title: "",
        type: "",
        file: null,
        fileName: "",
      })

      setIsUploading(false)
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={uploadData.title}
          onChange={handleChange}
          placeholder="e.g. Lecture 1 Notes"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Content Type</Label>
        <Select value={uploadData.type} onValueChange={handleSelectChange}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lecture-notes">Lecture Notes</SelectItem>
            <SelectItem value="slides">Slides</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        {!uploadData.fileName ? (
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            />
            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Select File
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border p-2">
            <span className="text-sm">{uploadData.fileName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={clearFileSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload Content"}
      </Button>
    </form>
  )
}
