export interface Course {
  id: number
  title: string
  creator: string
  thumbnail: string
  rating: number
  students: number
  category: string
  tags: string[]
  isNew: boolean
  isPopular: boolean
  isAIRecommended: boolean
  description: string
  aiReason?: string
}

export interface Filter {
  id: string
  label: string
  active: boolean
}

export interface SortOption {
  value: string
  label: string
}

export interface AISuggestionsProps {
  suggestions: Course[]
  savedCourses: number[]
  toggleSaveCourse: (courseId: number) => void
  handleEnroll: (course: Course) => void
  generateAISuggestions: () => Promise<void>
  isGeneratingAI: boolean
  setShowAISuggestions: (show: boolean) => void
}

export interface SearchAndFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  filters: Filter[]
  toggleFilter: (filterId: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  generateAISuggestions: () => Promise<void>
  isGeneratingAI: boolean
}

export interface CourseGridProps {
  courses: Course[]
  viewMode: "grid" | "list"
  loading: boolean
  savedCourses: number[]
  dismissedAI: number[]
  toggleSaveCourse: (courseId: number) => void
  handleEnroll: (course: Course) => void
  dismissAIRecommendation: (courseId: number) => void
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCourses: number
  coursesPerPage: number
  onPageChange: (page: number) => void
} 