"use client"

import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  Menu,
  User,
  Bell,
  Settings,
  Calendar,
  TrendingUp,
  LogOut,
  Shield,
  GraduationCapIcon,
  HelpCircle,
} from "lucide-react"
import { useCourses } from "@/contexts/course-context"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColorSchemeSelector } from "@/components/color-scheme-selector"
import { CalendarModal } from "./calendar-modal"

export function DashboardHeader() {
  const { selectCourse } = useCourses()
  const router = useRouter()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handleLogoClick = () => {
    // Deselect any selected course to return to the dashboard home
    selectCourse(null)
  }

  const handleLogout = () => {
    // In a real application, this would:
    // 1. Clear authentication tokens/cookies
    // 2. Clear user session data
    // 3. Make API call to logout endpoint

    // For this demo, we'll clear localStorage and redirect
    localStorage.clear()

    // Redirect to login page
    router.push("/login")
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>

              <button
                onClick={handleLogoClick}
                className="flex items-center gap-2 -ml-2 hover:opacity-80 transition-opacity"
              >
                <GraduationCap className="h-6 w-6" />
                <span className="text-xl font-bold">CourseHelper</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Track Progress
              </Button>
              <Button variant="ghost" className="gap-2" onClick={() => setIsCalendarOpen(true)}>
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Scheme Selector */}
            <ColorSchemeSelector />

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notification Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <GraduationCapIcon className="mr-2 h-4 w-4" />
                    <span>Academic Information</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Privacy Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Calendar Modal */}
      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </>
  )
}
