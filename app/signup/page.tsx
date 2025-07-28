import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SignUpForm } from "@/components/auth/signup-form"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up for a new account",
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4 py-12">
      {/* Back Button */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">CM</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join CourseMate</h1>
          <p className="text-gray-600">Create your account and start organizing your studies</p>
        </div>

        <SignUpForm />
        
        <div className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
