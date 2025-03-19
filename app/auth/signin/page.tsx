'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TypewriterTagline } from '../../components/TypewriterTagline';

/**
 * SignIn Component
 * 
 * This component handles user authentication with Google OAuth.
 * It provides the sign-in interface and manages the authentication flow.
 * Features:
 * 1. Redirects authenticated users to home page
 * 2. Handles the OAuth sign-in process
 * 3. Provides loading states during authentication
 * 4. Shows marketing/feature information to unauthenticated users
 */
export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  /**
   * Redirect to home page if user is already authenticated
   * Prevents showing sign-in page to logged-in users
   */
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  /**
   * Handles the sign-in process using Google OAuth
   * 1. Initiates sign-in with Google
   * 2. Manages loading state
   * 3. Handles success/error states
   * 4. Redirects to home page on success
   */
  const handleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      
      // Use a direct approach that doesn't rely on the built-in callback URL
      const result = await signIn('google', { 
        redirect: false,
        callbackUrl: window.location.origin
      });
      
      if (result?.error) {
        console.error("Authentication error:", result.error);
        setIsLoggingIn(false);
      } else if (result?.url) {
        // Force navigation to the root page
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setIsLoggingIn(false);
    }
  };

  /**
   * Loading state UI while checking session or during sign-in
   * Shows a loading spinner to indicate authentication is in progress
   */
  if (status === "loading" || isLoggingIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-[rgb(26,26,26)]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300">{isLoggingIn ? 'Signing in...' : 'Checking session...'}</p>
      </div>
    );
  }

  /**
   * Main sign-in UI
   * Contains:
   * 1. App logo and branding
   * 2. Animated typewriter tagline
   * 3. Sign-in with Google button
   * 4. Feature highlights/marketing information
   */
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[rgb(26,26,26)]">
      {/* Header logo */}
      <div className="absolute top-6 left-6 flex items-center">
        <svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="text-2xl font-bold text-white ml-2">Slotly</span>
      </div>

      <div className="w-full max-w-2xl mx-auto mt-20">
        <div className="text-center mb-12">
          {/* Logo and app name */}
          <div className="flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
            </svg>
            <h1 className="text-4xl font-bold text-white ml-3">Slotly</h1>
          </div>
          
          {/* Tagline with Typewriter Effect */}
          <TypewriterTagline />
          
          {/* Sign in card */}
          <div className="bg-[#1a1b1e] shadow-md rounded-lg p-8 glow-effect max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-white mb-6">Sign in to simplify your scheduling</h3>
            
            <button
              onClick={handleSignIn}
              className="w-full py-3 px-4 flex items-center justify-center bg-[#1e2875] hover:bg-blue-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isLoggingIn}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
            
            <p className="mt-6 text-center text-sm text-gray-400">
              By signing in, you agree to share your calendar information for scheduling purposes.
            </p>
          </div>
        </div>
        
        {/* Feature boxes - marketing content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
          <div className="bg-[#1a1b1e] p-6 rounded-lg shadow-md md:min-w-[340px]">
            <div className="text-blue-500 mb-4">
              <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Save Time</h3>
            <p className="text-gray-400">No more back-and-forth emails trying to find a time that works.</p>
          </div>
          
          <div className="bg-[#1a1b1e] p-6 rounded-lg shadow-md md:min-w-[340px]">
            <div className="text-blue-500 mb-4">
              <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Team Friendly</h3>
            <p className="text-gray-400">Coordinate with your entire team without the scheduling headaches.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 