"use client"

import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ActionButtons } from "./action-buttons"
import { useState, useEffect } from "react"

export type Booking = {
  id: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  purpose: string | null
  user: {
    full_name: string
    student_id: string | null
    department: {
      name: string
    } | null
  }
  room: {
    name: string
    room_code: string | null
  }
}

interface BookingListProps {
  initialBookings: Booking[]
}

export function BookingList({ initialBookings }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings)

  useEffect(() => {
    setBookings(initialBookings)
  }, [initialBookings])

  const handleActionSuccess = (id: string, action: 'approve' | 'reject' | 'delete') => {
    if (action === 'delete') {
      setBookings(prev => prev.filter(b => b.id !== id))
    }
    // For approve/reject, router.refresh() in ActionButtons will trigger a re-render
    // causing useEffect to update the list with new statuses
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">已核准</Badge>
      case 'rejected':
        return <Badge variant="destructive">已拒絕</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">待審核</Badge>
      case 'cancelled':
      case 'cancelled_by_user':
        return <Badge variant="outline" className="text-muted-foreground">已取消</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>申請人</TableHead>
          <TableHead>單位/系所</TableHead>
          <TableHead>空間代碼</TableHead>
          <TableHead>空間</TableHead>
          <TableHead>時間</TableHead>
          <TableHead className="w-[300px]">事由</TableHead>
          <TableHead className="w-[100px]">狀態</TableHead>
          <TableHead className="text-right w-[140px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
              目前沒有符合條件的預約
            </TableCell>
          </TableRow>
        ) : (
          bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div className="font-medium">{booking.user.full_name}</div>
                <div className="text-xs text-muted-foreground">{booking.user.student_id}</div>
              </TableCell>
              <TableCell>{booking.user.department?.name || '-'}</TableCell>
              <TableCell className="font-medium">{booking.room.room_code || '-'}</TableCell>
              <TableCell>{booking.room.name}</TableCell>
              <TableCell>
                <div className="font-medium">
                  {format(new Date(booking.start_time), "MM/dd", { locale: zhTW })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                </div>
              </TableCell>
              <TableCell className="max-w-[300px] truncate" title={booking.purpose || ''}>
                {booking.purpose}
              </TableCell>
              <TableCell className="w-[100px]">
                {getStatusBadge(booking.status)}
              </TableCell>
              <TableCell className="text-right w-[140px] pl-2">
                <ActionButtons 
                  bookingId={booking.id} 
                  status={booking.status}
                  onSuccess={(action) => handleActionSuccess(booking.id, action)}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

