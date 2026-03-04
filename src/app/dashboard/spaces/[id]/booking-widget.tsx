"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { Room } from "@/utils/supabase/queries"
import type { SemesterSetting } from "@/utils/semester"
import { validateBookingRules, generateTimeSlots } from "@/app/dashboard/book/utils"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  getMaxBookableMonths,
  isDateWithin4Months, 
  isDateInLockedPeriod 
} from "@/utils/semester"
import { useUser } from "@/hooks/use-user"

type BookingWidgetProps = {
  room: Room
  semesters: SemesterSetting[]
  isAdmin: boolean
  selectedSlot: { start: Date; end: Date } | null
  onChange: (slot: { start: Date; end: Date } | null) => void
}

export function BookingWidget({ room, semesters, isAdmin, selectedSlot, onChange }: BookingWidgetProps) {
  const router = useRouter()
  const { user, loading } = useUser() // Check loading state to ensure auth is checked
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [borrowingUnit, setBorrowingUnit] = useState("")
  const [rememberBorrowingUnit, setRememberBorrowingUnit] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getDefaultBorrowingUnitKey = (userId: string | null | undefined) => `defaultBorrowingUnit:${userId ?? 'guest'}`

  // Restore booking data from localStorage if available and user is logged in
  useEffect(() => {
    if (loading) return // Wait for auth check

    const savedBorrowingUnit = localStorage.getItem(getDefaultBorrowingUnitKey(user?.id))
    if (savedBorrowingUnit) {
      setBorrowingUnit(savedBorrowingUnit)
    }

    const storedBooking = localStorage.getItem(`pendingBooking_${room.id}`)
    if (storedBooking) {
        try {
            const { start, end, purpose: storedPurpose, borrowingUnit: storedBorrowingUnit } = JSON.parse(storedBooking)
            const startDate = new Date(start)
            const endDate = new Date(end)
            
            // Only restore if dates are valid
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                onChange({ start: startDate, end: endDate })
                if (storedBorrowingUnit) setBorrowingUnit(storedBorrowingUnit)
                if (storedPurpose) setPurpose(storedPurpose)
                
                // If user is logged in, open the dialog automatically to continue
                // If not logged in, just filling the form is enough (they will hit reserve again)
                if (user) {
                     setIsDialogOpen(true)
                     // Clear storage after successfully restoring
                     localStorage.removeItem(`pendingBooking_${room.id}`)
                }
            }
        } catch (e) {
            console.error("Failed to parse stored booking", e)
            localStorage.removeItem(`pendingBooking_${room.id}`)
        }
    }
  }, [user, loading, room.id, onChange])

  const handleReserveClick = () => {
    // Removed user check here to allow guests to click reserve and enter details
    if (!selectedSlot) {
      toast.error("請先選擇預約時間")
      return
    }

    const validation = validateBookingRules(
      selectedSlot.start,
      selectedSlot.end,
      room.id,
      [room], 
      semesters,
      isAdmin
    )

    if (!validation.isValid) {
      toast.error(validation.message)
      return
    }

    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    // Check auth here instead
    if (!user) {
        // Save state to localStorage
        if (selectedSlot) {
            const bookingData = {
                start: selectedSlot.start.toISOString(),
                end: selectedSlot.end.toISOString(),
              borrowingUnit,
                purpose
            }
            localStorage.setItem(`pendingBooking_${room.id}`, JSON.stringify(bookingData))
        }
        
        toast.error("請先登入以完成預約")
        // Redirect to login with return path
        // Use window.location.pathname to get current path including id
        const returnUrl = window.location.pathname
        router.push(`/login?next=${encodeURIComponent(returnUrl)}`)
        return
    }

    if (!selectedSlot) return
    if (borrowingUnit.trim().length < 1) {
      toast.error("請輸入借用單位")
      return
    }
    if (purpose.trim().length < 5) {
      toast.error("事由至少需要 5 個字")
      return
    }

    if (rememberBorrowingUnit && borrowingUnit.trim()) {
      localStorage.setItem(getDefaultBorrowingUnitKey(user?.id), borrowingUnit.trim())
    }

    setIsSubmitting(true)
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                roomId: room.id,
              borrowingUnit,
                startTime: selectedSlot.start.toISOString(),
                endTime: selectedSlot.end.toISOString(),
                purpose: purpose,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '預約失敗')
        }

        toast.success("預約申請已送出")
        setIsDialogOpen(false)
        setBorrowingUnit("")
        setPurpose("")
        onChange(null) 
        // Clear any stored booking data just in case
        localStorage.removeItem(`pendingBooking_${room.id}`)
        router.push('/dashboard/my-bookings')
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '預約失敗'
        toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeSlots = generateTimeSlots()

  // Helper to handle time changes
  const updateTime = (type: 'start' | 'end', timeStr: string) => {
    if (!selectedSlot) return

    const [hours, minutes] = timeStr.split(':').map(Number)
    if (type === 'start') {
        const newDate = new Date(selectedSlot.start)
        newDate.setHours(hours, minutes, 0, 0)

        // If new start is after current end, push end forward by 30 mins
        if (newDate >= selectedSlot.end) {
             const newEnd = new Date(newDate.getTime() + 1800000) // +30 mins
             onChange({ start: newDate, end: newEnd })
        } else {
             onChange({ ...selectedSlot, start: newDate })
        }
    } else {
        // Keep end date, only update time
        const newEndDate = new Date(selectedSlot.end)
        newEndDate.setHours(hours, minutes, 0, 0)

        if (newEndDate <= selectedSlot.start) {
          toast.error("結束時間必須晚於開始時間")
          return
        }
        
        onChange({ ...selectedSlot, end: newEndDate })
    }
  }
  
  const handleStartDateSelect = (date: Date | undefined) => {
      if (!date) return

      // If we already have a slot, keep the time but update the date
      if (selectedSlot) {
          const newStart = new Date(date)
          newStart.setHours(selectedSlot.start.getHours(), selectedSlot.start.getMinutes(), 0, 0)

          const newEnd = new Date(selectedSlot.end)
          
          if (newStart >= newEnd) {
            const adjustedEnd = new Date(newStart.getTime() + 1800000)
            onChange({ start: newStart, end: adjustedEnd })
          } else {
            onChange({ start: newStart, end: newEnd })
          }
      } else {
          // If no slot selected, default to 08:00 - 09:00 on the selected date
          const newStart = new Date(date)
          newStart.setHours(8, 0, 0, 0)

          const newEnd = new Date(date)
          newEnd.setHours(9, 0, 0, 0)

          onChange({ start: newStart, end: newEnd })
      }
  }

  const handleEndDateSelect = (date: Date | undefined) => {
      if (!date) return

      if (selectedSlot) {
          const newEnd = new Date(date)
          newEnd.setHours(selectedSlot.end.getHours(), selectedSlot.end.getMinutes(), 0, 0)

          if (newEnd <= selectedSlot.start) {
            toast.error("結束日期時間必須晚於開始日期時間")
            return
          }

          onChange({ ...selectedSlot, end: newEnd })
      } else {
          // If no slot selected yet, create a default slot ending on selected date
          const newStart = new Date(date)
          newStart.setHours(8, 0, 0, 0)

          const newEnd = new Date(date)
          newEnd.setHours(9, 0, 0, 0)

          onChange({ start: newStart, end: newEnd })
      }
  }

  // Get current start/end time strings
  const startTimeStr = selectedSlot 
    ? format(selectedSlot.start, "HH:mm")
    : ""
  const endTimeStr = selectedSlot
    ? format(selectedSlot.end, "HH:mm")
    : ""
  const maxBookableMonths = getMaxBookableMonths(semesters)

  const isMeetingRoom = false

  return (
    <>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden sticky top-4">
        <div className="p-6 flex flex-col gap-4">

            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
             {/* Date Section */}
             <div className="grid grid-cols-2 border-b border-neutral-200 dark:border-neutral-800">
              <div className="p-3 border-r border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">開始日期</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start p-0 h-auto font-medium hover:bg-transparent text-left",
                        !selectedSlot && "text-muted-foreground"
                      )}
                    >
                      {selectedSlot ? (
                        format(selectedSlot.start, "yyyy 年 M 月 d 日")
                      ) : (
                        <span>選擇日期</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedSlot?.start}
                      onSelect={handleStartDateSelect}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        // Always disable past dates
                        if (date < today) return true

                        // If user is NOT admin, apply additional restrictions
                        if (!isAdmin) {
                          // 3-day rule
                          const minDate = new Date(today)
                          minDate.setDate(today.getDate() + 3)
                          if (date < minDate) return true

                          // Max-month limit
                          if (!isDateWithin4Months(date, maxBookableMonths)) return true

                          // Semester lock (rules apply to all rooms now)
                          if (isDateInLockedPeriod(date, semesters, false)) return true
                        }

                        return false
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">結束日期</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start p-0 h-auto font-medium hover:bg-transparent text-left",
                        !selectedSlot && "text-muted-foreground"
                      )}
                      disabled={!selectedSlot}
                    >
                      {selectedSlot ? (
                        format(selectedSlot.end, "yyyy 年 M 月 d 日")
                      ) : (
                        <span>選擇日期</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedSlot?.end}
                      onSelect={handleEndDateSelect}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        if (date < today) return true

                        if (!isAdmin) {
                          const minDate = new Date(today)
                          minDate.setDate(today.getDate() + 3)
                          if (date < minDate) return true
                          if (!isDateWithin4Months(date, maxBookableMonths)) return true
                          if (isDateInLockedPeriod(date, semesters, false)) return true
                        }

                        if (selectedSlot) {
                        const minEndDate = new Date(selectedSlot.start)
                        minEndDate.setHours(0, 0, 0, 0)
                        if (date < minEndDate) return true
                        }

                        return false
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
             </div>
             
             {/* Time Section */}
             <div className="grid grid-cols-2">
                <div className="p-3 border-r border-neutral-200 dark:border-neutral-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">開始</div>
                    <Select 
                        value={startTimeStr} 
                        onValueChange={(v) => updateTime('start', v)}
                        disabled={!selectedSlot}
                    >
                        <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0 shadow-none">
                            <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                            {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">結束</div>
                     <Select 
                        value={endTimeStr} 
                        onValueChange={(v) => updateTime('end', v)}
                        disabled={!selectedSlot}
                    >
                        <SelectTrigger className="border-0 p-0 h-auto font-medium focus:ring-0 shadow-none">
                            <SelectValue placeholder="--" />
                        </SelectTrigger>
                        <SelectContent>
                            {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
          </div>
          
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg h-12 font-semibold"
            onClick={handleReserveClick}
            disabled={!selectedSlot}
          >
            預約
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認預約資訊</DialogTitle>
            <DialogDescription>
              {room.name} <br/>
              {selectedSlot && format(selectedSlot.start, "yyyy/MM/dd HH:mm")} - {selectedSlot && format(selectedSlot.end, "yyyy/MM/dd HH:mm")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="borrowing-unit">借用單位</Label>
              <Input
                id="borrowing-unit"
                placeholder="例如：學生會活動部"
                value={borrowingUnit}
                onChange={(e) => setBorrowingUnit(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-borrowing-unit-widget"
                checked={rememberBorrowingUnit}
                onCheckedChange={(checked) => setRememberBorrowingUnit(checked === true)}
              />
              <Label htmlFor="remember-borrowing-unit-widget" className="text-sm font-normal text-muted-foreground cursor-pointer">
                設為默認借用單位（下次自動帶入）
              </Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purpose">借用事由</Label>
              <Textarea
                id="purpose"
                placeholder="請簡述借用目的、活動內容..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>取消</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "提交中..." : "確認預約"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
