"use client"

import { useState, useEffect } from "react"
import { Room } from "@/utils/supabase/queries"
import { BookingForm } from "./booking-form"
import { RoomTimetable } from "./room-timetable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BookingViewProps = {
  rooms: Room[]
  initialRoomId?: string
}

export function BookingView({ rooms, initialRoomId }: BookingViewProps) {
  // Ensure initialRoomId exists in the rooms list, otherwise fallback to first room
  const defaultRoomId = (initialRoomId && rooms.some(r => r.id === initialRoomId)) 
    ? initialRoomId 
    : (rooms[0]?.id || "")

  const [selectedRoomId, setSelectedRoomId] = useState<string>(defaultRoomId)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering the complex form until mounted
  // Ideally we could fix the underlying ID generation issue, but this is a safe workaround
  // for client-heavy interactive components.
  if (!isMounted) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>填寫預約申請</CardTitle>
            <CardDescription>載入中...</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                載入表單中...
             </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>填寫預約申請</CardTitle>
          <CardDescription>
            請依規定填寫，一般使用者需於 3 天前提出申請。
            <br />
            點擊右側行事曆空白處可快速填入時間。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingForm 
            rooms={rooms} 
            selectedRoomId={selectedRoomId}
            onRoomChange={setSelectedRoomId}
            prefillSlot={selectedSlot}
          />
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h3 className="text-lg font-bold">{rooms.find(r => r.id === selectedRoomId)?.name} - 目前預約情形</h3>
                <RoomTimetable 
                    roomId={selectedRoomId} 
                    onSelectSlot={setSelectedSlot}
                    selectedSlot={selectedSlot}
                />
      </div>
    </div>
  )
}
