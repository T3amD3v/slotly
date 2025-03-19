'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// Create a client component that uses useSearchParams
function ErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'An error occurred during authentication.';
  
  if (error === 'AccessDenied') {
    errorMessage = 'Access denied. Only authorized domains are allowed to use this application.';
  } else if (error === 'Configuration') {
    errorMessage = 'Authentication server configuration error. Please contact the administrator.';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-red-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-gray-600">{errorMessage}</p>
        </div>
        
        <div className="mt-8">
          <Link 
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 