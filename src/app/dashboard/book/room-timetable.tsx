"use client"

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
import { useEffect, useState, useCallback, useRef } from 'react'
import { TimetableEvent } from '@/utils/supabase/queries'
import { getRoomBookings } from '@/app/actions/bookings'
import { Loader2 } from 'lucide-react'
import type { EventInput, DateSelectArg } from '@fullcalendar/core'
import './room-timetable.css'
import { toast } from "sonner"

type RoomTimetableProps = {
  roomId: string
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  selectedSlot?: { start: Date; end: Date } | null
  excludeBookingId?: string
  focusDate?: Date
  isAdmin?: boolean
}

export function RoomTimetable({ roomId, onSelectSlot, selectedSlot, excludeBookingId, focusDate, isAdmin }: RoomTimetableProps) {
  const [events, setEvents] = useState<TimetableEvent[]>([])
  const [loading, setLoading] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)

  const fetchEvents = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const data = await getRoomBookings(roomId, excludeBookingId)
      setEvents(data)
    } catch (error) {
      console.error('Failed to fetch events', error)
    } finally {
      setLoading(false)
    }
  }, [roomId, excludeBookingId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Navigate calendar to focusDate when it changes
  useEffect(() => {
    if (focusDate && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.gotoDate(focusDate)
    }
  }, [focusDate])

  // Transform TimetableEvent to FullCalendar EventInput format
  const calendarEvents: EventInput[] = events.map((event) => {
    let backgroundColor = '#3b82f6' // Blue-500
    let borderColor = '#2563eb' // Blue-600

    if (event.status === 'approved') {
      backgroundColor = '#ef4444' // Red-500
      borderColor = '#dc2626' // Red-600
    } else if (event.status === 'pending') {
      backgroundColor = '#f97316' // Orange-500
      borderColor = '#ea580c' // Orange-600
    }

    return {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor,
      borderColor,
      textColor: '#ffffff',
      extendedProps: {
        status: event.status,
        details: event.details,
      },
    }
  })

  // Add selected slot event if exists
  if (selectedSlot) {
    calendarEvents.push({
      id: 'selected-slot',
      title: '已選取',
      start: selectedSlot.start,
      end: selectedSlot.end,
      backgroundColor: '#d59ae1',
      borderColor: '#c881d6',
      textColor: 'white',
      display: 'block',
      classNames: ['selected-slot-event'],
    })
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const now = new Date()
    const start = selectInfo.start
    const end = selectInfo.end

    // Check if past time
    if (!isAdmin && start < now) {
      toast.error("無法選擇過去的時間")
      selectInfo.view.calendar.unselect()
      return
    }

    // Only allow selection in future (double check)
    if (isAdmin || start >= now) {
      onSelectSlot?.({ start, end })
    }

    // Unselect the selection highlight as we will show the 'selected-slot' event instead
    const calendarApi = selectInfo.view.calendar
    calendarApi.unselect()
  }

  return (
    <div className="relative bg-background rounded-lg border p-4 shadow-sm fc-wrapper">
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale={zhTwLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        views={{
          dayGridMonth: {
            dayHeaderFormat: {
              weekday: 'short',
            },
          }
        }}
        buttonText={{
          today: '今天',
          month: '月',
          week: '週',
          day: '日',
        }}
        slotDuration="00:30:00"
        slotMinTime={isAdmin ? "00:00:00" : "08:00:00"}
        slotMaxTime={isAdmin ? "24:00:00" : "22:00:00"}
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        dayHeaderFormat={{
          month: 'numeric',
          day: 'numeric',
          weekday: 'narrow'
        }}
        allDaySlot={false}
        nowIndicator={true}
        selectable={true}
        selectMirror={true}
        selectLongPressDelay={100}
        longPressDelay={100}
        eventLongPressDelay={100}
        select={handleDateSelect}
        events={calendarEvents}
        height="auto"
        contentHeight="auto"
        dayMaxEvents={true}
        weekends={true}
        firstDay={1} // Monday
        expandRows={true}
        stickyHeaderDates={true}
        eventDisplay="block"
      />
    </div>
  )
}
