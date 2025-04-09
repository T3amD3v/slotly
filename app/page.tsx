'use client';

import { useState, useEffect } from "react";
// @ts-ignore
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
// @ts-ignore
import SchedulingForm from "./components/SchedulingForm";
// @ts-ignore
import AvailabilityResults from "./components/AvailabilityResults";
// @ts-ignore
import EventManagementForm from "./components/EventManagementForm";
// @ts-ignore
import EventsResults from "./components/EventsResults";
import { useRouter } from "next/navigation";

/**
 * FormData interface defines the structure of data collected from the scheduling form
 * meeting_type: Determines whether we're finding availability or scheduling a specific meeting
 * participants: List of email addresses for calendar availability checking
 * duration: Length of the meeting in minutes
 * date_range: Start and end dates to check for availability
 */
interface FormData {
  meeting_type: 'find_availability' | 'schedule_meeting';
  participants: string[];
  duration: number;
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * Home Component - Main application page
 * 
 * This component handles:
 * 1. Authentication state management
 * 2. Form submission for scheduling
 * 3. Display of scheduling form or availability results
 * 4. Event listening for meeting scheduling events
 */
export default function Home() {
  // Authentication state from NextAuth
  const { data: session, status } = useSession();
  // State for storing availability results returned from API
  const [availabilityResults, setAvailabilityResults] = useState<any>(null);
  // State for storing events results returned from API
  const [eventsResults, setEventsResults] = useState<any>(null);
  // State for storing participants between form submissions
  const [savedParticipants, setSavedParticipants] = useState<string[]>([]);
  // State for toggling between Find Availability and Manage Events views
  const [activeView, setActiveView] = useState<'find_availability' | 'manage_events'>('find_availability');
  const router = useRouter();

  /**
   * Effect hook to verify authentication
   * Redirects to sign-in page if no session is found
   */
  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      // If the session check fails and we're not already loading, redirect to sign-in
      if (!data.user && status !== 'loading') {
        router.push('/auth/signin');
      }
    };
    
    checkSession();
  }, [router, status]);

  /**
   * Effect hook to listen for meeting scheduled events 
   * Used for communication from child components
   */
  useEffect(() => {
    const handleMeetingScheduled = (event: any) => {
      setAvailabilityResults(event.detail);
    };

    window.addEventListener('meetingScheduled', handleMeetingScheduled);
    
    return () => {
      window.removeEventListener('meetingScheduled', handleMeetingScheduled);
    };
  }, []);

  /**
   * Loading state UI while session is being checked
   */
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-[rgb(26,26,26)]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300">Loading session...</p>
      </div>
    );
  }

  /**
   * UI for unauthenticated users - sign in prompt
   */
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-[rgb(26,26,26)]">
        <div className="w-full max-w-md p-8 space-y-8 bg-[#1a1b1e] rounded-xl shadow-md glow-effect">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
              </svg>
              <h1 className="text-3xl font-bold text-gray-100 ml-3">Slotly</h1>
            </div>
            <p className="mt-2 text-gray-300">Sign in to manage your calendar</p>
          </div>
          
          <div className="mt-8">
            <button
              onClick={() => signIn("google", { 
                callbackUrl: "/",
                prompt: "consent"
              })}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Handles form submission for scheduling
   * 1. Gets participant data from form
   * 2. Adds auth tokens from session
   * 3. Submits to API
   * 4. Updates state with results
   * 
   * @param formData - Form data containing scheduling information
   */
  const handleSchedulingFormSubmit = async (formData: FormData) => {
    try {
      // Save the participants for later use
      setSavedParticipants(formData.participants);
      
      // Add authentication info from session
      const authData = {
        ...formData,
        auth: {
          accessToken: session?.accessToken,
          refreshToken: session?.refreshToken,
        }
      };
      
      const response = await fetch("/api/py/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authData),
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process request: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Store the original participants in the availability results
      // so they can be used when scheduling a meeting
      setAvailabilityResults({
        ...data,
        participants: formData.participants
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Handles form submission for getting events
   * 1. Gets date range data from form
   * 2. Adds auth tokens from session
   * 3. Submits to API
   * 4. Updates state with results
   * 
   * @param formData - Form data containing date range information
   */
  const handleEventsFormSubmit = async (formData: any) => {
    try {
      // Add authentication info from session
      const authData = {
        ...formData,
        auth: {
          accessToken: session?.accessToken,
          refreshToken: session?.refreshToken,
        }
      };
      
      const response = await fetch("/api/py/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authData),
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process request: ${errorText}`);
      }
      
      const data = await response.json();
      
      setEventsResults(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      setEventsResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Main UI for authenticated users
   * Shows either:
   * 1. Availability results if a search was performed
   * 2. Scheduling form if no search has been performed yet
   */
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24 bg-[rgb(26,26,26)]">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-100 ml-3">Slotly</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-gray-300">
              Signed in as {session.user?.email}
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#25262b] rounded-md hover:bg-[#2c2d32]"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="bg-[#1a1b1e] rounded-lg p-1 inline-flex">
            <button
              onClick={() => {
                setActiveView('find_availability');
                setAvailabilityResults(null);
                setEventsResults(null);
              }}
              className={`px-4 py-2 text-sm rounded-md ${
                activeView === 'find_availability'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-[#25262b]'
              }`}
            >
              Find Availability
            </button>
            <button
              onClick={() => {
                setActiveView('manage_events');
                setAvailabilityResults(null);
                setEventsResults(null);
              }}
              className={`px-4 py-2 text-sm rounded-md ${
                activeView === 'manage_events'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-[#25262b]'
              }`}
            >
              Manage Events
            </button>
          </div>
        </div>

        {/* Find Availability View */}
        {activeView === 'find_availability' && (
          <div>
            {availabilityResults ? (
              <AvailabilityResults 
                results={availabilityResults} 
                onReset={(participants) => {
                  // If participants are passed, update the saved participants
                  if (participants) {
                    setSavedParticipants(participants);
                  }
                  setAvailabilityResults(null);
                }}
              />
            ) : (
              <SchedulingForm 
                onSubmit={handleSchedulingFormSubmit} 
                initialParticipants={savedParticipants}
              />
            )}
          </div>
        )}

        {/* Manage Events View */}
        {activeView === 'manage_events' && (
          <div>
            {eventsResults ? (
              <EventsResults 
                results={eventsResults} 
                onReset={() => setEventsResults(null)}
                onRefresh={() => {
                  // Ensure we have a valid date range for refresh
                  const dateRange = eventsResults.date_range || 
                    (eventsResults.events && eventsResults.events[0]?.start?.dateTime ? 
                      // If date_range is missing but we have events, extract from first event
                      {
                        start: eventsResults.events[0].start.dateTime,
                        end: eventsResults.events[eventsResults.events.length-1].end.dateTime
                      } : 
                      // Fallback to current date range if no events
                      {
                        start: new Date().toISOString(),
                        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                      }
                    );
                    
                  handleEventsFormSubmit({
                    date_range: dateRange
                  });
                }}
              />
            ) : (
              <EventManagementForm 
                onSubmit={handleEventsFormSubmit} 
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
