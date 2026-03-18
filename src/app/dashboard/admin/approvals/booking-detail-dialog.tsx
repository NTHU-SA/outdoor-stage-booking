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
import { toTaipeiTime, hasSocketUsage, stripSocketTag } from "@/lib/utils"
import { Booking } from "./booking-list"
import { ActionButtons } from "./action-buttons"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Circle, XCircle, SkipForward, Plug } from "lucide-react"

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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />
      default:
        return <Circle className="h-4 w-4 text-yellow-500" />
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
                <Label className="text-muted-foreground text-xs">電子郵件</Label>
                <div className="truncate" title={booking.user.email}>{booking.user.email || '-'}</div>
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
                <div>{booking.room.name}</div>
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
                <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm whitespace-pre-wrap wrap-break-word max-h-[150px] overflow-y-auto">
                  {stripSocketTag(booking.purpose)}
                </div>
                {hasSocketUsage(booking.purpose) && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-700 font-medium">
                    <Plug className="h-4 w-4" />
                    需要使用插座
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Approval Steps */}
          {booking.has_multi_level_approval && booking.approval_steps && booking.approval_steps.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">審核進度</h4>
                <div className="space-y-2">
                  {booking.approval_steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 p-2 rounded-md text-sm bg-muted/30"
                    >
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <div className="font-medium">
                          {step.label || `第 ${step.step_order} 階段`}
                          {step.approver?.full_name && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({step.approver.full_name})
                            </span>
                          )}
                        </div>
                        {step.decided_at && (
                          <div className="text-xs text-muted-foreground">
                            {format(toTaipeiTime(step.decided_at), "MM/dd HH:mm")}
                            {step.comment && ` — ${step.comment}`}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          step.status === 'approved' ? 'default' :
                            step.status === 'rejected' ? 'destructive' :
                              step.status === 'skipped' ? 'outline' : 'secondary'
                        }
                        className={`text-xs ${step.status === 'approved' ? 'bg-green-600' :
                          step.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}
                      >
                        {step.status === 'approved' ? '已核准' :
                          step.status === 'rejected' ? '已拒絕' :
                            step.status === 'skipped' ? '已跳過' : '待審核'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-end pt-2">
            <ActionButtons
              bookingId={booking.id}
              status={booking.status}
              hasMultiLevelApproval={booking.has_multi_level_approval}
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

