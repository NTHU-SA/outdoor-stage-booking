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
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Room } from "@/utils/supabase/queries"
import { useEffect, useState } from "react"
import {
  getMaxBookableMonths,
  isDateWithin4Months,
} from "@/utils/semester"
import { bookingFormSchema, BookingFormValues } from "./schema"
import { validateBookingRules, generateTimeSlots, MIN_ADVANCE_DAYS, MAX_ADVANCE_DAYS } from "./utils"

type BookingFormProps = {
  rooms: Room[]
  selectedRoomId?: string
  onRoomChange?: (roomId: string) => void
  prefillSlot?: { start: Date; end: Date } | null
}

export function BookingForm({ rooms, selectedRoomId, onRoomChange, prefillSlot }: BookingFormProps) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rememberBorrowingUnit, setRememberBorrowingUnit] = useState(false)
  const [useSocket, setUseSocket] = useState(false)

  const getDefaultBorrowingUnitKey = (userId: string | null) => `defaultBorrowingUnit:${userId ?? 'guest'}`

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      borrowingUnit: "",
      purpose: "",
      roomId: selectedRoomId || "",
    },
  })

  // Track end date separately for the disabled logic
  const watchedStartDate = form.watch("startDate")

  // Sync form roomId with prop change
  useEffect(() => {
    if (selectedRoomId) {
      form.setValue("roomId", selectedRoomId)
    }
  }, [selectedRoomId, form])

  // Sync form date/time with prefillSlot
  useEffect(() => {
    if (prefillSlot) {
      form.setValue("startDate", prefillSlot.start)
      form.setValue("endDate", prefillSlot.end)

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
    const checkUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const savedBorrowingUnit = localStorage.getItem(getDefaultBorrowingUnitKey(user?.id ?? null))
      if (savedBorrowingUnit) {
        form.setValue("borrowingUnit", savedBorrowingUnit)
      }

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
    }
    checkUserRole()
  }, [form])

  async function onSubmit(values: BookingFormValues) {
    const startDateTime = new Date(values.startDate)
    const [startHour, startMinute] = values.startTime.split(':').map(Number)
    startDateTime.setHours(startHour, startMinute, 0, 0)

    const endDateTime = new Date(values.endDate)
    const [endHour, endMinute] = values.endTime.split(':').map(Number)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    const validation = validateBookingRules(
      startDateTime,
      endDateTime,
      values.roomId,
      rooms,
      isAdmin
    )

    if (!validation.isValid) {
      toast.error(validation.message)
      return
    }

    try {
      if (rememberBorrowingUnit && values.borrowingUnit.trim()) {
        localStorage.setItem(getDefaultBorrowingUnitKey(currentUserId), values.borrowingUnit.trim())
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
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
        throw new Error(errorData.error || '預約失敗')
      }

      toast.success("預約申請已送出")
      const defaultBorrowingUnit = localStorage.getItem(getDefaultBorrowingUnitKey(currentUserId)) || ""
      form.reset({
        roomId: selectedRoomId || "",
        borrowingUnit: defaultBorrowingUnit,
        purpose: "",
      })
      router.push('/dashboard/my-bookings')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '預約失敗'
      toast.error(message)
    }
  }

  const timeSlots = generateTimeSlots()

  // Get current and next semester for display
  const maxBookableMonths = getMaxBookableMonths()

  // Get selected room's type to determine if semester lock applies
  const watchedRoomId = form.watch("roomId")

  // Previously checked for "Meeting" type. Since room types are removed, we default to false (enforce rules)
  const isMeetingRoom = false

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

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
                          "w-48 pl-3 text-left font-normal",
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
                        if (date < today) return true
                        if (!isAdmin) {
                          const minDate = new Date(today)
                          minDate.setDate(today.getDate() + MIN_ADVANCE_DAYS)
                          if (date < minDate) return true
                          const maxDate = new Date(today)
                          maxDate.setDate(today.getDate() + MAX_ADVANCE_DAYS)
                          if (date > maxDate) return true
                          if (!isDateWithin4Months(date, maxBookableMonths)) return true
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
                          "w-48 pl-3 text-left font-normal",
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
                        if (date < today) return true
                        if (!isAdmin) {
                          const minDate = new Date(today)
                          minDate.setDate(today.getDate() + MIN_ADVANCE_DAYS)
                          if (date < minDate) return true
                          const maxDate = new Date(today)
                          maxDate.setDate(today.getDate() + MAX_ADVANCE_DAYS)
                          if (date > maxDate) return true
                          if (!isDateWithin4Months(date, maxBookableMonths)) return true
                        }
                        // endDate must be >= startDate
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

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-borrowing-unit"
            checked={rememberBorrowingUnit}
            onCheckedChange={(checked) => setRememberBorrowingUnit(checked === true)}
          />
          <label htmlFor="remember-borrowing-unit" className="text-sm text-muted-foreground cursor-pointer">
            設為默認借用單位（下次自動帶入）
          </label>
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

        <div className="flex items-center gap-2">
          <Checkbox
            id="use-socket-booking-form"
            checked={useSocket}
            onCheckedChange={(checked) => setUseSocket(checked === true)}
          />
          <label htmlFor="use-socket-booking-form" className="text-sm font-semibold text-emerald-700 cursor-pointer">
            需要使用插座
          </label>
        </div>

        <Button type="submit">提交申請</Button>
      </form>
    </Form>
  )
}
