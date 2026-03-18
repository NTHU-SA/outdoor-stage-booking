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
import { useState } from "react"
import { toTaipeiTime, hasSocketUsage, stripSocketTag } from "@/lib/utils"
import { ApproverActionButtons } from "./approver-action-buttons"
import { ApproverDetailDialog } from "./approver-detail-dialog"
import type { ApprovalStep } from "@/app/actions/admin-approvers"
import { Plug } from "lucide-react"

export type ApproverBookingItem = {
  booking: {
    id: string
    start_time: string
    end_time: string
    status: string
    purpose: string | null
    created_at: string
    room: { name: string }
    user: {
      full_name: string
      student_id: string | null
    }
  }
  step: ApprovalStep
  allSteps: ApprovalStep[]
}

interface ApproverBookingListProps {
  initialData: ApproverBookingItem[]
  showCompleted: boolean
}

export function ApproverBookingList({ initialData, showCompleted }: ApproverBookingListProps) {
  const [data, setData] = useState(initialData)
  const [selectedItem, setSelectedItem] = useState<ApproverBookingItem | null>(null)

  const filteredData = data.filter(item => {
    if (showCompleted) return true
    return item.step.status === 'pending'
  })

  const handleActionSuccess = (bookingId: string, action: 'approve' | 'reject') => {
    setData(prev =>
      prev.map(item => {
        if (item.booking.id === bookingId) {
          return {
            ...item,
            step: {
              ...item.step,
              status: action === 'approve' ? 'approved' : 'rejected',
              decided_at: new Date().toISOString(),
            },
            booking: {
              ...item.booking,
              status: action === 'reject' ? 'rejected' : item.booking.status,
            },
          }
        }
        return item
      })
    )
  }

  const getStepStatusBadge = (step: ApprovalStep) => {
    switch (step.status) {
      case 'approved':
        return <Badge className="bg-green-600">已核准</Badge>
      case 'rejected':
        return <Badge variant="destructive">已拒絕</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">待您審核</Badge>
      case 'skipped':
        return <Badge variant="outline" className="text-muted-foreground">已跳過</Badge>
      default:
        return <Badge variant="outline">{step.status}</Badge>
    }
  }

  const getApprovalProgress = (allSteps: ApprovalStep[]) => {
    const approved = allSteps.filter(s => s.status === 'approved' || s.status === 'skipped').length
    return `${approved}/${allSteps.length}`
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>申請人</TableHead>
            <TableHead>空間</TableHead>
            <TableHead>時間</TableHead>
            <TableHead>事由</TableHead>
            <TableHead>審核進度</TableHead>
            <TableHead>您的狀態</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                {showCompleted ? "目前沒有多階層審核任務" : "目前沒有待審核的任務"}
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow
                key={`${item.booking.id}-${item.step.id}`}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <TableCell>
                  <div className="font-medium">{item.booking.user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{item.booking.user.student_id}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{(() => {
                    const fullName = item.booking.room.name
                    return fullName.length > 12 ? `${fullName.slice(0, 12)}...` : fullName
                  })()}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {format(toTaipeiTime(item.booking.start_time), "MM/dd", { locale: zhTW })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(toTaipeiTime(item.booking.start_time), "HH:mm")} -{" "}
                    {format(toTaipeiTime(item.booking.end_time), "HH:mm")}
                  </div>
                </TableCell>
                <TableCell className="max-w-[150px]" title={stripSocketTag(item.booking.purpose)}>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{stripSocketTag(item.booking.purpose)}</span>
                    {hasSocketUsage(item.booking.purpose) && (
                      <span title="需要使用插座" className="shrink-0">
                        <Plug className="h-3.5 w-3.5 text-emerald-600" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {getApprovalProgress(item.allSteps)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.step.label || `第 ${item.step.step_order} 階`}
                  </div>
                </TableCell>
                <TableCell>{getStepStatusBadge(item.step)}</TableCell>
                <TableCell className="text-right">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ApproverActionButtons
                      bookingId={item.booking.id}
                      stepId={item.step.id}
                      status={item.step.status}
                      onSuccess={(action) => handleActionSuccess(item.booking.id, action)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ApproverDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onActionSuccess={handleActionSuccess}
      />
    </div>
  )
}
