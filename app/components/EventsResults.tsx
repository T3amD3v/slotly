'use client';

// @ts-ignore
import { format, parseISO } from 'date-fns';
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface EventType {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
  organizer?: {
    email: string;
    self?: boolean;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  conferenceData?: any;
}

interface EventsResultsProps {
  results: {
    events?: EventType[];
    error?: string;
  };
  onReset: () => void;
  onRefresh: () => void;
}

/**
 * EventsResults Component
 * 
 * Displays a list of calendar events and provides options to update or delete them.
 */
const EventsResults: React.FC<EventsResultsProps> = ({ results, onReset, onRefresh }) => {
  const { data: session } = useSession();
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);

  const handleEditEvent = (event: EventType) => {
    setEditingEvent(event);
    setSummary(event.summary);
    setAddGoogleMeet(!!event.conferenceData);
    setOperationError(null);
  };

  const handleCloseEdit = () => {
    setEditingEvent(null);
    setSummary('');
    setAddGoogleMeet(false);
    setOperationError(null);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      setIsUpdating(true);
      setOperationError(null);

      // Parse the input values
      const startTime = startDateRef.current?.value 
        ? new Date(startDateRef.current.value).toISOString()
        : editingEvent.start.dateTime;
      
      const endTime = endDateRef.current?.value 
        ? new Date(endDateRef.current.value).toISOString()
        : editingEvent.end.dateTime;

      // Prepare request data
      const requestData = {
        summary,
        start_time: startTime,
        end_time: endTime,
        add_google_meet: addGoogleMeet,
        auth: {
          accessToken: session?.accessToken,
          refreshToken: session?.refreshToken,
        }
      };

      // Call the API to update the event
      const response = await fetch(`/api/py/events/${editingEvent.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Close the edit form and refresh the events list
      handleCloseEdit();
      onRefresh();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'An error occurred while updating the event');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEvent = async (event: EventType) => {
    if (!confirm(`Are you sure you want to delete "${event.summary}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setOperationError(null);

      // Call the API to delete the event
      const queryParams = new URLSearchParams({
        access_token: session?.accessToken || '',
        refresh_token: session?.refreshToken || '',
      });

      const response = await fetch(`/api/py/events/${event.id}?${queryParams.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh the events list
      onRefresh();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'An error occurred while deleting the event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Error UI State
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
            onClick={onReset}
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

  // Edit Modal
  const renderEditModal = () => {
    if (!editingEvent) return null;

    const startDate = parseISO(editingEvent.start.dateTime);
    const endDate = parseISO(editingEvent.end.dateTime);

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-[#1a1b1e] rounded-lg overflow-hidden w-full max-w-md mx-4">
          <div className="bg-[#1e2875] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Edit Event</h3>
              <button 
                onClick={handleCloseEdit}
                className="text-gray-300 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {operationError && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-2 rounded">
                {operationError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Event Name
              </label>
              <input 
                type="text" 
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date & Time
              </label>
              <input 
                type="datetime-local" 
                ref={startDateRef}
                defaultValue={format(startDate, "yyyy-MM-dd'T'HH:mm")}
                className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date & Time
              </label>
              <input 
                type="datetime-local" 
                ref={endDateRef}
                defaultValue={format(endDate, "yyyy-MM-dd'T'HH:mm")}
                className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="add-google-meet"
                type="checkbox"
                checked={addGoogleMeet}
                onChange={(e) => setAddGoogleMeet(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
              />
              <label htmlFor="add-google-meet" className="ml-2 block text-sm text-gray-300">
                Add Google Meet
              </label>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleUpdateEvent}
                disabled={isUpdating}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Event'}
              </button>
              <button
                onClick={handleCloseEdit}
                disabled={isUpdating}
                className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-[#25262b] hover:bg-[#2c2d32] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // No Events UI State
  if (!results.events || results.events.length === 0) {
    return (
      <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
        <div className="bg-[#1e2875] p-6">
          <div className="flex items-center gap-3 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold">No Events Found</h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="mt-2 text-gray-300">No events were found in the selected date range.</p>
          <button
            onClick={onReset}
            className="w-full mt-6 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            Try Different Dates
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Events List UI
  return (
    <div className="bg-[#1a1b1e] shadow-md rounded-lg overflow-hidden glow-effect">
      {renderEditModal()}
      
      <div className="bg-[#1e2875] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold">Your Calendar Events</h2>
          </div>
          <span className="text-gray-300 text-sm">{results.events.length} events</span>
        </div>
      </div>
      
      <div className="p-6">
        {operationError && !editingEvent && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
            {operationError}
          </div>
        )}
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {results.events.map((event) => {
            const startDate = parseISO(event.start.dateTime);
            const endDate = parseISO(event.end.dateTime);
            
            // Check if this event is organized by the current user
            const isOwnEvent = event.organizer?.self === true;
            
            return (
              <div 
                key={event.id} 
                className="border border-gray-700 rounded-md p-4 bg-[#25262b]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-200">{event.summary}</h3>
                    <p className="text-sm text-gray-400">
                      {format(startDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </p>
                    
                    {event.attendees && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Attendees:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.attendees.slice(0, 3).map((attendee, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900 bg-opacity-30 text-blue-300"
                            >
                              {attendee.email}
                            </span>
                          ))}
                          {event.attendees.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300">
                              +{event.attendees.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {isOwnEvent && (
                      <>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900 hover:bg-opacity-20 rounded"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          disabled={isDeleting}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    {!isOwnEvent && (
                      <span className="text-xs text-gray-500 italic">
                        You are not the organizer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <button
          onClick={onReset}
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
};

export default EventsResults; 