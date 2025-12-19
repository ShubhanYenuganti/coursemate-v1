"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Github, Apple } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (provider: string) => {
    setIsLoading(true);

    if (provider === "email") {
      // Get the email and password values from the form inputs
      const email = (document.getElementById("email") as HTMLInputElement).value;
      const password = (document.getElementById("password") as HTMLInputElement).value;

      try {
        const response = await fetch(`${process.env.BACKEND_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Login error:", data.error);
          alert(data.error || "Login failed");
          setIsLoading(false);
          return;
        }

        // Store JWT access token returned by backend
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
        }

        // Redirect to courses after successful login
        router.push("/courses");
      } catch (error) {
        console.error("Login error:", error);
        alert("Login failed. Please try again.");
        setIsLoading(false);
      }
    } else if (provider === "google") {
      window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5173'}/api/auth/google`;
    } else {
      // Handle OAuth providers (Google, Apple, etc.)
      console.log(`OAuth login with ${provider} - Not implemented yet`);
      // This would typically involve redirecting to the OAuth provider
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isLoading}
          onClick={() => handleLogin("google")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" className="mr-1">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
              />
            </g>
          </svg>
          <span>Continue with Google</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isLoading}
          onClick={() => handleLogin("apple")}
        >
          <Apple className="h-4 w-4" />
          <span>Continue with Apple</span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isLoading}
          onClick={() => handleLogin("github")}
        >
          <Github className="h-4 w-4" />
          <span>Continue with GitHub</span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-500">Or continue with email</span>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Button className="w-full" disabled={isLoading} onClick={() => handleLogin("email")}>
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
