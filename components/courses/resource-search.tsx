"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle,
  Star,
  BookOpen,
  Video,
  FileText,
  Code,
  Globe,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Course } from "@/contexts/course-context"

// API configuration
const API_BASE_URL = "https://resource-scraper-p9ejl71i3-dhruvnemani-8948s-projects.vercel.app"

type ResourceType = {
  id: string
  name: string
  color: string
}

type SearchResource = {
  title: string
  url: string
  description: string
  resource_type: string
  credibility_score: number
  relevance_score: number
}

type ResourceSearchProps = {
  course: Course
  onAddResource: (resource: SearchResource) => void
}

export function ResourceSearch({ course, onAddResource }: ResourceSearchProps) {
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [resources, setResources] = useState<SearchResource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [addedResourceIds, setAddedResourceIds] = useState<Set<string>>(new Set())

  const getTypeColor = (type: string) => {
    const colors = {
      video: "bg-red-100 text-red-800",
      course: "bg-blue-100 text-blue-800",
      documentation: "bg-green-100 text-green-800",
      practice: "bg-purple-100 text-purple-800",
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
        return <Video className="h-8 w-8" />
      case "course":
        return <BookOpen className="h-8 w-8" />
      case "documentation":
        return <FileText className="h-8 w-8" />
      case "practice":
        return <Code className="h-8 w-8" />
      default:
        return <Globe className="h-8 w-8" />
    }
  }

  const fetchResourceTypes = async () => {
    try {
      console.log("Fetching resource types from API...")
      const response = await fetch(`${API_BASE_URL}/resource-types`)

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Raw API response:", data)

      // Handle different possible response formats
      let resourceTypesArray: string[] = []

      if (data.resource_types && Array.isArray(data.resource_types)) {
        resourceTypesArray = data.resource_types
      } else if (Array.isArray(data)) {
        resourceTypesArray = data
      } else {
        console.error("Unexpected API response format:", data)
        throw new Error("Invalid response format from API")
      }

      // Ensure each item is a string and filter out any invalid entries
      const validTypes = resourceTypesArray.filter((type) => typeof type === "string" && type.length > 0)

      if (validTypes.length === 0) {
        console.warn("No valid resource types found, using defaults")
        // Fallback to default resource types
        setResourceTypes([
          { id: "video", name: "Video", color: getTypeColor("video") },
          { id: "course", name: "Course", color: getTypeColor("course") },
          { id: "documentation", name: "Documentation", color: getTypeColor("documentation") },
          { id: "practice", name: "Practice", color: getTypeColor("practice") },
        ])
      } else {
        setResourceTypes(
          validTypes.map((type: string) => ({
            id: type,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            color: getTypeColor(type),
          })),
        )
      }

      console.log("Successfully loaded resource types")
    } catch (err) {
      console.error("Failed to fetch resource types:", err)

      // Set default resource types as fallback
      setResourceTypes([
        { id: "video", name: "Video", color: getTypeColor("video") },
        { id: "course", name: "Course", color: getTypeColor("course") },
        { id: "documentation", name: "Documentation", color: getTypeColor("documentation") },
        { id: "practice", name: "Practice", color: getTypeColor("practice") },
      ])

      setError("Unable to connect to the resource API. Using default resource types.")
    }
  }

  const fetchResources = async (isRefresh = false) => {
    setLoading(true)
    setError(null)

    // Clear existing resources when refreshing to show new ones
    if (isRefresh) {
      setResources([])
      setAddedResourceIds(new Set()) // Reset added resources tracking
    }

    try {
      // Use only course name as search topic (not course code)
      const searchTopic = course.name

      console.log(isRefresh ? "Refreshing resources for:" : "Fetching resources for:", searchTopic)

      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: searchTopic,
          ...(selectedTypes.length > 0 && { resource_types: selectedTypes }),
          // Add refresh parameter to potentially get different results
          refresh: isRefresh,
          // Request more resources to increase variety
          limit: isRefresh ? 10 : 5,
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Search API response:", data)

      // Handle different possible response formats
      let resourcesArray: SearchResource[] = []

      if (data.resources && Array.isArray(data.resources)) {
        resourcesArray = data.resources
      } else if (Array.isArray(data)) {
        resourcesArray = data
      } else {
        console.warn("No resources found in API response")
        resourcesArray = []
      }

      // Take up to 5 resources for display
      setResources(resourcesArray.slice(0, 5))

      if (resourcesArray.length === 0) {
        toast({
          title: "No resources found",
          description: `No resources found for ${course.name}. Try adjusting your filters.`,
        })
      } else if (isRefresh) {
        toast({
          title: "Resources refreshed",
          description: `Found ${resourcesArray.length} new resources for ${course.name}`,
        })
      }
    } catch (err) {
      console.error("API call failed:", err)
      setError("Failed to fetch resources from API. Please check your connection.")
      setResources([])

      toast({
        title: "Connection Error",
        description: "Unable to fetch resources. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch resource types on component mount
  useEffect(() => {
    fetchResourceTypes()
  }, [])

  // Auto-fetch resources when component mounts or when resource types change
  useEffect(() => {
    if (resourceTypes.length > 0) {
      fetchResources(false)
    }
  }, [resourceTypes, selectedTypes])

  // Calculate combined score for rating
  const calculateRating = (credibility: number, relevance: number) => {
    const cred = typeof credibility === "number" ? credibility : 0
    const rel = typeof relevance === "number" ? relevance : 0
    return ((cred + rel) / 2) * 5
  }

  // Handle resource type selection
  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]))
  }

  // Get resource type color
  const getResourceTypeColor = (type: string) => {
    const resourceType = resourceTypes.find((rt) => rt.id === type)
    return resourceType?.color || "bg-gray-100 text-gray-800"
  }

  // Render star rating
  const renderStarRating = (rating: number) => {
    const stars = []
    const safeRating = typeof rating === "number" && !isNaN(rating) ? rating : 0
    const fullStars = Math.floor(safeRating)
    const hasHalfStar = safeRating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />)
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-gray-300" />)
      }
    }

    return <div className="flex gap-0.5">{stars}</div>
  }

  const handleAddResource = (resource: SearchResource, index: number) => {
    // Add to the parent component's resource list
    onAddResource(resource)

    // Track this resource as added using its index as a unique identifier
    setAddedResourceIds((prev) => new Set([...prev, `${resource.url}-${index}`]))

    toast({
      title: "Resource added",
      description: `${resource.title} has been added to your course resources`,
    })
  }

  // Filter out resources that have been added
  const availableResources = resources.filter((resource, index) => !addedResourceIds.has(`${resource.url}-${index}`))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Recommended Resources</h3>
          <p className="text-muted-foreground">Curated educational resources for {course.code}</p>
        </div>
        <Button onClick={() => fetchResources(true)} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Finding new resources..." : "Refresh"}
        </Button>
      </div>

      {/* Resource Type Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Filter by Resource Type</label>
            <div className="flex flex-wrap gap-3">
              {resourceTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => handleTypeToggle(type.id)}
                  />
                  <label
                    htmlFor={type.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Finding the best resources for {course.code}...</p>
          </CardContent>
        </Card>
      )}

      {/* Resources Grid */}
      {!loading && (
        <div className="space-y-4">
          {availableResources.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {resources.length > 0
                    ? "All available resources have been added to your course."
                    : `No resources found for ${course.name}. Try adjusting your filters or refresh to get new results.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {availableResources.map((resource, index) => (
                <Card
                  key={`${resource.url}-${index}`}
                  className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                >
                  <CardContent className="p-4">
                    {/* Icon and Type */}
                    <div className="flex flex-col items-center text-center mb-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                        {getResourceIcon(resource.resource_type || "other")}
                      </div>
                      <Badge className={getResourceTypeColor(resource.resource_type || "other")} variant="secondary">
                        {(resource.resource_type || "Resource").charAt(0).toUpperCase() +
                          (resource.resource_type || "Resource").slice(1)}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h5
                      className="font-semibold text-sm leading-tight mb-2 text-center line-clamp-2"
                      title={resource.title || "Untitled Resource"}
                    >
                      {resource.title || "Untitled Resource"}
                    </h5>

                    {/* Rating */}
                    <div className="flex flex-col items-center gap-1 mb-3">
                      {renderStarRating(calculateRating(resource.credibility_score, resource.relevance_score))}
                      <span className="text-xs text-muted-foreground">
                        {calculateRating(resource.credibility_score, resource.relevance_score).toFixed(1)}/5
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 text-center">
                      {resource.description || "No description available"}
                    </p>

                    {/* Progress Bars */}
                    <div className="space-y-2 mb-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700 font-medium">Credibility</span>
                          <span className="text-green-700">{Math.round((resource.credibility_score || 0) * 100)}%</span>
                        </div>
                        <Progress value={(resource.credibility_score || 0) * 100} className="h-1.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-700 font-medium">Relevance</span>
                          <span className="text-blue-700">{Math.round((resource.relevance_score || 0) * 100)}%</span>
                        </div>
                        <Progress value={(resource.relevance_score || 0) * 100} className="h-1.5" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resource.url, "_blank")}
                        className="w-full"
                        disabled={!resource.url}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </Button>
                      <Button size="sm" onClick={() => handleAddResource(resource, index)} className="w-full">
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
