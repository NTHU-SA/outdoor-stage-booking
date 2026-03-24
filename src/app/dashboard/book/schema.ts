import { z } from "zod"

export const bookingFormSchema = z.object({
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
  const startDay = new Date(data.startDate)
  startDay.setHours(0, 0, 0, 0)
  const endDay = new Date(data.endDate)
  endDay.setHours(0, 0, 0, 0)
  return startDay.getTime() === endDay.getTime()
}, {
  message: "無法跨天借用",
  path: ["endDate"],
}).refine((data) => {
  const startDay = new Date(data.startDate)
  startDay.setHours(0, 0, 0, 0)
  const endDay = new Date(data.endDate)
  endDay.setHours(0, 0, 0, 0)
  // If same day, end time must be after start time
  if (startDay.getTime() === endDay.getTime()) {
    return data.endTime > data.startTime
  }
  return true
}, {
  message: "同日借用時，結束時間必須晚於開始時間",
  path: ["endTime"],
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>

