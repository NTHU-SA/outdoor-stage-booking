"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

import { Button } from "@/components/ui/button"
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
import { useEffect, useState } from "react"
import type { SemesterSetting } from "@/utils/semester"
import { 
  isDateWithin4Months, 
  isDateInLockedPeriod, 
  getMaxBookableDate,
  getCurrentSemester,
  getNextSemester,
  isSameDay
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

type BookingFormProps = {
  rooms: Room[]
  selectedRoomId?: string
  onRoomChange?: (roomId: string) => void
  prefillSlot?: { start: Date; end: Date } | null
  semesterSettings?: SemesterSetting[]
}

export function BookingForm({ rooms, selectedRoomId, onRoomChange, prefillSlot, semesterSettings = [] }: BookingFormProps) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [semesters, setSemesters] = useState<SemesterSetting[]>(semesterSettings)
  
  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      purpose: "",
      roomId: selectedRoomId || "",
    },
  })

  // Sync form roomId with prop change
  useEffect(() => {
    if (selectedRoomId) {
        form.setValue("roomId", selectedRoomId)
    }
  }, [selectedRoomId, form])

  // Sync form date/time with prefillSlot
  useEffect(() => {
    if (prefillSlot) {
        form.setValue("date", prefillSlot.start)
        
        const startHour = prefillSlot.start.getHours()
        const startMinute = prefillSlot.start.getMinutes()
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
        form.setValue("startTime", startTime)

        const endHour = prefillSlot.end.getHours()
        const endMinute = prefillSlot.end.getMinutes()
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        form.setValue("endTime", endTime)
    }
  }, [prefillSlot, form])

  useEffect(() => {
    const checkUserRoleAndFetchSemesters = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'admin') {
          setIsAdmin(true)
        }
      }
      
      // Fetch semester settings if not provided as props
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
    checkUserRoleAndFetchSemesters()
  }, [semesterSettings.length])

  async function onSubmit(values: z.infer<typeof bookingFormSchema>) {
    const startDateTime = new Date(values.date)
    const [startHour, startMinute] = values.startTime.split(':').map(Number)
    startDateTime.setHours(startHour, startMinute, 0, 0)
    
    const endDateTime = new Date(values.date)
    const [endHour, endMinute] = values.endTime.split(':').map(Number)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    // Check that start and end are on the same day (no multi-day bookings)
    if (!isSameDay(startDateTime, endDateTime)) {
      toast.error("每次預約僅能借用單日，不能跨日連續借用")
      return
    }

    // 1. Check user role for 7-day rule (Client-side pre-check)
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 7)
      minDate.setHours(0, 0, 0, 0)
      
      if (startDateTime < minDate) {
        toast.error("一般使用者需於 7 天前申請")
        return
      }
      
      // Check 4-month limit for non-admins
      if (!isDateWithin4Months(startDateTime)) {
        toast.error("一般使用者僅能借用未來 4 個月內的日期")
        return
      }
      
      // Check semester lock for non-admins
      if (isDateInLockedPeriod(startDateTime, semesters, false)) {
        toast.error("下學期課表尚未確認，暫不開放預約")
        return
      }
    }

    // Rule: Unavailable periods check
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
             return
           }
        }
      }
    }

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
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
            throw new Error(errorData.error || '預約失敗')
        }

        toast.success("預約申請已送出")
        form.reset()
        router.push('/dashboard/my-bookings')
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '預約失敗'
        toast.error(message)
    }
  }

  // Generate 30-minute interval time slots from 08:00 to 22:00
  const timeSlots = Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30 // Start from 08:00
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  // Get current and next semester for display
  const currentSemester = getCurrentSemester(semesters)
  const nextSemester = getNextSemester(semesters, currentSemester)
  const maxBookableDate = getMaxBookableDate()
  const isNextSemesterLocked = nextSemester && !nextSemester.is_next_semester_open

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Warning banner for locked semester */}
        {!isAdmin && isNextSemesterLocked && (
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
        
        {/* Info banner for 4-month limit */}
        {!isAdmin && (
          <div className="text-sm text-muted-foreground">
            一般使用者可預約至 {format(maxBookableDate, 'yyyy/MM/dd', { locale: zhTW })}（4 個月內）
          </div>
        )}
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>選擇空間</FormLabel>
              <Select 
                onValueChange={(val) => {
                    field.onChange(val)
                    onRoomChange?.(val)
                }} 
                defaultValue={field.value}
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
                        "w-[240px] pl-3 text-left font-normal",
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
                      
                      // Always disable past dates
                      if (date < today) return true

                      // If user is NOT admin, apply additional restrictions
                      if (!isAdmin) {
                         // 7-day rule
                         const minDate = new Date(today)
                         minDate.setDate(today.getDate() + 7)
                         if (date < minDate) return true
                         
                         // 4-month limit
                         if (!isDateWithin4Months(date)) return true
                         
                         // Semester lock
                         if (isDateInLockedPeriod(date, semesters, false)) return true
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
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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

        <Button type="submit">提交申請</Button>
      </form>
    </Form>
  )
}
