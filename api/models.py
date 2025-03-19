from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime


class DateRange(BaseModel):
    start: datetime
    end: datetime


class ScheduleRequest(BaseModel):
    meeting_type: Literal["find_availability", "schedule_meeting"]
    participants: List[str]
    duration: int = Field(..., gt=0, description="Meeting duration in minutes")
    date_range: DateRange
    meeting_name: Optional[str] = None
    time_slot: Optional[dict] = None
    add_google_meet: Optional[bool] = False


class TimeSlot(BaseModel):
    start: datetime
    end: datetime


class ScheduledMeeting(BaseModel):
    id: str
    start: datetime
    end: datetime
    summary: str
    attendees: List[str]


class AvailabilityResponse(BaseModel):
    slots: Optional[List[TimeSlot]] = None
    message: Optional[str] = None
    error: Optional[str] = None
    scheduled_meeting: Optional[ScheduledMeeting] = None 