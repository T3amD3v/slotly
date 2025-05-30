from fastapi import FastAPI, Depends, HTTPException, Request, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env and .env.local files
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    
env_local_path = Path(__file__).resolve().parent.parent / '.env.local'
if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path, override=True)

from .models import ScheduleRequest, AvailabilityResponse, TimeSlot, ScheduledMeeting
from .calendar_utils import (
    create_google_calendar_service,
    get_calendar_events,
    generate_working_day_intervals,
    get_busy_intervals,
    merge_busy_intervals,
    find_free_intervals,
    filter_slots_by_duration,
    create_calendar_event,
    get_event_conference_details,
    update_calendar_event,
    delete_calendar_event,
)

### Create FastAPI instance with custom docs and openapi url
app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

# Add CORS middleware with teamodea domain restriction
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://teamodea.com",
        "https://*.teamodea.com",
        "http://localhost:3000",  # For local development
        "http://127.0.0.1:3000",  # For local development
    ],  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Default allowed domains
ALLOWED_EMAIL_DOMAINS = os.environ.get("ALLOWED_EMAIL_DOMAINS", "teamodea.com").split(",")

# Get Google OAuth credentials from environment variables
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

"""
Authentication Functions
These functions handle token extraction and validation
"""

async def get_session_token(request: Request) -> Dict[str, Any]:
    """
    Get token info from session
    """
    # Default values
    token_info = {
        'access_token': None,
        'refresh_token': None,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET
    }
    
    # Try to get session data
    try:
        session_cookie = request.cookies.get('__Secure-next-auth.session-token') or request.cookies.get('next-auth.session-token')
        
        if not session_cookie:
            return token_info
            
        # Use session data
        # Implement decrypt logic here to get the token from session cookie
        # For now, this will be handled by the frontend passing tokens
        
    except Exception as e:
        print(f"Session access error: {str(e)}")
        
    return token_info


def validate_email_domain(email: str) -> bool:
    """
    Validate that the email domain is allowed.
    
    Checks if the email domain is in the allowed domains list.
    If the wildcard "*" is included in the allowed domains, all domains are allowed.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if allowed, False otherwise
    """
    if not email or "@" not in email:
        return False
    
    # If wildcard is in allowed domains, all domains are permitted
    if "*" in ALLOWED_EMAIL_DOMAINS:
        return True
        
    domain = email.split("@")[1]
    return domain in ALLOWED_EMAIL_DOMAINS


"""
API Route Definitions
"""

@app.get("/api/py/helloFastApi")
def hello_fast_api():
    """
    Simple health check endpoint to verify FastAPI is working
    """
    return {"message": "Hello from FastAPI"}


"""
Request Model Definitions
"""

class AuthInfo(BaseModel):
    """
    Authentication information model
    Contains OAuth tokens from the frontend
    """
    accessToken: Optional[str] = None
    refreshToken: Optional[str] = None

class ScheduleRequestWithAuth(BaseModel):
    """
    Complete scheduling request with authentication data
    This extends the basic ScheduleRequest with auth information
    """
    meeting_type: str
    participants: List[str]
    duration: int
    date_range: Dict[str, Any]
    auth: Optional[AuthInfo] = None
    meeting_name: Optional[str] = None
    time_slot: Optional[Dict[str, str]] = None
    add_google_meet: Optional[bool] = False

"""
Main Scheduling Endpoint
"""

@app.post("/api/py/schedule", response_model=AvailabilityResponse)
async def schedule(request: Request):
    """
    Main scheduling endpoint that handles both finding availability and scheduling meetings.
    
    This endpoint supports two modes:
    1. Find Availability: Analyzes multiple calendars to find times when all participants are free
    2. Schedule Meeting: Creates an actual calendar event at a specific time with all participants
    
    The mode is determined by the meeting_type field in the request.
    """
    try:
        # Parse the request body manually
        raw_body = await request.body()
        body_dict = json.loads(raw_body)
        
        # Extract auth info if present
        auth_info = body_dict.get('auth', {})
        
        # Create a ScheduleRequest from the body (excluding auth)
        schedule_data = {k: v for k, v in body_dict.items() if k != 'auth'}
        schedule_request = ScheduleRequest(**schedule_data)
        
        # Get token info from session
        token_info = await get_session_token(request)
        
        # Update token_info with auth info from request body
        if auth_info:
            if auth_info.get('accessToken'):
                token_info['access_token'] = auth_info.get('accessToken')
            
            if auth_info.get('refreshToken'):
                token_info['refresh_token'] = auth_info.get('refreshToken')
                
        # Check if we're in read-only mode
        read_only_mode = not token_info.get('refresh_token')
        if read_only_mode and schedule_request.meeting_type == "schedule_meeting":
            return AvailabilityResponse(
                error="Cannot schedule meetings without a refresh token. Please re-authenticate with full permissions."
            )
        
        # Validate participant emails
        for email in schedule_request.participants:
            if not validate_email_domain(email):
                return AvailabilityResponse(
                    error=f"Email domain not permitted: {email}. Update settings to allow external domains."
                )
                
        # Create Google Calendar service
        service = create_google_calendar_service(token_info)
        
        # Get start and end dates in datetime format
        start_date = schedule_request.date_range.start
        end_date = schedule_request.date_range.end
        
        # --------------------------------------------------------
        # FIND AVAILABILITY MODE
        # --------------------------------------------------------
        if schedule_request.meeting_type == "find_availability":
            """
            Find available time slots for all participants
            
            1. Generate working day time blocks (8am-5pm, weekdays)
            2. Get busy times for all participants
            3. Find free intervals by subtracting busy times from working hours
            4. Filter slots to ensure they're long enough for the meeting
            """
            
            # Generate working day intervals (8 AM - 5 PM CST, Monday-Friday)
            working_intervals = generate_working_day_intervals(start_date, end_date)
            
            if not working_intervals:
                return AvailabilityResponse(
                    message="No working hours found in the specified date range."
                )
            
            # Get busy intervals for all participants
            all_busy_intervals = []
            
            for participant in schedule_request.participants:
                # Get events from participant's calendar
                events = get_calendar_events(
                    service=service,
                    calendar_id=participant,  # Use email as calendar ID
                    time_min=start_date,
                    time_max=end_date
                )
                
                # Extract busy intervals from events
                busy_intervals = get_busy_intervals(events)
                all_busy_intervals.extend(busy_intervals)
            
            # Merge overlapping busy intervals
            merged_busy_intervals = merge_busy_intervals(all_busy_intervals)
            
            # Find free intervals
            free_intervals = find_free_intervals(working_intervals, merged_busy_intervals)
            
            # Filter by duration
            suitable_slots = filter_slots_by_duration(free_intervals, schedule_request.duration)
            
            if not suitable_slots:
                return AvailabilityResponse(
                    message="No overlapping availability found within the specified range."
                )
            
            # Convert to TimeSlot format
            time_slots = [
                TimeSlot(start=start, end=end) for start, end in suitable_slots
            ]
            
            if read_only_mode:
                return AvailabilityResponse(
                    slots=time_slots,
                    message="NOTE: Operating in read-only mode. To schedule meetings, please re-authenticate with full permissions."
                )
            else:
                return AvailabilityResponse(slots=time_slots)
        
        # --------------------------------------------------------
        # SCHEDULE MEETING MODE
        # --------------------------------------------------------
        elif schedule_request.meeting_type == "schedule_meeting":
            """
            Schedule a meeting at a specific time
            
            1. Either use a time slot provided in the request
            2. Or find the first available slot if none provided
            3. Create calendar event with all participants
            """
            
            # Check if a specific time slot was provided
            if hasattr(schedule_request, 'time_slot') and schedule_request.time_slot:
                # Use the provided time slot
                slot_start = datetime.fromisoformat(schedule_request.time_slot['start'].replace('Z', '+00:00'))
                slot_end = datetime.fromisoformat(schedule_request.time_slot['end'].replace('Z', '+00:00'))
                
                # Use the provided meeting name or a default
                summary = schedule_request.meeting_name if hasattr(schedule_request, 'meeting_name') and schedule_request.meeting_name else f"Meeting ({schedule_request.duration} minutes)"
            
            else:
                # Original logic to find the first available slot
                # Schedule a meeting at the specified time
                # For this demo, we'll assume the first time slot is used
                
                # Find available slots first
                working_intervals = generate_working_day_intervals(start_date, end_date)
                
                if not working_intervals:
                    return AvailabilityResponse(
                        error="No working hours found in the specified date range."
                    )
                
                # Get busy intervals for all participants
                all_busy_intervals = []
                
                for participant in schedule_request.participants:
                    # Get events from participant's calendar
                    events = get_calendar_events(
                        service=service,
                        calendar_id=participant,
                        time_min=start_date,
                        time_max=end_date
                    )
                    
                    # Extract busy intervals from events
                    busy_intervals = get_busy_intervals(events)
                    all_busy_intervals.extend(busy_intervals)
                
                # Merge overlapping busy intervals
                merged_busy_intervals = merge_busy_intervals(all_busy_intervals)
                
                # Find free intervals
                free_intervals = find_free_intervals(working_intervals, merged_busy_intervals)
                
                # Filter by duration
                suitable_slots = filter_slots_by_duration(free_intervals, schedule_request.duration)
                
                if not suitable_slots:
                    return AvailabilityResponse(
                        error="No suitable time slots found within the specified range."
                    )
                
                # Use the first available slot
                slot_start, slot_end = suitable_slots[0]
                
                # Create a meeting summary
                summary = f"Meeting ({schedule_request.duration} minutes)"
            
            # Create the calendar event for each participant
            # For simplicity, we'll create it in the current user's calendar only
            # and invite others as attendees
            created_event = create_calendar_event(
                service=service,
                calendar_id="primary",  # Current user's primary calendar
                summary=summary,
                start_time=slot_start,
                end_time=slot_end,
                attendees=schedule_request.participants,
                add_google_meet=schedule_request.add_google_meet,
            )
            
            # Return the scheduled meeting details
            return AvailabilityResponse(
                scheduled_meeting=ScheduledMeeting(
                    id=created_event["id"],
                    start=created_event["start"]["dateTime"],
                    end=created_event["end"]["dateTime"],
                    summary=created_event["summary"],
                    attendees=[attendee["email"] for attendee in created_event.get("attendees", [])]
                )
            )
    except Exception as api_error:
        error_msg = f"Google Calendar API error: {str(api_error)}"
        return AvailabilityResponse(error=error_msg)
            
    except Exception as e:
        error_msg = f"Error processing schedule request: {str(e)}"
        return AvailabilityResponse(error=error_msg)

@app.post("/api/py/events", response_model=Dict[str, Any])
async def get_events(request: Request):
    """
    Get all events in a date range for the current user.
    
    This endpoint retrieves all events from the user's primary calendar
    within the specified date range.
    """
    try:
        # Parse the request body manually
        raw_body = await request.body()
        body_dict = json.loads(raw_body)
        
        # Extract auth info if present
        auth_info = body_dict.get('auth', {})
        
        # Extract date range
        date_range = body_dict.get('date_range', {})
        # Safely extract and parse start and end dates
        start_str = date_range.get('start')
        end_str = date_range.get('end')
        
        # Check if strings exist before parsing
        if not isinstance(start_str, str) or not isinstance(end_str, str):
            return {"error": "Invalid date range format. Start and end dates must be ISO format strings"}
            
        try:
            start_date = datetime.fromisoformat(start_str)
            end_date = datetime.fromisoformat(end_str)
        except ValueError as e:
            return {"error": f"Invalid date format: {str(e)}"}
        
        # Get token info from session
        token_info = await get_session_token(request)
        
        # Update token_info with auth info from request body
        if auth_info:
            if auth_info.get('accessToken'):
                token_info['access_token'] = auth_info.get('accessToken')
            
            if auth_info.get('refreshToken'):
                token_info['refresh_token'] = auth_info.get('refreshToken')
        
        # Create Google Calendar service
        service = create_google_calendar_service(token_info)
        
        # Get events from user's primary calendar
        events = get_calendar_events(
            service=service,
            calendar_id="primary",
            time_min=start_date,
            time_max=end_date
        )
        
        # Return the events and include the date range for potential refreshes
        return {
            "events": events,
            "date_range": {
                "start": start_str,
                "end": end_str
            }
        }
    except Exception as e:
        error_msg = f"Error retrieving events: {str(e)}"
        return {"error": error_msg}


@app.post("/api/py/events/{event_id}/update", response_model=Dict[str, Any])
async def update_event(event_id: str, request: Request):
    """
    Update an existing event.
    
    This endpoint updates an event in the user's primary calendar
    with the provided details.
    """
    try:
        # Parse the request body manually
        raw_body = await request.body()
        body_dict = json.loads(raw_body)
        
        # Extract auth info if present
        auth_info = body_dict.get('auth', {})
        
        # Extract event details
        summary = body_dict.get('summary')
        start_time = datetime.fromisoformat(body_dict.get('start_time'))
        end_time = datetime.fromisoformat(body_dict.get('end_time'))
        add_google_meet = body_dict.get('add_google_meet', False)
        
        # Get token info from session
        token_info = await get_session_token(request)
        
        # Update token_info with auth info from request body
        if auth_info:
            if auth_info.get('accessToken'):
                token_info['access_token'] = auth_info.get('accessToken')
            
            if auth_info.get('refreshToken'):
                token_info['refresh_token'] = auth_info.get('refreshToken')
        
        # Check if we're in read-only mode
        read_only_mode = not token_info.get('refresh_token')
        if read_only_mode:
            return {"error": "Cannot update events without a refresh token. Please re-authenticate with full permissions."}
        
        # Create Google Calendar service
        service = create_google_calendar_service(token_info)
        
        # Update the event
        updated_event = update_calendar_event(
            service=service,
            calendar_id="primary",
            event_id=event_id,
            summary=summary,
            start_time=start_time,
            end_time=end_time,
            add_google_meet=add_google_meet
        )
        
        # Return the updated event
        return {"event": updated_event}
    except Exception as e:
        error_msg = f"Error updating event: {str(e)}"
        return {"error": error_msg}


@app.delete("/api/py/events/{event_id}", response_model=Dict[str, Any])
async def delete_event(event_id: str, request: Request):
    """
    Delete an event.
    
    This endpoint deletes an event from the user's primary calendar.
    """
    try:
        # Get token info from session
        token_info = await get_session_token(request)
        
        # Try to get auth info from query parameters
        auth_token = request.query_params.get('access_token')
        refresh_token = request.query_params.get('refresh_token')
        
        if auth_token:
            token_info['access_token'] = auth_token
        
        if refresh_token:
            token_info['refresh_token'] = refresh_token
        
        # Check if we're in read-only mode
        read_only_mode = not token_info.get('refresh_token')
        if read_only_mode:
            return {"error": "Cannot delete events without a refresh token. Please re-authenticate with full permissions."}
        
        # Create Google Calendar service
        service = create_google_calendar_service(token_info)
        
        # Delete the event
        success = delete_calendar_event(
            service=service,
            calendar_id="primary",
            event_id=event_id
        )
        
        # Return success
        return {"success": success}
    except Exception as e:
        error_msg = f"Error deleting event: {str(e)}"
        return {"error": error_msg}