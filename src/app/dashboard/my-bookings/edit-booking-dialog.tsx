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
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Room } from "@/utils/supabase/queries"
import type { Booking } from "@/utils/supabase/queries"
import type { SemesterSetting } from "@/utils/semester"
import { RoomTimetable } from "@/app/dashboard/book/room-timetable"
import { 
  isDateWithin4Months, 
  isDateInLockedPeriod, 
  getCurrentSemester,
  getNextSemester,
  isSameDay,
  isDateInSemester
} from "@/utils/semester"

const bookingFormSchema = z.object({
  roomId: z.string({
    message: "請選擇空間",
  }),
  date: z.date({
    message: "請選擇日期",
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
  return data.endTime > data.startTime
}, {
  message: "結束時間必須晚於開始時間",
  path: ["endTime"],
})

type EditBookingDialogProps = {
  booking: Booking
  rooms: Room[]
  semesterSettings?: SemesterSetting[]
  children: React.ReactNode
}

export function EditBookingDialog({ booking, rooms, semesterSettings = [], children }: EditBookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [semesters, setSemesters] = useState<SemesterSetting[]>(semesterSettings)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const router = useRouter()

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: booking.room_id || booking.room?.id || "",
      date: new Date(booking.start_time),
      startTime: format(new Date(booking.start_time), "HH:mm"),
      endTime: format(new Date(booking.end_time), "HH:mm"),
      purpose: booking.purpose,
    },
  })

  // Update form when booking changes (though key prop in parent should handle this)
  useEffect(() => {
    form.reset({
      roomId: booking.room_id || booking.room?.id || "",
      date: new Date(booking.start_time),
      startTime: format(new Date(booking.start_time), "HH:mm"),
      endTime: format(new Date(booking.end_time), "HH:mm"),
      purpose: booking.purpose,
    })
  }, [booking, form])


  // Update selectedSlot when form values change
  const date = form.watch("date")
  const startTime = form.watch("startTime")
  const endTime = form.watch("endTime")
  
  useEffect(() => {
    if (date && startTime && endTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      
      const start = new Date(date)
      start.setHours(startHour, startMinute, 0, 0)
      
      const end = new Date(date)
      end.setHours(endHour, endMinute, 0, 0)
      
      setSelectedSlot({ start, end })
    }
  }, [date, startTime, endTime])

  // Handle slot selection from timetable
  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    form.setValue("date", slotInfo.start)
    form.setValue("startTime", format(slotInfo.start, "HH:mm"))
    form.setValue("endTime", format(slotInfo.end, "HH:mm"))
    setSelectedSlot(slotInfo)
  }

  // Check user role and fetch semesters
  useEffect(() => {
    async function checkUserRoleAndFetchSemesters() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(profile?.role === 'admin')
        
        if (semesterSettings.length === 0) {
          const { data: semesterData } = await supabase
            .from('semester_settings')
            .select('*')
            .order('start_date', { ascending: true })
          
          if (semesterData) {
            setSemesters(semesterData)
          }
        }
      }
    }
    checkUserRoleAndFetchSemesters()
  }, [semesterSettings.length])

  async function onSubmit(values: z.infer<typeof bookingFormSchema>) {
    setIsLoading(true)
    
    const startDateTime = new Date(values.date)
    const [startHour, startMinute] = values.startTime.split(':').map(Number)
    startDateTime.setHours(startHour, startMinute, 0, 0)
    
    const endDateTime = new Date(values.date)
    const [endHour, endMinute] = values.endTime.split(':').map(Number)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    // Check that start and end are on the same day
    if (!isSameDay(startDateTime, endDateTime)) {
      toast.error("每次預約僅能借用單日，不能跨日連續借用")
      setIsLoading(false)
      return
    }

    // Check user role for 7-day rule
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 7)
      minDate.setHours(0, 0, 0, 0)
      
      if (startDateTime < minDate) {
        toast.error("一般使用者需於 7 天前申請")
        setIsLoading(false)
        return
      }
      
      // Check 4-month limit
      if (!isDateWithin4Months(startDateTime)) {
        toast.error("一般使用者僅能借用未來 4 個月內的日期")
        setIsLoading(false)
        return
      }
      
      // Check semester lock (skip for Meeting rooms)
      const roomToBook = rooms.find(r => r.id === values.roomId)
      const isBookingMeetingRoom = roomToBook?.room_type === "Meeting"
      if (!isBookingMeetingRoom && isDateInLockedPeriod(startDateTime, semesters, false)) {
        toast.error("下學期課表尚未確認，暫不開放預約")
        setIsLoading(false)
        return
      }
    }

    // Check unavailable periods
    const selectedRoom = rooms.find(r => r.id === values.roomId)
    if (selectedRoom?.unavailable_periods && Array.isArray(selectedRoom.unavailable_periods)) {
      // Check if the booking date falls within any semester
      const isInSemester = semesters.some(semester => isDateInSemester(startDateTime, semester))

      if (isInSemester) {
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
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: values.roomId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          purpose: values.purpose,
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

  // Generate 30-minute interval time slots from 08:00 to 22:00
  const timeSlots = Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  // Get current and next semester for display
  const currentSemester = getCurrentSemester(semesters)
  const nextSemester = getNextSemester(semesters, currentSemester)
  const isNextSemesterLocked = nextSemester && !nextSemester.is_next_semester_open

  // Get selected room's type to determine if semester lock applies
  const selectedRoomId = form.watch("roomId")
  const selectedRoom = rooms.find(r => r.id === selectedRoomId)
  const isMeetingRoom = selectedRoom?.room_type === "Meeting"

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
            {/* Warning banner for locked semester - not shown for Meeting rooms */}
            {!isAdmin && isNextSemesterLocked && !isMeetingRoom && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      下學期課表尚未確認
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                      {nextSemester.semester_name} ({format(new Date(nextSemester.start_date), 'MM/dd')} - {format(new Date(nextSemester.end_date), 'MM/dd')}) 暫不開放預約，請等待管理員開放。
                    </p>
                  </div>
                </div>
              </div>
            )}
            

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
                          {room.room_code} - {room.name} {room.capacity && `(${room.capacity}人)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {rooms.find(r => r.id === field.value)?.room_code} {rooms.find(r => r.id === field.value)?.room_type && `(${rooms.find(r => r.id === field.value)?.room_type})`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>日期</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-60 pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: zhTW })
                          ) : (
                            <span>選擇日期</span>
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
                          
                          if (date < today) return true

                          if (!isAdmin) {
                             const minDate = new Date(today)
                             minDate.setDate(today.getDate() + 7)
                             if (date < minDate) return true
                             
                             if (!isDateWithin4Months(date)) return true
                             
                             // Semester lock (skip for Meeting rooms)
                             if (!isMeetingRoom && isDateInLockedPeriod(date, semesters, false)) return true
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

            <div className="flex justify-end gap-2 pt-4">
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
                    focusDate={form.watch("date")}
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

