"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)

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

        // 1. Register the user
        console.log("Sending registration request to:", 'http://localhost:5173/api/register');
        const registerResponse = await fetch('http://localhost:5173/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password, name: email.split('@')[0] }), // Add a default name
        });

        const result = await registerResponse.json();
        
        if (!registerResponse.ok) {
          throw new Error(result.error || 'Registration failed');
        }

        console.log("Registration successful, verification email sent");
        setShowVerificationNotice(true);
        
        // Show success message
        toast({
          title: "Check your email",
          description: "We've sent a verification link to your email address. Please verify your email to continue.",
        });

      } catch (error) {
        console.error("Error during signup:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred during signup",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else if (provider === "google") {
      window.location.href = "http://localhost:5173/api/auth/google";
    } else {
      // For social logins
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
      {showVerificationNotice ? (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-muted-foreground">
            We've sent a verification link to <span className="font-semibold">{email}</span>.
            Please click the link to verify your email address.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowVerificationNotice(false);
              setEmail('');
              setPassword('');
            }}
          >
            Back to sign up
          </Button>
        </div>
      ) : (
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
      )}
    </Card>
  )
}