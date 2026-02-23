"use client"

import { useState } from "react"
import { ApproverBookingList, type ApproverBookingItem } from "./approver-booking-list"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface ApproverReviewClientProps {
  initialData: ApproverBookingItem[]
}

export function ApproverReviewClient({ initialData }: ApproverReviewClientProps) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white hover:bg-gray-50 border-gray-300"
        >
          <RefreshCw
            className={`h-4 w-4 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={setShowCompleted}
          />
          <Label htmlFor="show-completed" className="text-sm whitespace-nowrap">
            顯示已處理
          </Label>
        </div>
      </div>
      <ApproverBookingList initialData={initialData} showCompleted={showCompleted} />
    </>
  )
}
