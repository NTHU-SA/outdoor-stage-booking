"use client"

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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ApproverActionButtons } from "./approver-action-buttons"
import { CheckCircle2, Circle, XCircle, SkipForward } from "lucide-react"
import type { ApproverBookingItem } from "./approver-booking-list"
import type { ApprovalStep } from "@/app/actions/admin-approvers"

interface ApproverDetailDialogProps {
  item: ApproverBookingItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionSuccess: (bookingId: string, action: 'approve' | 'reject') => void
}

export function ApproverDetailDialog({
  item,
  open,
  onOpenChange,
  onActionSuccess,
}: ApproverDetailDialogProps) {
  if (!item) return null

  const { booking, step, allSteps } = item

  const getStepIcon = (s: ApprovalStep) => {
    switch (s.status) {
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

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">已核准</Badge>
      case 'rejected':
        return <Badge variant="destructive">已拒絕</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">審核中</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>預約審核詳情</DialogTitle>
          <DialogDescription>
            查看完整的預約內容與審核進度
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">預約狀態</span>
            {getBookingStatusBadge(booking.status)}
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
                <div>
                  {booking.room.name}{" "}
                  {booking.room.room_code ? `(${booking.room.room_code})` : ""}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">借用時間</Label>
                <div>
                  {format(toTaipeiTime(booking.start_time), "yyyy/MM/dd (eee)", {
                    locale: zhTW,
                  })}
                  <br />
                  {format(toTaipeiTime(booking.start_time), "HH:mm")} -{" "}
                  {format(toTaipeiTime(booking.end_time), "HH:mm")}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">申請事由</Label>
                <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm whitespace-pre-wrap wrap-break-word max-h-[150px] overflow-y-auto">
                  {booking.purpose}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Approval Progress */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">審核進度</h4>
            <div className="space-y-2">
              {allSteps.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm ${
                    s.id === step.id ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                  }`}
                >
                  {getStepIcon(s)}
                  <div className="flex-1">
                    <div className="font-medium">
                      {s.label || `第 ${s.step_order} 階段`}
                      {s.approver?.full_name && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({s.approver.full_name})
                        </span>
                      )}
                    </div>
                    {s.decided_at && (
                      <div className="text-xs text-muted-foreground">
                        {format(toTaipeiTime(s.decided_at), "MM/dd HH:mm")}
                        {s.comment && ` — ${s.comment}`}
                      </div>
                    )}
                  </div>
                  {s.id === step.id && s.status === 'pending' && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                      您的任務
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-end pt-2">
            <ApproverActionButtons
              bookingId={booking.id}
              stepId={step.id}
              status={step.status}
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
