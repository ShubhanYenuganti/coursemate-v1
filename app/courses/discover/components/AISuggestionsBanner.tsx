import React from "react"
import { Sparkles } from "lucide-react"

interface AISuggestionsBannerProps {
  onDismiss: () => void
}

const AISuggestionsBanner: React.FC<AISuggestionsBannerProps> = ({
  onDismiss,
}) => {
  return (
    <div className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">AI-Powered Course Recommendations</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-sm text-white/80 hover:text-white"
        >
          Dismiss
        </button>
      </div>
      <p className="mt-2 text-sm text-white/90">
        Based on your learning history and preferences, we've found some courses
        that might interest you.
      </p>
    </div>
  )
}

export default AISuggestionsBanner 