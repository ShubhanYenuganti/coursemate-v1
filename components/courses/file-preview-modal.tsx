"use client"

import { useEffect, useState } from "react"
import { X, Download, FileText, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UploadedFile } from "@/components/courses/course-upload-form"
import { PDFViewer } from "./pdf-viewer"

type FilePreviewModalProps = {
  file: UploadedFile
  onClose: () => void
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  // Prevent scrolling of the background when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = file.url
    link.download = file.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      )
    }

    if (file.fileType.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={file.url || "/placeholder.svg"}
            alt={file.title}
            className="max-w-full max-h-[calc(100vh-200px)] object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )
    }

    if (file.fileType === "application/pdf") {
      return (
        <div className="flex items-center justify-center h-full">
          <PDFViewer url={file.url} title={file.title} onDownload={handleDownload} />
        </div>
      )
    }

    // For other file types, show a generic preview
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        {file.fileType.includes("word") || file.fileType.includes("document") ? (
          <FileText className="h-24 w-24 text-blue-500 mb-4" />
        ) : file.fileType.includes("presentation") || file.fileType.includes("powerpoint") ? (
          <FileText className="h-24 w-24 text-orange-500 mb-4" />
        ) : (
          <File className="h-24 w-24 text-gray-500 mb-4" />
        )}
        <h3 className="text-xl font-semibold mb-2">{file.title}</h3>
        <p className="text-gray-500 mb-6">{file.fileName}</p>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{file.title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">{renderPreview()}</div>

        <div className="p-4 border-t flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(file.uploadDate)}
            </p>
            <p className="text-xs text-gray-400">
              {(file.fileSize / 1024).toFixed(1)} KB • {file.fileType.split("/")[1]}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}
