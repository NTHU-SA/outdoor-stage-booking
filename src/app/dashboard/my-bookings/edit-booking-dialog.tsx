"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, AlertTriangle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Room } from "@/utils/supabase/queries"
import type { Booking } from "@/utils/supabase/queries"
import { RoomTimetable } from "@/app/dashboard/book/room-timetable"
import {
  getMaxBookableMonths,
  isDateWithin4Months
} from "@/utils/semester"
import { generateTimeSlots } from "@/app/dashboard/book/utils"

const bookingFormSchema = z.object({
  roomId: z.string({
    message: "請選擇空間",
  }),
  borrowingUnit: z.string().min(1, {
    message: "請輸入借用單位",
  }),
  startDate: z.date({
    message: "請選擇開始日期",
  }),
  endDate: z.date({
    message: "請選擇結束日期",
  }),
  startTime: z.string({
    message: "請選擇開始時間",
  }),
  endTime: z.string({
    message: "請選擇結束時間",
  }),
  purpose: z.string().min(5, {
    message: "事由至少需要 5 個字",
  }),
}).refine((data) => {
  const [startHour, startMinute] = data.startTime.split(':').map(Number)
  const [endHour, endMinute] = data.endTime.split(':').map(Number)

  const startDateTime = new Date(data.startDate)
  startDateTime.setHours(startHour, startMinute, 0, 0)

  const endDateTime = new Date(data.endDate)
  endDateTime.setHours(endHour, endMinute, 0, 0)

  return endDateTime > startDateTime
}, {
  message: "結束時間必須晚於開始時間",
  path: ["endDate"],
})

type EditBookingDialogProps = {
  booking: Booking
  rooms: Room[]
  children: React.ReactNode
}

export function EditBookingDialog({ booking, rooms, children }: EditBookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const router = useRouter()

  const hasSocket = booking.purpose.includes("\n(需要使用插座)")
  const initPurpose = booking.purpose.replace("\n(需要使用插座)", "")

  const [useSocket, setUseSocket] = useState(hasSocket)

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: booking.room_id || booking.room?.id || "",
      borrowingUnit: booking.borrowing_unit || "",
      startDate: new Date(booking.start_time),
      endDate: new Date(booking.end_time),
      startTime: format(new Date(booking.start_time), "HH:mm"),
      endTime: format(new Date(booking.end_time), "HH:mm"),
      purpose: initPurpose,
    },
  })

  const watchedStartDate = form.watch("startDate")

  // Update form when booking changes (though key prop in parent should handle this)
  useEffect(() => {
    const hasSocket = booking.purpose.includes("\n(需要使用插座)")
    const initPurpose = booking.purpose.replace("\n(需要使用插座)", "")
    setUseSocket(hasSocket)

    form.reset({
      roomId: booking.room_id || booking.room?.id || "",
      borrowingUnit: booking.borrowing_unit || "",
      startDate: new Date(booking.start_time),
      endDate: new Date(booking.end_time),
      startTime: format(new Date(booking.start_time), "HH:mm"),
      endTime: format(new Date(booking.end_time), "HH:mm"),
      purpose: initPurpose,
    })
  }, [booking, form])


  // Update selectedSlot when form values change
  const startDateVal = form.watch("startDate")
  const endDateVal = form.watch("endDate")
  const startTime = form.watch("startTime")
  const endTime = form.watch("endTime")

  useEffect(() => {
    if (startDateVal && endDateVal && startTime && endTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)

      const start = new Date(startDateVal)
      start.setHours(startHour, startMinute, 0, 0)

      const end = new Date(endDateVal)
      end.setHours(endHour, endMinute, 0, 0)

      setSelectedSlot({ start, end })
    }
  }, [startDateVal, endDateVal, startTime, endTime])

  // Handle slot selection from timetable
  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    form.setValue("startDate", slotInfo.start)
    form.setValue("endDate", slotInfo.end)
    form.setValue("startTime", format(slotInfo.start, "HH:mm"))
    form.setValue("endTime", format(slotInfo.end, "HH:mm"))
    setSelectedSlot(slotInfo)
  }

  // Check user role
  useEffect(() => {
    async function checkUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setIsAdmin(profile?.role === 'admin')
      }
    }
    checkUserRole()
  }, [])

  async function onSubmit(values: z.infer<typeof bookingFormSchema>) {
    setIsLoading(true)

    const startDateTime = new Date(values.startDate)
    const [startHour, startMinute] = values.startTime.split(':').map(Number)
    startDateTime.setHours(startHour, startMinute, 0, 0)

    const endDateTime = new Date(values.endDate)
    const [endHour, endMinute] = values.endTime.split(':').map(Number)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    // Check user role for 3-day advance rule
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 1)
      minDate.setHours(0, 0, 0, 0)

      if (startDateTime < minDate) {
        toast.error("須於借用日前 1 日提出申請")
        setIsLoading(false)
        return
      }

      const maxDate = new Date()
      maxDate.setDate(today.getDate() + 30)
      maxDate.setHours(23, 59, 59, 999)

      if (startDateTime > maxDate) {
        toast.error("最多僅能預約未來 30 天內的日期")
        setIsLoading(false)
        return
      }

      // Check duration does not exceed 4 hours
      const durationMs = endDateTime.getTime() - startDateTime.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)
      if (durationHours > 4) {
        toast.error("一日最多借用 4 小時")
        setIsLoading(false)
        return
      }

      // Check max-month limit
      const maxBookableMonths = getMaxBookableMonths()
      if (!isDateWithin4Months(startDateTime, maxBookableMonths)) {
        toast.error(`一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期`)
        setIsLoading(false)
        return
      }
    }

    // Check unavailable periods
    const selectedRoom = rooms.find(r => r.id === values.roomId)
    if (selectedRoom?.unavailable_periods && Array.isArray(selectedRoom.unavailable_periods)) {
      const bookingDay = startDateTime.getDay()
      const requestStartMins = startHour * 60 + startMinute
      const requestEndMins = endHour * 60 + endMinute

      for (const period of selectedRoom.unavailable_periods) {
        if (period.day === bookingDay) {
          const [pStartH, pStartM] = period.start.split(':').map(Number)
          const [pEndH, pEndM] = period.end.split(':').map(Number)
          const periodStartMins = pStartH * 60 + pStartM
          const periodEndMins = pEndH * 60 + pEndM

          if (Math.max(requestStartMins, periodStartMins) < Math.min(requestEndMins, periodEndMins)) {
            toast.error(`此空間 ${period.start}-${period.end} 不開放借用`)
            setIsLoading(false)
            return
          }
        }
      }
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: values.roomId,
          borrowingUnit: values.borrowingUnit,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          purpose: values.purpose.trim() + (useSocket ? "\n(需要使用插座)" : ""),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新失敗')
      }

      toast.success("預約已更新")
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate time slots based on admin role
  const timeSlots = generateTimeSlots(isAdmin)

  // Get current and next semester for display
  const maxBookableMonths = getMaxBookableMonths()

  // Get selected room's type to determine if semester lock applies
  const selectedRoomId = form.watch("roomId")
  const selectedRoom = rooms.find(r => r.id === selectedRoomId)

  // Previously checked if room is "Meeting" type. Since room types are removed, we default to false (enforce rules)
  const isMeetingRoom = false

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯預約</DialogTitle>
            <DialogDescription>
              修改預約資訊。請注意，修改後的預約需要重新審核。點擊右側行事曆空白處可快速填入時間。
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column: Form */}
                <div className="space-y-6">

                  <FormField
                    control={form.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>選擇空間</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="請選擇借用空間" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>開始日期</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-44 pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: zhTW })
                                  ) : (
                                    <span>選擇開始日期</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  if (!isAdmin && date < today) return true
                                  if (!isAdmin) {
                                    const minDate = new Date(today)
                                    minDate.setDate(today.getDate() + 1)
                                    if (date < minDate) return true
                                    const maxDate = new Date(today)
                                    maxDate.setDate(today.getDate() + 30)
                                    if (date > maxDate) return true
                                    if (!isDateWithin4Months(date, getMaxBookableMonths())) return true
                                  }
                                  return false
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>結束日期</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-44 pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: zhTW })
                                  ) : (
                                    <span>選擇結束日期</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  if (!isAdmin && date < today) return true
                                  if (!isAdmin) {
                                    const minDate = new Date(today)
                                    minDate.setDate(today.getDate() + 1)
                                    if (date < minDate) return true
                                    const maxDate = new Date(today)
                                    maxDate.setDate(today.getDate() + 30)
                                    if (date > maxDate) return true
                                    if (!isDateWithin4Months(date, getMaxBookableMonths())) return true
                                  }
                                  if (watchedStartDate) {
                                    const startDay = new Date(watchedStartDate)
                                    startDay.setHours(0, 0, 0, 0)
                                    if (date < startDay) return true
                                  }
                                  return false
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>開始時間</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="開始" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlots.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>結束時間</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="結束" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlots.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="borrowingUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>借用單位</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="請輸入借用單位（例：學生會活動部）"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>借用事由</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="請簡述借用目的、活動內容..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="use-socket-edit"
                        checked={useSocket}
                        onCheckedChange={(checked) => setUseSocket(checked === true)}
                      />
                      <Label htmlFor="use-socket-edit" className="text-sm font-semibold text-emerald-700 cursor-pointer">
                        需要使用插座
                      </Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                      >
                        取消
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        儲存變更
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Timetable */}
                <div className="space-y-4">
                  <div className="text-sm font-medium">
                    空間預約狀況 - {rooms.find(r => r.id === form.watch("roomId"))?.name || '選擇空間'}
                  </div>
                  {form.watch("roomId") ? (
                    <RoomTimetable
                      roomId={form.watch("roomId")}
                      onSelectSlot={handleSlotSelect}
                      selectedSlot={selectedSlot}
                      excludeBookingId={booking.id}
                      focusDate={form.watch("startDate")}
                      isAdmin={isAdmin}
                    />
                  ) : (
                    <div className="h-[600px] flex items-center justify-center text-muted-foreground border rounded-lg">
                      請先選擇空間
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}

