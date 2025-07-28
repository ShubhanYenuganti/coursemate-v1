"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff, Mail, Lock, CheckCircle, ArrowLeft } from "lucide-react"

export function SignUpForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSignUp = async (provider: string) => {
    setIsLoading(true);

    if (provider === "email") {
      try {
        console.log("Attempting to register with email:", formData.email);

        // Check if the values exist
        if (!formData.email || !formData.password) {
          console.error("Email or password is missing");
          setIsLoading(false);
          return;
        }

        // 1. Register the user
        console.log("Sending registration request to:", `${process.env.BACKEND_URL}/api/register`);
        const registerResponse = await fetch(`${process.env.BACKEND_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.email.split('@')[0] }), // Add a default name
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
      window.location.href = `${process.env.BACKEND_URL}/api/auth/google`;
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
    <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      {showVerificationNotice ? (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="text-gray-600">
              We've sent a verification link to{" "}
              <span className="font-semibold text-gray-900">{formData.email}</span>.
              Please click the link to verify your email address.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full h-12 gap-2 border-gray-200 hover:bg-gray-50"
            onClick={() => {
              setShowVerificationNotice(false);
              setFormData({ email: '', password: '' });
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign up
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full justify-center gap-3 h-12 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            disabled={isLoading}
            onClick={() => handleSignUp("google")}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
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
            <span className="font-medium">Continue with Google</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-500 font-medium">Or sign up with email</span>
            </div>
          </div>

          {/* Email and Password Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
              disabled={isLoading || !formData.email || !formData.password} 
              onClick={() => handleSignUp("email")}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}