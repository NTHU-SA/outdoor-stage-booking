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

export function ActionButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('操作失敗')
      toast.success("已核准預約")
      router.refresh()
    } catch {
      toast.error("核准失敗")
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
    } catch {
      toast.error("拒絕失敗")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
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
    </div>
  )
}

