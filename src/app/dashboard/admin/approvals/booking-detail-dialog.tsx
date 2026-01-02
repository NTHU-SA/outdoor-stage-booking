import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { toTaipeiTime } from "@/lib/utils"
import { Booking } from "./booking-list"
import { ActionButtons } from "./action-buttons"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface BookingDetailDialogProps {
  booking: Booking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionSuccess: (id: string, action: 'approve' | 'reject' | 'delete') => void
}

export function BookingDetailDialog({ 
  booking, 
  open, 
  onOpenChange,
  onActionSuccess
}: BookingDetailDialogProps) {
  if (!booking) return null

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>預約詳細資訊</DialogTitle>
          <DialogDescription>
             查看完整的預約內容與處理狀態
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">狀態</span>
            {getStatusBadge(booking.status)}
          </div>
          
          <Separator />

          {/* User Info */}
          <div className="space-y-3">
             <h4 className="font-medium text-sm text-muted-foreground">申請人資訊</h4>
             <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                   <Label className="text-muted-foreground text-xs">姓名</Label>
                   <div>{booking.user.full_name}</div>
                </div>
                <div>
                   <Label className="text-muted-foreground text-xs">學號/員編</Label>
                   <div>{booking.user.student_id || '-'}</div>
                </div>
                <div className="col-span-2">
                   <Label className="text-muted-foreground text-xs">單位/系所</Label>
                   <div>{booking.user.department?.name || '-'}</div>
                </div>
             </div>
          </div>

          <Separator />

          {/* Booking Info */}
          <div className="space-y-3">
             <h4 className="font-medium text-sm text-muted-foreground">空間預約資訊</h4>
             <div className="grid gap-3 text-sm">
                <div>
                   <Label className="text-muted-foreground text-xs">借用空間</Label>
                   <div>{booking.room.name} {booking.room.room_code ? `(${booking.room.room_code})` : ''}</div>
                </div>
                <div>
                   <Label className="text-muted-foreground text-xs">借用時間</Label>
                   <div>
                     {format(toTaipeiTime(booking.start_time), "yyyy/MM/dd (eee)", { locale: zhTW })}
                     <br />
                     {format(toTaipeiTime(booking.start_time), "HH:mm")} - {format(toTaipeiTime(booking.end_time), "HH:mm")}
                   </div>
                </div>
                <div>
                    <Label className="text-muted-foreground text-xs">申請時間</Label>
                    <div>{format(toTaipeiTime(booking.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })}</div>
                </div>
                <div>
                   <Label className="text-muted-foreground text-xs">申請事由</Label>
                   <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm whitespace-pre-wrap break-words max-h-[150px] overflow-y-auto">
                      {booking.purpose}
                   </div>
                </div>
             </div>
          </div>

          <Separator />
          
          <div className="flex justify-end pt-2">
             <ActionButtons 
                bookingId={booking.id} 
                status={booking.status} 
                onSuccess={(action) => {
                    onActionSuccess(booking.id, action)
                    onOpenChange(false)
                }}
             />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

