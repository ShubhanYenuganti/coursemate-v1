'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams && searchParams.get('verified') === '1') {
      setShowSuccess(true);
      // Hide the success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4 py-12">
      {/* Back Button */}
      <Link 
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">CM</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back to CourseMate</h1>
          <p className="text-gray-600">Sign in to continue your learning journey</p>
        </div>

        {showSuccess && (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Email Verified!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your email has been successfully verified. You can now log in to your account.
            </AlertDescription>
          </Alert>
        )}

        <LoginForm />
        
        <div className="text-center text-sm text-gray-600 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
