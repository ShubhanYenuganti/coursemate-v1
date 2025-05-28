"use client"

import { useState, useEffect } from "react"
import { Download, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type PDFViewerProps = {
  url: string
  title: string
  onDownload: () => void
}

export function PDFViewer({ url: pdfUrl, title, onDownload }: PDFViewerProps) {
  const [viewerError, setViewerError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Create a data URL for the PDF to avoid CORS issues
  const createDataUrl = async (pdfUrl: string) => {
    try {
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Failed to create data URL:", error)
      return null
    }
  }

  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true)
      const dataUrl = await createDataUrl(pdfUrl)
      setDataUrl(dataUrl)
      setIsLoading(false)
    }

    loadPDF()

    // Cleanup
    return () => {
      if (dataUrl) {
        URL.revokeObjectURL(dataUrl)
      }
    }
  }, [pdfUrl])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (viewerError || !dataUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-orange-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">PDF Preview Unavailable</h3>
        <p className="text-gray-500 mb-6">
          Your browser settings are blocking PDF preview. You can still download the file to view it.
        </p>
        <Button onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
    )
  }

  // Try multiple approaches for PDF viewing
  return (
    <div className="w-full h-full">
      {/* Primary: Use PDF.js viewer */}
      <iframe
        src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(dataUrl)}`}
        title={title}
        className="w-full h-full border-0"
        onError={() => setViewerError(true)}
        onLoad={() => {
          // Check if the iframe loaded successfully
          setTimeout(() => {
            const iframe = document.querySelector('iframe[src*="pdf.js"]') as HTMLIFrameElement
            if (iframe) {
              try {
                // Try to access iframe content to see if it loaded
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
                if (!iframeDoc || iframeDoc.title.includes("Error")) {
                  setViewerError(true)
                }
              } catch (e) {
                // Cross-origin error is expected, but iframe likely loaded successfully
                console.log("PDF viewer loaded (cross-origin access blocked, which is normal)")
              }
            }
          }, 2000)
        }}
      />

      {/* Fallback: Direct embed */}
      {viewerError && (
        <embed src={dataUrl} type="application/pdf" className="w-full h-full" onError={() => setViewerError(true)} />
      )}
    </div>
  )
}
