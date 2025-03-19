'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
// @ts-ignore
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addDays, setHours, setMinutes } from 'date-fns';
import { useSession } from 'next-auth/react';

// Add type definition for the renderCustomHeader props
interface CustomHeaderProps {
  date: Date;
  changeYear: (year: number) => void;
  changeMonth: (month: number) => void;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}

interface FormValues {
  meeting_type: 'find_availability' | 'schedule_meeting';
  participants: string;
  duration: number;
  date_range: {
    start: Date;
    end: Date;
  };
}

interface SchedulingFormProps {
  onSubmit: (data: any) => void;
  initialParticipants?: string[];
}

const SchedulingForm: React.FC<SchedulingFormProps> = ({ onSubmit, initialParticipants }) => {
  const { data: session } = useSession();
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      meeting_type: 'find_availability',
      participants: '',
      duration: 60,
      date_range: {
        start: setHours(setMinutes(new Date(), 0), 8),
        end: setHours(setMinutes(addDays(new Date(), 5), 0), 17),
      },
    },
  });

  // Populate participants field with the user's email when session is available
  useEffect(() => {
    // If initialParticipants are provided, use them
    if (initialParticipants && initialParticipants.length > 0) {
      setValue('participants', initialParticipants.join(', '));
    } 
    // Otherwise use the session email if available
    else if (session?.user?.email) {
      setValue('participants', session.user.email);
    }
  }, [session, setValue, initialParticipants]);

  // Always use find_availability mode
  const meetingType = 'find_availability';

  const validateEmails = (value: string) => {
    const emails = value.split(',').map(email => email.trim());
    
    if (emails.length === 0) {
      return 'At least one participant email is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        return `"${email}" is not a valid email address`;
      }
    }
    
    return true;
  };

  const processFormData = (data: FormValues) => {
    // Process the form data before submitting
    const processed = {
      ...data,
      // Always use find_availability mode regardless of what's in the form
      meeting_type: 'find_availability',
      participants: data.participants.split(',').map(email => email.trim()),
      date_range: {
        start: data.date_range.start.toISOString(),
        end: data.date_range.end.toISOString(),
      },
    };
    
    onSubmit(processed);
  };

  // Custom styles for DatePicker to match the dark theme
  const datePickerCustomStyles = `
    .react-datepicker {
      background-color: #25262b;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      font-family: inherit;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      color: #e5e7eb;
    }
    .react-datepicker__header {
      background-color: #1e2875;
      border-bottom: 1px solid #374151;
      padding: 12px;
      color: white;
    }
    .react-datepicker__current-month,
    .react-datepicker__day-name {
      color: #e5e7eb;
    }
    .react-datepicker__day {
      color: #e5e7eb;
    }
    .react-datepicker__day:hover {
      background-color: #3b82f6;
      border-radius: 50%;
    }
    .react-datepicker__day--selected,
    .react-datepicker__day--keyboard-selected {
      background-color: #3b82f6;
      border-radius: 50%;
      color: white;
    }
    .react-datepicker__day--disabled {
      color: #6b7280;
    }
    .react-datepicker__navigation {
      top: 12px;
    }
    .react-datepicker__navigation-icon::before {
      border-color: #e5e7eb;
    }
    .react-datepicker__month-container {
      background-color: #25262b;
    }
    .react-datepicker__triangle {
      display: none;
    }
    .react-datepicker__time-container {
      border-left-color: #374151;
      background-color: #25262b;
    }
    .react-datepicker__time-container .react-datepicker__time {
      background-color: #25262b;
    }
    .react-datepicker__time-container .react-datepicker__time-box {
      width: 100px !important;
    }
    .react-datepicker__time-list-item {
      color: #e5e7eb !important;
      height: 36px !important;
      line-height: 36px !important;
      padding: 0 12px !important;
    }
    .react-datepicker__time-list-item:hover {
      background-color: #3b82f6 !important;
    }
    .react-datepicker__time-list-item--selected {
      background-color: #3b82f6 !important;
      color: white !important;
    }
    
    /* Scrollbar styling */
    .react-datepicker__time-list::-webkit-scrollbar {
      width: 6px;
    }
    .react-datepicker__time-list::-webkit-scrollbar-track {
      background: #25262b;
    }
    .react-datepicker__time-list::-webkit-scrollbar-thumb {
      background: #4b5563;
      border-radius: 3px;
    }
    
    /* Time dropdown styling to match the image */
    .dark-datepicker-popper {
      z-index: 9999 !important;
    }
    
    .dark-theme-calendar {
      background-color: #25262b !important;
      color: white !important;
    }
    
    .dark-theme-time {
      color: white !important;
    }
    
    /* Calendar styling */
    .react-datepicker__month {
      margin: 0.4rem !important;
    }
    
    .react-datepicker__day--today {
      font-weight: bold;
      color: #3b82f6 !important;
    }
    
    .react-datepicker__day--highlighted {
      background-color: rgba(59, 130, 246, 0.5) !important;
    }
    
    /* Time dropdown appearance like in the image */
    .react-datepicker__time-container {
      width: 120px !important;
    }
    
    .react-datepicker__header--time {
      background-color: #1e2875;
      color: white;
      padding: 8px;
    }
    
    /* Time dropdown style */
    .react-datepicker-time__header {
      color: white !important;
      font-weight: normal !important;
    }
  `;

  return (
    <div className="bg-[#1a1b1e] rounded-lg overflow-hidden glow-effect">
      {/* Inject custom DatePicker styles */}
      <style jsx global>{datePickerCustomStyles}</style>
      
      {/* Header */}
      <div className="bg-[#1e2875] p-6">
        <div className="flex items-center gap-3 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-semibold">Find Availability</h2>
        </div>
        <p className="text-gray-300 mt-1 text-sm">
          Identify optimal meeting times across all participants' schedules
        </p>
      </div>

      <form onSubmit={handleSubmit(processFormData)} className="p-6 space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Participants
          </label>
          <input
            type="text"
            {...register('participants', { 
              required: 'Participants are required',
              validate: validateEmails
            })}
            placeholder="email1@example.com, email2@example.com"
            className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500"
          />
          {errors.participants && (
            <p className="mt-1 text-sm text-red-400">{errors.participants.message}</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Meeting Duration (minutes)
          </label>
          <input
            type="number"
            {...register('duration', { 
              required: 'Duration is required',
              min: { value: 15, message: 'Duration must be at least 15 minutes' },
              max: { value: 480, message: 'Duration must be at most 8 hours (480 minutes)' }
            })}
            className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
          />
          {errors.duration && (
            <p className="mt-1 text-sm text-red-400">{errors.duration.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Start Date & Time
            </label>
            <Controller
              control={control}
              name="date_range.start"
              render={({ field }) => (
                // @ts-ignore
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
                  minDate={new Date()}
                  filterDate={(date: Date) => date.getDay() !== 0 && date.getDay() !== 6}
                  timeCaption="Time"
                  popperClassName="dark-datepicker-popper"
                  popperPlacement="bottom-start"
                  showPopperArrow={false}
                  calendarClassName="dark-theme-calendar"
                  timeClassName={() => "dark-theme-time"}
                  renderCustomHeader={({
                    date,
                    changeYear,
                    changeMonth,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }: CustomHeaderProps) => (
                    <div className="flex items-center justify-between px-2 py-2">
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        className="text-white p-1 hover:bg-blue-700 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <h2 className="text-white text-center text-sm font-medium">
                        {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        className="text-white p-1 hover:bg-blue-700 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  )}
                />
              )}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              End Date & Time
            </label>
            <Controller
              control={control}
              name="date_range.end"
              render={({ field }) => (
                // @ts-ignore
                <DatePicker
                  selected={field.value}
                  onChange={field.onChange}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full px-3 py-2 bg-[#25262b] border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-200"
                  minDate={watch('date_range.start')}
                  filterDate={(date: Date) => date.getDay() !== 0 && date.getDay() !== 6}
                  timeCaption="Time"
                  popperClassName="dark-datepicker-popper"
                  popperPlacement="bottom-start"
                  showPopperArrow={false}
                  calendarClassName="dark-theme-calendar"
                  timeClassName={() => "dark-theme-time"}
                  renderCustomHeader={({
                    date,
                    changeYear,
                    changeMonth,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                  }: CustomHeaderProps) => (
                    <div className="flex items-center justify-between px-2 py-2">
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        className="text-white p-1 hover:bg-blue-700 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <h2 className="text-white text-center text-sm font-medium">
                        {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        className="text-white p-1 hover:bg-blue-700 rounded-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  )}
                />
              )}
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            Find Available Times
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SchedulingForm; 