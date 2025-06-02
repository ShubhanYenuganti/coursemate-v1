"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Github, Apple } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

export function SignUpForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignUp = async (provider: string) => {
    setIsLoading(true);

    if (provider === "email") {
      try {
        // Get form values
        const emailInput = document.getElementById("email") as HTMLInputElement;
        const passwordInput = document.getElementById("password") as HTMLInputElement;

        const email = emailInput?.value;
        const password = passwordInput?.value;

        console.log("Attempting to register with email:", email);

        // Check if the values exist
        if (!email || !password) {
          console.error("Email or password is missing");
          setIsLoading(false);
          return;
        }

        console.log("Sending request to:", 'http://localhost:5173/api/register');

        const response = await fetch('http://localhost:5173/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        console.log("Response received:", response);

        const data = await response.json();
        console.log("Response data:", data);

        router.push('/dashboard');
      } catch (error) {
        console.error("Detailed error information:", error);
        // Check if it's a network error
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.log(error)
          console.error("Network error - Could not reach the server. Flask backend might not be running or accessible.");
        }
        setIsLoading(false);
      }
    } else {
      // For social logins, just redirect for now
      console.log(`Signing up with ${provider} (not implemented)`)
      setIsLoading(false)
      toast({
        title: "Not implemented",
        description: `${provider} authentication is not implemented yet`,
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Social login buttons (unchanged) */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={isLoading}
          onClick={() => handleSignUp("google")}
        >
          {/* Google SVG */}
          <span>Continue with Google</span>
        </Button>

        {/* Apple and GitHub buttons (unchanged) */}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-gray-500 dark:bg-gray-900">Or continue with email</span>
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={isLoading} onClick={() => handleSignUp("email")}>
            {isLoading ? "Signing up..." : "Sign up"}
          </Button>
        </div>
      </div>
    </Card>
  )
}