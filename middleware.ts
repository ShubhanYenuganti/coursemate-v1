import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a simplified middleware for demonstration purposes
// In a real application, you would use a proper authentication system

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Check if user has a valid token (simple check for localStorage-based auth)
  // Since middleware runs on server side, we need a different approach
  // For now, let's allow auth pages and only protect specific routes
  
  // Allow access to auth pages (login, signup) without redirect loops
  if (url.pathname === "/login" || url.pathname === "/signup") {
    return NextResponse.next()
  }

  // For protected routes, redirect to login if no authentication
  // This is a simplified check - in production you'd verify JWT tokens
  if (url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/courses") || url.pathname.startsWith("/calendar")) {
    // Allow access for now since we can't easily check localStorage in middleware
    // In production, you'd check for valid JWT cookies or headers
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/courses/:path*"],
}
