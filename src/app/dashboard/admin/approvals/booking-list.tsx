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
import { toTaipeiTime, hasSocketUsage, stripSocketTag } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingDetailDialog } from "./booking-detail-dialog"



export type Booking = {
  id: string
  start_time: string
  end_time: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  borrowing_unit?: string | null
  purpose: string | null
  note?: string | null
  user: {
    full_name: string
    student_id: string | null
    email?: string
  }
  room: {
    name: string
  }
}

interface BookingListProps {
  initialBookings: Booking[]
  showHistory: boolean
}

type SortField = 'room' | 'time' | 'created_at' | null
type SortOrder = 'asc' | 'desc' | null

export function BookingList({ initialBookings, showHistory }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  useEffect(() => {
    setBookings(initialBookings)
  }, [initialBookings])

  const handleActionSuccess = (id: string, action: 'approve' | 'reject' | 'delete') => {
    if (action === 'delete') {
      setBookings(prev => prev.filter(b => b.id !== id))
    } else {
      // Update status for approve/reject without removing unless filtered out by page reload
      // Since the page might not reload immediately, we can optimistically update
      setBookings(prev => prev.map(b => {
        if (b.id === id) {
          return {
            ...b,
            status: action === 'approve' ? 'approved' : 'rejected'
          }
        }
        return b
      }))
    }
  }

  const getStatusBadge = (booking: Booking) => {
    const { status } = booking
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

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order: null -> asc -> desc -> null
      if (sortOrder === null) setSortOrder('asc')
      else if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortOrder(null)
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (showHistory) return true
    const endTime = new Date(booking.end_time)
    const now = new Date()
    return endTime >= now
  })

  // Apply sorting
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    // Default sort: pending first, then by start_time descending
    if (!sortField || !sortOrder) {
      // First, sort by status: pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1

      // If same status, sort by start_time descending (near time first)
      const timeA = new Date(a.start_time).getTime()
      const timeB = new Date(b.start_time).getTime()
      return timeA - timeB   // Descending order (near time first)
    }

    let comparison = 0
    switch (sortField) {
      case 'room':
        const nameA = a.room.name || ''
        const nameB = b.room.name || ''
        comparison = nameA.localeCompare(nameB, "zh-TW")
        break
      case 'time':
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />
    if (sortOrder === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />
    if (sortOrder === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />
    return <ArrowUpDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>申請人</TableHead>
            <TableHead className="text-left w-[200px]">
              <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('room')}>
                空間
                {getSortIcon('room')}
              </Button>
            </TableHead>
            <TableHead className="text-left w-[150px]">
              <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('time')}>

                時間
                {getSortIcon('time')}
              </Button>
            </TableHead>
            <TableHead className="w-[140px]">借用單位</TableHead>
            <TableHead className="w-[200px]">事由</TableHead>
            <TableHead className="w-[180px]">備註</TableHead>
            <TableHead className="text-left w-[140px]">
              <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('created_at')}>
                申請時間
                {getSortIcon('created_at')}
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">狀態</TableHead>
            <TableHead className="text-right w-[140px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                {showHistory ? "目前沒有符合條件的預約" : "目前無有效預約，請開啟歷史紀錄查看過往預約"}
              </TableCell>
            </TableRow>
          ) : (
            sortedBookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedBooking(booking)}
              >
                <TableCell>
                  <div className="font-medium">{booking.user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{booking.user.student_id}</div>
                </TableCell>
                <TableCell className="max-w-[250px] truncate text-left" title={booking.room.name}>
                  {(() => {
                    const fullName = booking.room.name
                    return fullName.length > 12 ? `${fullName.slice(0, 12)}...` : fullName
                  })()}
                </TableCell>
                <TableCell className="text-left">
                  <div className="font-medium">
                    {format(toTaipeiTime(booking.start_time), "MM/dd", { locale: zhTW })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(toTaipeiTime(booking.start_time), "HH:mm")} - {format(toTaipeiTime(booking.end_time), "HH:mm")}
                  </div>
                </TableCell>
                <TableCell className="max-w-[140px] truncate" title={booking.borrowing_unit || ''}>
                  {booking.borrowing_unit || '-'}
                </TableCell>
                <TableCell className="max-w-[200px]" title={stripSocketTag(booking.purpose)}>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{stripSocketTag(booking.purpose)}</span>
                    {hasSocketUsage(booking.purpose) && (
                      <span title="需要使用插座" className="shrink-0">
                        <Plug className="h-3.5 w-3.5 text-emerald-600" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] truncate" title={booking.note || ''}>
                  {booking.note?.trim() || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground text-left">
                  {format(toTaipeiTime(booking.created_at), "MM/dd HH:mm")}
                </TableCell>
                <TableCell className="w-[100px]">
                  {getStatusBadge(booking)}
                </TableCell>
                <TableCell className="text-right w-[140px] pl-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionButtons
                      bookingId={booking.id}
                      status={booking.status}
                      onSuccess={(action) => handleActionSuccess(booking.id, action)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <BookingDetailDialog
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  )
}
