'use client';

// @ts-ignore
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * TimeSlot interface defines the structure of an availability slot
 * with start and end times as ISO string format
 */
interface TimeSlot {
  start: string;
  end: string;
}

/**
 * AvailabilityResultsProps interface defines the props for this component
 * 
 * results: Contains either:
 *   - Available time slots found by the API
 *   - Details of a scheduled meeting
 *   - Error information
 *   - Messages for the user
 * 
 * onReset: Function to reset the view to the form, optionally with saved participants
 */
interface AvailabilityResultsProps {
  results: {
    slots?: TimeSlot[];
    message?: string;
    error?: string;
    scheduled_meeting?: {
      id: string;
      start: string;
      end: string;
      summary: string;
      attendees: string[];
    };
    participants?: string[];
  };
  onReset: (participants?: string[]) => void;
}

/**
 * AvailabilityResults Component
 * 
 * Displays the results of an availability check or scheduled meeting.
 * Has three main UI states:
 * 1. List of available time slots that can be selected for scheduling
 * 2. A confirmation when a meeting is successfully scheduled
 * 3. An error display if something went wrong
 * 
 * Also handles scheduling a meeting once a time slot is selected.
 */
const AvailabilityResults: React.FC<AvailabilityResultsProps> = ({ results, onReset }) => {
  const { data: session } = useSession();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [meetingName, setMeetingName] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);

  /**
   * Handles the selection of a time slot
   * Sets the selected slot and clears any previous errors
   * 
   * @param slot - The selected time slot
   */
  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setSchedulingError(null);
  };

  /**
   * Handles toggling the Google Meet option
   * 
   * @param e - Change event from the checkbox
   */
  const handleGoogleMeetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAddGoogleMeet(checked);
  };

  /**
   * Handles the scheduling of a meeting
   * 1. Validates input (meeting name and slot selection)
   * 2. Prepares scheduling data with authentication tokens
   * 3. Submits to the API
   * 4. Updates UI based on response
   * 5. Communicates back to parent component via custom event
   */
  const handleScheduleMeeting = async () => {
    if (!selectedSlot) return;
    if (!meetingName.trim()) {
      setSchedulingError('Please enter a meeting name');
      return;
    }

    try {
      setIsScheduling(true);
      setSchedulingError(null);
      
      // Get the participants from the original request that was used to find availability
      const participants = results.participants || [];
      
      // Prepare data for scheduling
      const scheduleData = {
        meeting_type: 'schedule_meeting',
        meeting_name: meetingName.trim(),
        participants,
        time_slot: selectedSlot,
        // Include a default duration (in case it's needed by the backend)
        duration: 60, // Default to 60 mins, can be calculated from time_slot if needed
        // Include an empty date range to satisfy the API
        date_range: {
          start: selectedSlot.start,
          end: selectedSlot.end
        },
        auth: {
          accessToken: session?.accessToken,
          refreshToken: session?.refreshToken,
        },
        add_google_meet: addGoogleMeet,
      };
      
      const response = await fetch("/api/py/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to schedule meeting: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Update the results with the newly scheduled meeting
      if (data.scheduled_meeting) {
        // Don't refresh the page or reset the form
        // Instead, update the parent component to show the scheduled meeting confirmation
        // Call onReset which will set the state in the parent component
        if (typeof onReset === 'function') {
          // Create a new object that combines the current participants with the scheduled meeting data
          const updatedResults = {
            ...results,
            scheduled_meeting: data.scheduled_meeting
          };
          
          // Reset first to clear the view
          onReset();
          
          // Small delay to ensure state is updated before showing the new result
          setTimeout(() => {
            // Use a hash to force a re-render without refreshing
            window.location.hash = 'meeting-confirmed';
            
            // Then update with the new results that include the scheduled meeting
            onReset(updatedResults.participants);
            
            // Manually call the parent setAvailabilityResults by dispatching a custom event
            const event = new CustomEvent('meetingScheduled', { 
              detail: updatedResults 
            });
            window.dispatchEvent(event);
          }, 100);
        }
      } else {
        throw new Error("No meeting was scheduled in the response");
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      setSchedulingError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsScheduling(false);
    }
  };

  /**
   * Error UI State
   * Displayed when there's an error with finding availability or scheduling
   */
  if (results.error) {
    return (
      <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
        <div className="bg-[#1e2875] p-6">
          <div className="flex items-center gap-3 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold">Error</h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="mt-2 text-gray-300">{results.error}</p>
          <button
            onClick={() => onReset(results.participants)}
            className="w-full mt-6 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            Try Again
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  /**
   * Success UI State - Meeting Scheduled
   * Displayed after successfully scheduling a meeting
   * Shows confirmation with meeting details and participants
   */
  if (results.scheduled_meeting) {
    const meeting = results.scheduled_meeting;
    return (
      <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
        <div className="flex flex-col items-center p-6 text-center">
          {/* Success icon */}
          <div className="mb-4 bg-[#1e3a8a] bg-opacity-40 rounded-full p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-2">Meeting Confirmed!</h2>
          <p className="text-gray-300 mb-6">Your meeting has been successfully scheduled</p>
          
          <div className="w-full max-w-sm bg-[#25262b] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-4 text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(parseISO(meeting.start), 'MMMM d, yyyy')}
              <br />
              {format(parseISO(meeting.start), 'h:mm a')} - {format(parseISO(meeting.end), 'h:mm a')}
            </div>
            
            <div className="flex items-start gap-2 text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <p className="mb-1">Participants</p>
                {meeting.attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-800 text-white text-xs">
                      {attendee.substring(0, 1).toUpperCase()}
                    </span>
                    {attendee}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => onReset(results.participants)}
            className="w-full max-w-sm py-2 px-4 bg-white hover:bg-gray-100 rounded-md shadow-sm text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  /**
   * Available Time Slots UI State
   * Displays a list of available time slots that can be selected
   * Includes a scheduling form that appears when a slot is selected
   */
  if (results.slots && results.slots.length > 0) {
    return (
      <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
        <div className="bg-[#1e2875] p-6">
          <div className="flex items-center gap-3 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold">Available Time Slots</h2>
          </div>
          <p className="mt-1 text-sm text-gray-300">Select a time slot to schedule the meeting</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Scheduling form appears when a slot is selected */}
          {selectedSlot && (
            <div className="p-4 border border-blue-800 bg-[#1e3a8a] bg-opacity-20 rounded-md">
              <h3 className="font-medium text-gray-200 mb-3">
                Schedule Meeting for {format(parseISO(selectedSlot.start), 'MMMM d, yyyy')} at {format(parseISO(selectedSlot.start), 'h:mm a')}
              </h3>
              
              <div className="mb-4">
                <label htmlFor="meeting-name" className="block text-sm font-medium text-gray-300 mb-1">
                  Meeting Name
                </label>
                <input 
                  id="meeting-name"
                  type="text" 
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  placeholder="Enter a name for your meeting"
                  className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500"
                />
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    id="add-google-meet"
                    type="checkbox"
                    checked={addGoogleMeet}
                    onChange={handleGoogleMeetChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                  />
                  <label htmlFor="add-google-meet" className="ml-2 block text-sm text-gray-300">
                    Add Google Meet
                  </label>
                </div>
              </div>
              
              {schedulingError && (
                <p className="text-sm text-red-400 mb-4">{schedulingError}</p>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleScheduleMeeting}
                  disabled={isScheduling}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Meeting'}
                  {!isScheduling && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setSelectedSlot(null)}
                  disabled={isScheduling}
                  className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-[#25262b] hover:bg-[#2c2d32] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.slots.map((slot, index) => (
              <button
                key={index}
                className={`w-full text-left px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedSlot && selectedSlot.start === slot.start 
                    ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                    : 'border-gray-600 bg-[#25262b] hover:bg-[#2c2d32]'
                }`}
                onClick={() => handleSelectSlot(slot)}
              >
                <div className="font-medium text-gray-200">
                  {format(parseISO(slot.start), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-gray-400">
                  {format(parseISO(slot.start), 'h:mm a')} - {format(parseISO(slot.end), 'h:mm a')}
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onReset(results.participants)}
            className="w-full mt-6 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-[#25262b] hover:bg-[#2c2d32] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center justify-center gap-2"
          >
            Back to Form
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  /**
   * No Available Slots UI State
   * Displayed when the API couldn't find any available time slots
   */
  return (
    <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
      <div className="bg-[#1e2875] p-6">
        <div className="flex items-center gap-3 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold">No Available Times</h2>
        </div>
        <p className="mt-1 text-sm text-gray-300">
          {results.message || "No overlapping availability found within the specified range."}
        </p>
      </div>
      
      <div className="p-6">
        <button
          onClick={() => onReset(results.participants)}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
        >
          Try Different Parameters
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AvailabilityResults; 