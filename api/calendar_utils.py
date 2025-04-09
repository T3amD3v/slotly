from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import RefreshError
from datetime import datetime, timedelta
import pytz
from typing import List, Dict, Any, Optional, Tuple
import os
import uuid
import json

"""
Google Calendar Integration Module

This module provides utility functions for:
1. Authenticating with Google Calendar API
2. Fetching events from calendars
3. Finding available time slots across multiple calendars
4. Creating new calendar events with Google Meet integration
"""

# Central Time Zone
CST = pytz.timezone('America/Chicago')

# Working hours in CST
WORK_START_HOUR = 8  # 8:00 AM CST
WORK_END_HOUR = 17   # 5:00 PM CST


def create_google_calendar_service(token_info: Dict[str, Any]) -> Any:
    """
    Create a Google Calendar API service instance using the provided token info.
    
    This function handles the OAuth authentication flow with Google Calendar:
    1. Validates required credentials are present
    2. Attempts authentication with just the access token for read-only operations
    3. Falls back to refresh token authentication for full access
    4. Verifies the service is working by making a test API call
    
    Args:
        token_info: Dictionary containing OAuth token information
                   (access_token, refresh_token, client_id, client_secret)
        
    Returns:
        Google Calendar API service instance ready for API calls
        
    Raises:
        ValueError: If required credentials are missing or authentication fails
    """
    try:
        # Check required fields
        required_fields = ["client_id", "client_secret"]
        missing_fields = [field for field in required_fields if not token_info.get(field)]
        
        if missing_fields:
            missing_fields_str = ", ".join(missing_fields)
            error_msg = f"Missing required credential fields: {missing_fields_str}"
            raise ValueError(error_msg)

        # If we have an access token, try a direct approach first - for read-only operations this can work without a refresh token
        if token_info.get("access_token"):
            try:
                # Simple authentication with just the access token
                credentials = Credentials(
                    token=token_info.get("access_token"),
                    client_id=token_info.get("client_id"),
                    client_secret=token_info.get("client_secret"),
                    token_uri="https://oauth2.googleapis.com/token",
                    scopes=["https://www.googleapis.com/auth/calendar.readonly"]
                )
                
                # Build and return the service
                service = build("calendar", "v3", credentials=credentials)
                
                # Test the connection by making a simple API call
                service.calendarList().list(maxResults=1).execute()
                
                return service
            except (HttpError, RefreshError) as e:
                # Will try alternative method
                pass
            except Exception as e:
                # Will try alternative method
                pass
        
        # If refresh token is missing but we need to continue, set up for read-only operations
        if not token_info.get("refresh_token") and not token_info.get("access_token"):
            raise ValueError("Missing both refresh_token and access_token")
        
        # Full authentication with whatever tokens we have
        credentials_kwargs = {
            "token": token_info.get("access_token"),
            "client_id": token_info.get("client_id"),
            "client_secret": token_info.get("client_secret"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        
        if token_info.get("refresh_token"):
            credentials_kwargs["refresh_token"] = token_info.get("refresh_token")
            
        credentials = Credentials(**credentials_kwargs)
        service = build("calendar", "v3", credentials=credentials)
        
        # Test the service with a simple call
        try:
            service.calendarList().list(maxResults=1).execute()
            return service
        except Exception as e:
            raise
    except Exception as e:
        error_msg = f"Failed to create Google Calendar service: {str(e)}"
        raise ValueError(error_msg) from e


def get_calendar_events(service: Any, calendar_id: str, time_min: datetime, time_max: datetime) -> List[Dict[str, Any]]:
    """
    Fetch events from a specific calendar within a given time range.
    
    Uses the Google Calendar API to retrieve events from a user's calendar.
    Events are returned in chronological order.
    
    Args:
        service: Google Calendar API service instance
        calendar_id: ID of the calendar to fetch events from (usually user's email)
        time_min: Start of the time range to fetch events
        time_max: End of the time range to fetch events
        
    Returns:
        List of events as dictionaries with Google Calendar API event format
    """
    # Convert times to UTC ISO format for the API
    time_min_utc = time_min.astimezone(pytz.UTC).isoformat()
    time_max_utc = time_max.astimezone(pytz.UTC).isoformat()
    
    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=time_min_utc,
        timeMax=time_max_utc,
        singleEvents=True,
        orderBy="startTime"
    ).execute()
    
    return events_result.get("items", [])


def convert_to_cst(dt: datetime) -> datetime:
    """
    Convert a datetime to CST timezone.
    
    Ensures all datetime objects are in the same timezone for consistent 
    comparisons throughout the application.
    
    Args:
        dt: The datetime to convert, can be timezone-aware or naive
        
    Returns:
        The datetime in CST timezone
    """
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)
    return dt.astimezone(CST)


def is_working_hours(dt: datetime) -> bool:
    """
    Check if a datetime is within working hours (8 AM - 5 PM CST, Monday-Friday).
    
    Used to determine if a time slot should be considered for availability.
    
    Args:
        dt: The datetime to check
        
    Returns:
        True if within working hours, False otherwise
    """
    # Convert to CST
    dt_cst = convert_to_cst(dt)
    
    # Check if it's a weekend
    if dt_cst.weekday() >= 5:  # 5 is Saturday, 6 is Sunday
        return False
    
    # Check if it's within working hours
    return WORK_START_HOUR <= dt_cst.hour < WORK_END_HOUR


def get_busy_intervals(events: List[Dict[str, Any]]) -> List[Tuple[datetime, datetime]]:
    """
    Extract busy time intervals from calendar events.
    
    Processes calendar events to extract when a person is busy.
    Skips events marked as "transparent" (user shown as available).
    
    Args:
        events: List of calendar events from Google Calendar API
        
    Returns:
        List of tuples representing busy intervals (start, end)
    """
    busy_intervals = []
    
    for event in events:
        # Skip events with transparency=transparent (user shown as available)
        if event.get("transparency") == "transparent":
            continue
            
        start = event["start"].get("dateTime")
        end = event["end"].get("dateTime")
        
        # Skip all-day events or events without specific times
        if not start or not end:
            continue
            
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        
        # Convert to CST
        start_cst = convert_to_cst(start_dt)
        end_cst = convert_to_cst(end_dt)
        
        busy_intervals.append((start_cst, end_cst))
    
    return busy_intervals


def merge_busy_intervals(intervals: List[Tuple[datetime, datetime]]) -> List[Tuple[datetime, datetime]]:
    """
    Merge overlapping busy intervals.
    
    Takes a list of busy time intervals and merges any that overlap,
    creating a consolidated list of non-overlapping busy intervals.
    
    Args:
        intervals: List of busy intervals (start, end)
        
    Returns:
        List of merged busy intervals
    """
    if not intervals:
        return []
        
    # Sort intervals by start time
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    
    merged = [sorted_intervals[0]]
    
    for current in sorted_intervals[1:]:
        previous = merged[-1]
        
        # If current interval overlaps with previous
        if current[0] <= previous[1]:
            # Merge by extending the end time of the previous interval if needed
            merged[-1] = (previous[0], max(previous[1], current[1]))
        else:
            merged.append(current)
            
    return merged


def generate_working_day_intervals(start_date: datetime, end_date: datetime) -> List[Tuple[datetime, datetime]]:
    """
    Generate time intervals for working days between start_date and end_date.
    
    Creates blocks of time representing working hours (8am-5pm) for weekdays
    within the given date range.
    
    Args:
        start_date: Start of the date range
        end_date: End of the date range
        
    Returns:
        List of working day intervals as (start, end) tuples
    """
    working_intervals = []
    
    # Ensure dates are in CST
    start_cst = convert_to_cst(start_date)
    end_cst = convert_to_cst(end_date)
    
    # Set start to the beginning of the day
    current_date = start_cst.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Iterate through each day
    while current_date <= end_cst:
        # Skip weekends
        if current_date.weekday() < 5:  # 0-4 are Monday-Friday
            # Create interval for working hours
            day_start = current_date.replace(hour=WORK_START_HOUR, minute=0)
            day_end = current_date.replace(hour=WORK_END_HOUR, minute=0)
            
            # Adjust if day_start is before the actual start_cst
            if day_start < start_cst and start_cst.date() == day_start.date():
                day_start = start_cst
                
            # Adjust if day_end is after the actual end_cst
            if day_end > end_cst and end_cst.date() == day_end.date():
                day_end = end_cst
                
            # Add interval if it's valid
            if day_start < day_end:
                working_intervals.append((day_start, day_end))
        
        # Move to next day
        current_date += timedelta(days=1)
    
    return working_intervals


def find_free_intervals(working_intervals: List[Tuple[datetime, datetime]], 
                        busy_intervals: List[Tuple[datetime, datetime]]) -> List[Tuple[datetime, datetime]]:
    """
    Find free time intervals by subtracting busy intervals from working intervals.
    
    This is the core algorithm for finding available slots:
    1. Start with working hours intervals (8am-5pm weekdays)
    2. For each busy interval, remove that time from the working intervals
    3. Result is the available/free time slots
    
    Args:
        working_intervals: List of working day intervals
        busy_intervals: List of busy intervals
        
    Returns:
        List of free intervals representing available times
    """
    if not busy_intervals:
        return working_intervals
        
    if not working_intervals:
        return []
        
    free_intervals = []
    
    for work_start, work_end in working_intervals:
        # Start with the full working interval
        available_time = [(work_start, work_end)]
        
        # Remove busy time from available time
        for busy_start, busy_end in busy_intervals:
            # Clip busy interval to working hours
            if busy_end <= work_start or busy_start >= work_end:
                # Busy interval doesn't overlap with this working interval
                continue
                
            busy_start = max(busy_start, work_start)
            busy_end = min(busy_end, work_end)
            
            # Update available_time by removing the busy interval
            new_available = []
            for avail_start, avail_end in available_time:
                # If available interval ends before busy starts or starts after busy ends,
                # it's not affected
                if avail_end <= busy_start or avail_start >= busy_end:
                    new_available.append((avail_start, avail_end))
                    continue
                    
                # If busy interval splits available interval in two
                if avail_start < busy_start and avail_end > busy_end:
                    new_available.append((avail_start, busy_start))
                    new_available.append((busy_end, avail_end))
                # If busy interval overlaps with start of available interval
                elif avail_start < busy_start:
                    new_available.append((avail_start, busy_start))
                # If busy interval overlaps with end of available interval
                elif avail_end > busy_end:
                    new_available.append((busy_end, avail_end))
                # Else the available interval is completely covered by busy interval
                
            available_time = new_available
            
            # If no available time left, break early
            if not available_time:
                break
        
        # Add remaining available time
        free_intervals.extend(available_time)
    
    return free_intervals


def filter_slots_by_duration(free_intervals: List[Tuple[datetime, datetime]], 
                            duration_minutes: int) -> List[Tuple[datetime, datetime]]:
    """
    Filter free intervals to include only those long enough for the meeting duration.
    
    Takes continuous blocks of free time and breaks them into discrete meeting slots:
    1. Ensures each slot is long enough for the requested meeting duration
    2. Rounds start times to nearest 15-minute intervals
    3. Creates multiple slots within longer free periods
    
    Args:
        free_intervals: List of free time intervals
        duration_minutes: Required meeting duration in minutes
        
    Returns:
        List of suitable time slots for meetings of the requested duration
    """
    duration_delta = timedelta(minutes=duration_minutes)
    suitable_slots = []
    
    for start, end in free_intervals:
        if end - start >= duration_delta:
            # Round start time to nearest 15-minute interval
            minutes = start.minute
            rounded_minutes = ((minutes + 14) // 15) * 15
            
            if rounded_minutes == 60:
                start = start.replace(hour=start.hour + 1, minute=0)
            else:
                start = start.replace(minute=rounded_minutes)
                
            # Create slots at 15-minute intervals
            slot_start = start
            while slot_start + duration_delta <= end:
                suitable_slots.append((slot_start, slot_start + duration_delta))
                slot_start = slot_start + timedelta(minutes=15)
    
    return suitable_slots


def create_calendar_event(service: Any, calendar_id: str, summary: str, 
                        start_time: datetime, end_time: datetime, 
                        attendees: List[str], add_google_meet: bool = False) -> Dict[str, Any]:
    """
    Create a calendar event.
    
    Creates a new event in Google Calendar with the specified details.
    Can optionally add Google Meet video conferencing to the event.
    
    Args:
        service: Google Calendar API service
        calendar_id: ID of the calendar to create the event in (usually 'primary')
        summary: Event summary/title
        start_time: Event start time
        end_time: Event end time
        attendees: List of attendee emails
        add_google_meet: Whether to add Google Meet conferencing data
        
    Returns:
        Created event data from Google Calendar API
    """
    try:
        required_fields = ["calendar_id", "summary", "start_time", "end_time"]
        for field in required_fields:
            if not locals().get(field):
                raise ValueError(f"Missing required field for calendar event: {field}")
                
        # Prepare the event data
        event = {
            'summary': summary,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            },
        }
        
        # Add attendees if provided
        if attendees:
            event['attendees'] = [{'email': attendee} for attendee in attendees]
        
        # Add Google Meet if requested
        if add_google_meet:
            event['conferenceData'] = {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                }
            }
            
        # Create the event
        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event,
            conferenceDataVersion=1 if add_google_meet else 0,
            sendUpdates='all'  # Send invitations to attendees
        ).execute()
        
        return created_event
    except Exception as e:
        # Re-raise the exception for other errors
        raise


def get_event_conference_details(service: Any, calendar_id: str, event_id: str) -> Dict[str, Any]:
    """
    Retrieves an event and returns its conference details for debugging.
    
    Gets a specific event by ID and extracts its conference information,
    including Google Meet links if present.
    
    Args:
        service: Google Calendar API service
        calendar_id: ID of the calendar containing the event
        event_id: ID of the event to examine
        
    Returns:
        Dictionary containing event conference data
    """
    try:
        # Get the event
        event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
        
        # Extract and return the conference data
        conference_data = event.get('conferenceData', {})
        
        # Return comprehensive details for UI display
        return {
            'conference_data': conference_data,
            'event_summary': event.get('summary', ''),
            'event_description': event.get('description', ''),
            'event_location': event.get('location', ''),
            'has_conference': bool(conference_data),
            'all_fields': {k: event[k] for k in event.keys() if k not in ['conferenceData', 'summary', 'description', 'location']}
        }
    except Exception as e:
        error_details = str(e)
        return {'error': error_details}


def update_calendar_event(service: Any, calendar_id: str, event_id: str,
                         summary: str, start_time: datetime, end_time: datetime,
                         add_google_meet: bool = False) -> Dict[str, Any]:
    """
    Update an existing calendar event.
    
    Updates an event in Google Calendar with the specified details.
    Can optionally add Google Meet video conferencing to the event.
    
    Args:
        service: Google Calendar API service
        calendar_id: ID of the calendar containing the event (usually 'primary')
        event_id: ID of the event to update
        summary: New event summary/title
        start_time: New event start time
        end_time: New event end time
        add_google_meet: Whether to add Google Meet conferencing data
        
    Returns:
        Updated event data from Google Calendar API
    """
    try:
        # First retrieve the event
        event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
        
        # Update the event properties
        event['summary'] = summary
        event['start'] = {
            'dateTime': start_time.isoformat(),
            'timeZone': 'UTC',
        }
        event['end'] = {
            'dateTime': end_time.isoformat(),
            'timeZone': 'UTC',
        }
        
        # Add or update Google Meet if requested
        if add_google_meet and not event.get('conferenceData'):
            event['conferenceData'] = {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                }
            }
            
        # Update the event
        updated_event = service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=event,
            conferenceDataVersion=1 if add_google_meet else 0,
            sendUpdates='all'  # Send notifications about the update
        ).execute()
        
        return updated_event
    except Exception as e:
        # Re-raise the exception for other errors
        raise


def delete_calendar_event(service: Any, calendar_id: str, event_id: str) -> bool:
    """
    Delete a calendar event.
    
    Removes an event from Google Calendar.
    
    Args:
        service: Google Calendar API service
        calendar_id: ID of the calendar containing the event (usually 'primary')
        event_id: ID of the event to delete
        
    Returns:
        True if deletion was successful
    """
    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id,
            sendUpdates='all'  # Send notifications about the deletion
        ).execute()
        return True
    except Exception as e:
        # Re-raise the exception for other errors
        raise 