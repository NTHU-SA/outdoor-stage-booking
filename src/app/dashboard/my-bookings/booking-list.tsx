"use client"

import { useState } from "react"
import { Booking, Room } from "@/utils/supabase/queries"
import { SemesterSetting } from "@/utils/semester"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { toTaipeiTime } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CancelBookingButton } from "./cancel-button"
import { EditBookingDialog } from "./edit-booking-dialog"
import { Button } from "@/components/ui/button"
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface BookingListProps {
  bookings: Booking[]
  rooms: Room[]
  semesterSettings: SemesterSetting[]
}

type SortField = 'room' | 'time' | 'created_at' | null
type SortOrder = 'asc' | 'desc' | null

export function BookingList({ bookings, rooms, semesterSettings }: BookingListProps) {
  const [showHistory, setShowHistory] = useState(false)
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const filteredBookings = bookings.filter(booking => {
    if (showHistory) return true
    const endTime = new Date(booking.end_time)
    const now = new Date()
    return endTime >= now
  })

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

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortField || !sortOrder) return 0

    let comparison = 0
    switch (sortField) {
      case 'room':
        // Sort by room name
        comparison = (a.room.name || '').localeCompare(b.room.name || '', "zh-TW")
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />
    if (sortOrder === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />
    if (sortOrder === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />
    return <ArrowUpDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end space-x-2 py-2">
        <Switch
          id="show-history"
          checked={showHistory}
          onCheckedChange={setShowHistory}
        />
        <Label htmlFor="show-history">顯示歷史紀錄</Label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left w-[200px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('room')}>
                    空間
                    {getSortIcon('room')}
                </Button>
            </TableHead>
            <TableHead className="text-left w-[150px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('time')}>
                    日期
                    {getSortIcon('time')}
                </Button>
            </TableHead>
            <TableHead className="text-left w-[120px]">時段</TableHead>
            <TableHead>事由</TableHead>
            <TableHead className="text-left w-[100px]">狀態</TableHead>
            <TableHead className="text-left w-[140px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent font-medium justify-start" onClick={() => handleSort('created_at')}>
                    申請時間
                    {getSortIcon('created_at')}
                </Button>
            </TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                {showHistory ? "尚無預約紀錄" : "目前無有效預約，請開啟歷史紀錄查看過往預約"}
              </TableCell>
            </TableRow>
          ) : (
            sortedBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="max-w-[150px] truncate text-left" title={booking.room.name}>
                  {(() => {
                    const fullName = booking.room.name
                    return fullName.length > 20 ? `${fullName.slice(0, 20)}...` : fullName
                  })()}
                </TableCell>
                <TableCell className="text-left w-[150px]">
                  {format(toTaipeiTime(booking.start_time), "PPP", { locale: zhTW })}
                </TableCell>
                <TableCell className="text-left w-[120px]">
                  {format(toTaipeiTime(booking.start_time), "HH:mm")} -{" "}
                  {format(toTaipeiTime(booking.end_time), "HH:mm")}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={booking.purpose}>
                  {booking.purpose}
                </TableCell>
                <TableCell className="text-left">{getStatusBadge(booking.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm text-left">
                  {format(toTaipeiTime(booking.created_at), "yyyy/MM/dd HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <EditBookingDialog 
                          booking={booking} 
                          rooms={rooms}
                          semesterSettings={semesterSettings}
                        >
                          <Button variant="ghost" size="sm" className="h-8">
                            <Pencil className="h-4 w-4 mr-1" />
                            編輯
                          </Button>
                        </EditBookingDialog>
                        <CancelBookingButton bookingId={booking.id} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
