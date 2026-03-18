"use client"

import { useState } from "react"
import { Room } from "@/utils/supabase/queries"
import { BookingWidget } from "./booking-widget"
import { RoomTimetable } from "@/app/dashboard/book/room-timetable"
import { RoomDetailImage } from "./room-detail-image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Users, Layers, ArrowLeft } from "lucide-react"

type SpaceBookingClientProps = {
  room: Room
  isAdmin: boolean
}

export function SpaceBookingClient({ room, isAdmin }: SpaceBookingClientProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <div className="space-y-6">
            <Button variant="ghost" asChild className="pl-0">
                <Link href="/dashboard/spaces">
                    <ArrowLeft className="mr-2 h-4 w-4" /> 返回空間一覽
                </Link>
            </Button>

            <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
                    </div>
                </div>
            {/* Image & Basic Info */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <RoomDetailImage src={room.image_url} alt={room.name} />
            </div>
            
            <div>

                {/* Booking Widget */}
                <BookingWidget 
                    room={room} 
                    isAdmin={isAdmin}
                    selectedSlot={selectedSlot}
                    onChange={setSelectedSlot}
                />
            </div>

            <Separator className="my-4" />

                <h3 className="font-semibold mb-2">空間描述</h3>
                <div className="text-sm text-muted-foreground mb-6">
                     {room.description ? (
                        <p className="whitespace-pre-wrap">{room.description}</p>
                     ) : (
                         <p>尚未提供空間描述</p>
                     )}
                </div>
        </div>

        {/* Timetable */}
        <div className="space-y-4"> 
            <RoomTimetable 
                roomId={room.id} 
                onSelectSlot={setSelectedSlot}
                selectedSlot={selectedSlot}
            />
        </div>
      </div>
    </div>
  )
}
