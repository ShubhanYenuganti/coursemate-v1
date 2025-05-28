"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, ExternalLink, Trash2, Link2, BookOpen, Video, Globe } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Course } from "@/contexts/course-context"
import { ResourceSearch } from "./resource-search"

type Resource = {
  id: string
  title: string
  url: string
  type: "article" | "video" | "website" | "book" | "other"
  description: string
  addedAt: Date
}

type CourseResourcesProps = {
  course: Course
}

export function CourseResources({ course }: CourseResourcesProps) {
  // Replace the existing resources state with course-specific storage
  const [resourcesByourse, setResourcesByourse] = useState<Record<string, Resource[]>>({})

  // Load course-specific resources from localStorage on component mount
  useEffect(() => {
    try {
      const savedResources = localStorage.getItem(`course-resources-${course.id}`)
      if (savedResources) {
        const courseResources = JSON.parse(savedResources).map((resource: any) => ({
          ...resource,
          addedAt: new Date(resource.addedAt), // Convert string back to Date object
        }))
        setResourcesByourse((prev) => ({
          ...prev,
          [course.id]: courseResources,
        }))
      } else {
        // Set default resources for new courses
        const defaultResources: Resource[] = [
          {
            id: "resource-1",
            title: "Introduction to Data Structures",
            url: "https://example.com/data-structures",
            type: "article",
            description: "A comprehensive guide to data structures and algorithms",
            addedAt: new Date(),
          },
          {
            id: "resource-2",
            title: "Advanced Programming Techniques",
            url: "https://example.com/advanced-programming",
            type: "video",
            description: "Video tutorial series on advanced programming concepts",
            addedAt: new Date(),
          },
        ]
        setResourcesByourse((prev) => ({
          ...prev,
          [course.id]: defaultResources,
        }))
      }
    } catch (error) {
      console.error("Error loading course resources from localStorage:", error)
    }
  }, [course.id])

  // Save course-specific resources to localStorage whenever they change
  useEffect(() => {
    const courseResources = resourcesByourse[course.id] || []
    if (courseResources.length > 0) {
      localStorage.setItem(`course-resources-${course.id}`, JSON.stringify(courseResources))
    }
  }, [resourcesByourse, course.id])

  // Get resources for the current course
  const resources = resourcesByourse[course.id] || []
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newResource, setNewResource] = useState<Omit<Resource, "id" | "addedAt">>({
    title: "",
    url: "",
    type: "website",
    description: "",
  })
  const { toast } = useToast()

  // Update handleAddResource function
  const handleAddResource = () => {
    const resource: Resource = {
      ...newResource,
      id: `resource-${Date.now()}`,
      addedAt: new Date(),
    }

    setResourcesByourse((prev) => ({
      ...prev,
      [course.id]: [...(prev[course.id] || []), resource],
    }))

    setNewResource({
      title: "",
      url: "",
      type: "website",
      description: "",
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Resource added",
      description: "The external resource has been added to your course",
    })
  }

  // Update handleRemoveResource function
  const handleRemoveResource = (resourceId: string) => {
    setResourcesByourse((prev) => ({
      ...prev,
      [course.id]: (prev[course.id] || []).filter((resource) => resource.id !== resourceId),
    }))

    toast({
      title: "Resource removed",
      description: "The external resource has been removed",
    })
  }

  const getResourceIcon = (type: Resource["type"]) => {
    switch (type) {
      case "article":
        return <Link2 className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "book":
        return <BookOpen className="h-4 w-4" />
      case "website":
      case "other":
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">External Resources</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add External Resource</DialogTitle>
              <DialogDescription>Add a link to an external resource for this course.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newResource.title}
                  onChange={(e) => setNewResource((prev) => ({ ...prev, title: e.target.value }))}
                  className="col-span-3"
                  placeholder="Resource title"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">
                  URL
                </Label>
                <Input
                  id="url"
                  value={newResource.url}
                  onChange={(e) => setNewResource((prev) => ({ ...prev, url: e.target.value }))}
                  className="col-span-3"
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newResource.type}
                  onValueChange={(value: Resource["type"]) => setNewResource((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type" className="col-span-3">
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newResource.description}
                  onChange={(e) => setNewResource((prev) => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="Brief description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddResource} disabled={!newResource.title || !newResource.url}>
                Add Resource
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8">
        <ResourceSearch
          course={course}
          onAddResource={(resource) => {
            const newResource: Resource = {
              id: `resource-${Date.now()}`,
              title: resource.title,
              url: resource.url,
              type: "website",
              description: resource.description,
              addedAt: new Date(),
            }
            setResourcesByourse((prev) => ({
              ...prev,
              [course.id]: [...(prev[course.id] || []), newResource],
            }))
            toast({
              title: "Resource added",
              description: `${resource.title} has been added to your course resources`,
            })
          }}
        />
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-12">
          <ExternalLink className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No external resources</h3>
          <p className="text-gray-500 mb-6">Add links to helpful websites, videos, or articles</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {getResourceIcon(resource.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{resource.title}</h3>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {resource.url.length > 40 ? `${resource.url.substring(0, 40)}...` : resource.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 h-8 w-8"
                    onClick={() => handleRemoveResource(resource.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Added{" "}
                    {resource.addedAt && !isNaN(new Date(resource.addedAt).getTime())
                      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                          new Date(resource.addedAt),
                        )
                      : "recently"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
