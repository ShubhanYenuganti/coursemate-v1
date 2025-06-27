'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your email...');
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('No verification token provided');
        setStatus('');
        return;
      }
      
      try {
        const response = await fetch('http://localhost:5173/api/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
          credentials: 'include',
        });

        const data = await response.json();
        
        if (response.ok) {
          // Store the token in localStorage
          if (data.token) {
            localStorage.setItem('token', data.token);
          }
          
          setStatus('Email verified successfully! Redirecting to onboarding...');
          // Redirect to onboarding after a short delay
          setTimeout(() => {
            router.push('/onboarding');
          }, 1500);
        } else {
          throw new Error(data.error || 'Verification failed');
        }
      } catch (err) {
        console.error('Verification error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to verify email. The link may have expired or already been used.';
        setError(errorMsg);
        setStatus('');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status || 'Verification Status'}
          </h2>
          {error && (
            <div className="mt-4 text-red-600">
              {error}. Please try signing up again or contact support.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
