"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCourses } from "@/contexts/course-context"
import { useToast } from "@/hooks/use-toast"

export function AddCourseButton() {
  const { addCourse, selectCourse } = useCourses()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [courseData, setCourseData] = useState({
    code: "",
    name: "",
    semester: "",
    quarter: "",
    credits: "",
    termType: "semester", // Default to semester
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCourseData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setCourseData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTermTypeChange = (value: string) => {
    setCourseData((prev) => ({
      ...prev,
      termType: value,
      // Clear the other term type when switching
      semester: value === "semester" ? prev.semester : "",
      quarter: value === "quarter" ? prev.quarter : "",
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate that either semester or quarter is selected
    if (
      (courseData.termType === "semester" && !courseData.semester) ||
      (courseData.termType === "quarter" && !courseData.quarter)
    ) {
      toast({
        title: "Error",
        description: "Please select either a semester or quarter",
        variant: "destructive",
      })
      return
    }

    // Create the course object
    const newCourseData = {
      code: courseData.code,
      name: courseData.name,
      credits: Number(courseData.credits),
      termType: courseData.termType,
      semester: courseData.termType === "semester" ? courseData.semester : undefined,
      quarter: courseData.termType === "quarter" ? courseData.quarter : undefined,
    }

    // Add the course to our context and get the new course ID
    const newCourseId = addCourse(newCourseData)

    // Automatically select the newly created course
    setTimeout(() => {
      selectCourse(newCourseId)
    }, 100)

    // Show success message
    toast({
      title: "Course added",
      description: `${courseData.code} has been added to your courses`,
    })

    // Close dialog and reset form
    setOpen(false)
    setCourseData({
      code: "",
      name: "",
      semester: "",
      quarter: "",
      credits: "",
      termType: "semester",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg add-course-trigger">
          <PlusCircle className="h-4 w-4" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a new course</DialogTitle>
            <DialogDescription>Enter the details of the course you want to add to your schedule.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Course Code
              </Label>
              <Input
                id="code"
                name="code"
                value={courseData.code}
                onChange={handleChange}
                placeholder="e.g. CS 101"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Course Name
              </Label>
              <Input
                id="name"
                name="name"
                value={courseData.name}
                onChange={handleChange}
                placeholder="e.g. Introduction to Computer Science"
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Term Type</Label>
              <RadioGroup
                value={courseData.termType}
                onValueChange={handleTermTypeChange}
                className="col-span-3 flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="semester" id="semester" />
                  <Label htmlFor="semester">Semester</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quarter" id="quarter" />
                  <Label htmlFor="quarter">Quarter</Label>
                </div>
              </RadioGroup>
            </div>

            {courseData.termType === "semester" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semester" className="text-right">
                  Semester
                </Label>
                <Select value={courseData.semester} onValueChange={(value) => handleSelectChange("semester", value)}>
                  <SelectTrigger id="semester" className="col-span-3">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall-2025">Fall 2025</SelectItem>
                    <SelectItem value="spring-2026">Spring 2026</SelectItem>
                    <SelectItem value="fall-2026">Fall 2026</SelectItem>
                    <SelectItem value="spring-2027">Spring 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {courseData.termType === "quarter" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quarter" className="text-right">
                  Quarter
                </Label>
                <Select value={courseData.quarter} onValueChange={(value) => handleSelectChange("quarter", value)}>
                  <SelectTrigger id="quarter" className="col-span-3">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall-2025">Fall 2025</SelectItem>
                    <SelectItem value="winter-2026">Winter 2026</SelectItem>
                    <SelectItem value="spring-2026">Spring 2026</SelectItem>
                    <SelectItem value="summer-2026">Summer 2026</SelectItem>
                    <SelectItem value="fall-2026">Fall 2026</SelectItem>
                    <SelectItem value="winter-2027">Winter 2027</SelectItem>
                    <SelectItem value="spring-2027">Spring 2027</SelectItem>
                    <SelectItem value="summer-2027">Summer 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits" className="text-right">
                Credits
              </Label>
              <Input
                id="credits"
                name="credits"
                type="number"
                min="1"
                max="6"
                value={courseData.credits}
                onChange={handleChange}
                placeholder="e.g. 3"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Course</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
