type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'

export type DiscordBookingNotificationBooking = {
  id: string
  start_time: string
  end_time: string
  status: BookingStatus
  borrowing_unit: string | null
  purpose: string | null
  note: string | null
}

export type DiscordBookingNotificationInput = {
  bookings: DiscordBookingNotificationBooking[]
  room: {
    name: string | null
    room_code: string | null
  }
  applicant: {
    full_name: string | null
    username: string | null
    email: string | null
  }
}

const TAIPEI_TIME_ZONE = 'Asia/Taipei'
const MAX_TIME_RANGE_LINES = 10
const REQUEST_TIMEOUT_MS = 3000

const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: TAIPEI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: TAIPEI_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function cleanText(value: string | null | undefined, fallback: string) {
  const cleaned = value?.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  return cleaned || fallback
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function formatTaipeiRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startDate = dateFormatter.format(start)
  const endDate = dateFormatter.format(end)
  const startTime = timeFormatter.format(start)
  const endTime = timeFormatter.format(end)

  if (startDate === endDate) {
    return `${startDate} ${startTime}-${endTime}`
  }

  return `${startDate} ${startTime} - ${endDate} ${endTime}`
}

function getStatusLabel(status: BookingStatus) {
  if (status === 'approved') return '已核准'
  if (status === 'pending') return '待審核'
  return status
}

function buildTimeRangeSummary(bookings: DiscordBookingNotificationBooking[]) {
  const lines = bookings
    .slice(0, MAX_TIME_RANGE_LINES)
    .map((booking, index) => `${index + 1}. ${formatTaipeiRange(booking.start_time, booking.end_time)}`)

  const remainingCount = bookings.length - MAX_TIME_RANGE_LINES
  if (remainingCount > 0) {
    lines.push(`另有 ${remainingCount} 筆`)
  }

  return lines.join('\n')
}

export function buildDiscordBookingNotificationPayload(input: DiscordBookingNotificationInput) {
  const firstBooking = input.bookings[0]
  const status = firstBooking?.status ?? 'pending'
  const title = status === 'approved' ? '新的已核准借用' : '新的借用申請'
  const roomName = cleanText(input.room.name, '未命名空間')
  const roomCode = cleanText(input.room.room_code, '')
  const roomLabel = roomCode ? `${roomName} (${roomCode})` : roomName
  const applicantName = cleanText(input.applicant.full_name, cleanText(input.applicant.username, cleanText(input.applicant.email, '未知使用者')))
  const borrowingUnit = cleanText(firstBooking?.borrowing_unit, '個人借用者')
  const purpose = cleanText(firstBooking?.purpose, '未填寫')
  const note = firstBooking?.note?.trim()

  const fields = [
    { name: '狀態', value: getStatusLabel(status), inline: true },
    { name: '空間', value: truncate(roomLabel, 1024), inline: true },
    { name: '筆數', value: `${input.bookings.length}`, inline: true },
    { name: '借用單位', value: truncate(borrowingUnit, 1024), inline: true },
    { name: '申請人', value: truncate(applicantName, 1024), inline: true },
    { name: '用途', value: truncate(purpose, 1024), inline: false },
    { name: '時段', value: truncate(buildTimeRangeSummary(input.bookings), 1024), inline: false },
  ]

  if (note) {
    fields.push({ name: '備註', value: truncate(note, 1024), inline: false })
  }

  return {
    content: title,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title,
        color: status === 'approved' ? 0x16a34a : 0xf59e0b,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export async function sendDiscordBookingNotification(input: DiscordBookingNotificationInput) {
  const webhookUrl = process.env.DISCORD_BOOKING_WEBHOOK_URL

  if (!webhookUrl || input.bookings.length === 0) {
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildDiscordBookingNotificationPayload(input)),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('Failed to send Discord booking notification:', response.status, await response.text().catch(() => ''))
    }
  } catch (error) {
    console.error('Failed to send Discord booking notification:', error)
  } finally {
    clearTimeout(timeoutId)
  }
}
