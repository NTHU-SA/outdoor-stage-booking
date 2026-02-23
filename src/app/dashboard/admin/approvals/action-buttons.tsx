"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteBooking } from "@/app/actions/admin-bookings"
import { adminForceApprove } from "@/app/actions/admin-approvers"

export function ActionButtons({ 
  bookingId, 
  status,
  hasMultiLevelApproval = false,
  onSuccess
}: { 
  bookingId: string
  status: string
  hasMultiLevelApproval?: boolean
  onSuccess?: (action: 'approve' | 'reject' | 'delete') => void
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isForceApproveDialogOpen, setIsForceApproveDialogOpen] = useState(false)

  const handleApprove = async () => {
    // If multi-level approval, show confirmation dialog
    if (hasMultiLevelApproval) {
      setIsForceApproveDialogOpen(true)
      return
    }
    await doApprove()
  }

  const doApprove = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: 'POST',
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || '操作失敗')
      }
      toast.success("已核准預約")
      setIsForceApproveDialogOpen(false)
      router.refresh()
      onSuccess?.('approve')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "核准失敗")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForceApprove = async () => {
    setIsLoading(true)
    try {
      await adminForceApprove(bookingId)
      toast.success("已直接核准預約（跳過多層級審核）")
      setIsForceApproveDialogOpen(false)
      router.refresh()
      onSuccess?.('approve')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "核准失敗")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      if (!response.ok) throw new Error('操作失敗')
      toast.success("已拒絕預約")
      setIsRejectDialogOpen(false)
      router.refresh()
      onSuccess?.('reject')
    } catch {
      toast.error("拒絕失敗")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteBooking(bookingId)
      toast.success("已刪除預約")
      setIsDeleteDialogOpen(false)
      router.refresh()
      onSuccess?.('delete')
    } catch {
      toast.error("刪除失敗")
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'pending') {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button 
        size="sm" 
        variant="default" 
        className="bg-green-600 hover:bg-green-700"
        onClick={handleApprove}
        disabled={isLoading}
      >
        核准
      </Button>

      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={isLoading}>
            拒絕
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒絕預約申請</AlertDialogTitle>
            <AlertDialogDescription>
              您可以填寫拒絕原因（選填），讓申請人知道原因。
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-2 py-4">
            <Label htmlFor="reason">拒絕原因</Label>
            <Textarea
              id="reason"
              placeholder="例如：該時段已有內部會議..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              確認拒絕
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force approve confirmation for multi-level */}
      <AlertDialog open={isForceApproveDialogOpen} onOpenChange={setIsForceApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要直接核准嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此空間設有多層級審核流程，目前尚有審核人未完成審核。
              <br />
              若您直接核准，將跳過所有尚未完成的審核階段。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              確認直接核准
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
  }

  if (status === 'approved' || status === 'rejected') {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isLoading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確定要刪除此預約紀錄？</AlertDialogTitle>
              <AlertDialogDescription>
                此動作無法復原。刪除後，此預約紀錄將會永久消失。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                確認刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return null
}

