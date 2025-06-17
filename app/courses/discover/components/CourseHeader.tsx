import React from "react"
import { Search } from "lucide-react"

interface CourseHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <h1 className="text-3xl font-bold">Discover Courses</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

export default CourseHeader 