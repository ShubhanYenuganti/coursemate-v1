import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a simplified middleware for demonstration purposes
// In a real application, you would use a proper authentication system

export function middleware(request: NextRequest) {
  // This is where you would check if the user is authenticated
  // For this demo, we'll simulate an authenticated user by checking if they're coming from login/signup

  const url = request.nextUrl.clone()

  // Check if user is coming from auth pages (simulating successful login)
  const referer = request.headers.get("referer")
  const isComingFromAuth =
    referer && (referer.includes("/login") || referer.includes("/signup") || referer.includes("/onboarding"))

  // For demo purposes, consider user authenticated if they're accessing any protected route directly
  // or coming from auth flow, or navigating between protected routes
  const isAccessingProtectedRoute = url.pathname.startsWith("/courses")
  const isComingFromProtectedRoute = referer && referer.includes("/courses")
  const isAuthenticated = isComingFromAuth || isAccessingProtectedRoute || isComingFromProtectedRoute

  // If the user is not authenticated and trying to access protected routes
  if (!isAuthenticated && url.pathname.startsWith("/courses")) {
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access auth pages, redirect to courses
  if (
    isAuthenticated &&
    (url.pathname === "/login" || url.pathname === "/signup") &&
    !referer?.includes("/courses")
  ) {
    url.pathname = "/courses"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/signup", "/courses/:path*"],
}
