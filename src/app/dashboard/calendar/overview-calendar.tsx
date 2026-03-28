"use client"

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import zhTwLocale from '@fullcalendar/core/locales/zh-tw'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAllRoomBookings, AllRoomBookingEvent } from '@/app/actions/bookings'
import { Loader2 } from 'lucide-react'
import type { EventInput } from '@fullcalendar/core'
import '../book/room-timetable.css'

// Color palette for different rooms
const ROOM_COLORS = [
  { bg: '#1f9c29', border: '#2563eb' }, // Green
  { bg: '#d68720', border: '#059669' }, // Orange
  { bg: '#f59e0b', border: '#d97706' }, // Amber
  { bg: '#8b5cf6', border: '#7c3aed' }, // Violet
  { bg: '#ec4899', border: '#db2777' }, // Pink
  { bg: '#06b6d4', border: '#0891b2' }, // Cyan
  { bg: '#f97316', border: '#ea580c' }, // Orange
  { bg: '#14b8a6', border: '#0d9488' }, // Teal
  { bg: '#6366f1', border: '#4f46e5' }, // Indigo
  { bg: '#84cc16', border: '#65a30d' }, // Lime
]

function getRoomColor(index: number) {
  return ROOM_COLORS[index % ROOM_COLORS.length]
}

// Adjust opacity for pending bookings
function adjustOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

type RoomFilter = {
  id: string
  name: string
  color: { bg: string; border: string }
  visible: boolean
}

export function OverviewCalendar() {
  const [events, setEvents] = useState<AllRoomBookingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [roomFilters, setRoomFilters] = useState<RoomFilter[]>([])
  const [showPending, setShowPending] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllRoomBookings()
      setEvents(data)

      // Extract unique rooms and assign colors
      const roomMap = new Map<string, { name: string, specificColor: string | null }>()
      data.forEach(e => {
        if (!roomMap.has(e.roomId)) {
          roomMap.set(e.roomId, { name: e.roomName, specificColor: e.roomColor })
        }
      })

      setRoomFilters(prev => {
        // Preserve existing visibility states
        const prevMap = new Map(prev.map(r => [r.id, r.visible]))
        const filters: RoomFilter[] = []
        let i = 0
        roomMap.forEach((info, id) => {
          // If specific hex color is provided from DB, use it for both bg and border
          const colorObj = info.specificColor
            ? { bg: info.specificColor, border: info.specificColor }
            : getRoomColor(i)
            
          filters.push({
            id,
            name: info.name,
            color: colorObj,
            visible: prevMap.get(id) ?? true,
          })
          
          if (!info.specificColor) {
            i++ // Only increment default color index if custom color is not used
          }
        })
        return filters
      })
    } catch (error) {
      console.error('Failed to fetch all bookings', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const toggleRoom = (roomId: string) => {
    setRoomFilters(prev =>
      prev.map(r => r.id === roomId ? { ...r, visible: !r.visible } : r)
    )
  }

  const toggleAll = () => {
    const allVisible = roomFilters.every(r => r.visible)
    setRoomFilters(prev => prev.map(r => ({ ...r, visible: !allVisible })))
  }

  // Build color map from filters
  const roomColorMap = useMemo(() => {
    const map = new Map<string, { bg: string; border: string }>()
    roomFilters.forEach(r => map.set(r.id, r.color))
    return map
  }, [roomFilters])

  const visibleRoomIds = useMemo(
    () => new Set(roomFilters.filter(r => r.visible).map(r => r.id)),
    [roomFilters]
  )

  const calendarEvents: EventInput[] = useMemo(() => {
    return events
      .filter(e => visibleRoomIds.has(e.roomId))
      .filter(e => showPending || e.status !== 'pending')
      .map(event => {
        const color = roomColorMap.get(event.roomId) || ROOM_COLORS[0]
        const isPending = event.status === 'pending'

        return {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: isPending ? '2px' : undefined,
          borderStyle: isPending ? 'dashed' : undefined,
          textColor: '#ffffff',
          extendedProps: {
            status: event.status,
            details: event.details,
            roomName: event.roomName,
          },
        }
      })
  }, [events, visibleRoomIds, roomColorMap, showPending])

  return (
    <div className="space-y-4">
      {/* Room filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
        >
          {roomFilters.every(r => r.visible) ? '取消全選' : '全選'}
        </button>
        {roomFilters.map(room => (
          <button
            key={room.id}
            onClick={() => toggleRoom(room.id)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
            style={{
              backgroundColor: room.visible ? room.color.bg : undefined,
              color: room.visible ? '#fff' : undefined,
              borderColor: room.color.bg,
              opacity: room.visible ? 1 : 0.5,
            }}
          >
            {room.name}
          </button>
        ))}
        <button
          onClick={() => setShowPending(!showPending)}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          style={{
            backgroundColor: showPending ? '#6b7280' : undefined,
            color: showPending ? '#fff' : undefined,
            borderColor: '#6b7280',
            opacity: showPending ? 1 : 0.5,
            borderStyle: 'dashed',
            borderWidth: '2px',
          }}
        >
          審核中
        </button>
      </div>

      {/* Calendar */}
      <div className="relative bg-background rounded-lg border p-4 shadow-sm fc-wrapper">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={zhTwLocale}
          displayEventTime={false}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          views={{
            dayGridMonth: {
              dayHeaderFormat: { weekday: 'short' },
            }
          }}
          buttonText={{
            today: '今天',
            month: '月',
            week: '週',
            day: '日',
          }}
          slotDuration="00:30:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
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
            weekday: 'narrow',
          }}
          allDaySlot={false}
          nowIndicator={true}
          selectable={false}
          events={calendarEvents}
          height="auto"
          contentHeight="auto"
          dayMaxEvents={3}
          weekends={true}
          firstDay={1}
          expandRows={true}
          stickyHeaderDates={true}
          eventDisplay="block"
        />
      </div>
    </div>
  )
}
