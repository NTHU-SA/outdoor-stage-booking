import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendDiscordBookingNotificationMock } = vi.hoisted(() => ({
  sendDiscordBookingNotificationMock: vi.fn(),
}))

vi.mock('@/utils/semester', () => ({
  getMaxBookableMonths: () => 4,
  isDateWithin4Months: () => true,
}))

const createClientMock = vi.fn()

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/discord-booking-notification', () => ({
  sendDiscordBookingNotification: sendDiscordBookingNotificationMock,
}))

import { POST } from '@/app/api/bookings/route'

type SupabaseMockOptions = {
  overlaps?: Array<{ id: string; start_time: string; end_time: string }>
  profileRole?: 'admin' | 'user'
  createError?: Error
}

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const overlaps = options.overlaps ?? []
  const profileRole = options.profileRole ?? 'admin'

  const insertSpy = vi.fn((rows: Array<Record<string, unknown>>) => ({
    select: vi.fn().mockResolvedValue({
      data: options.createError ? null : rows.map((row, index) => ({ id: `booking-${index + 1}`, ...row })),
      error: options.createError ?? null,
    }),
  }))

  const bookingsSelectBuilder: {
    eq: ReturnType<typeof vi.fn>
    neq: ReturnType<typeof vi.fn>
    filter: ReturnType<typeof vi.fn>
  } = {
    eq: vi.fn(),
    neq: vi.fn(),
    filter: vi.fn(),
  }

  bookingsSelectBuilder.eq.mockReturnValue(bookingsSelectBuilder)
  bookingsSelectBuilder.neq.mockReturnValue(bookingsSelectBuilder)

  let filterCount = 0
  bookingsSelectBuilder.filter.mockImplementation(() => {
    filterCount += 1
    if (filterCount >= 2) {
      return Promise.resolve({ data: overlaps, error: null })
    }
    return bookingsSelectBuilder
  })

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  role: profileRole,
                  full_name: '測試使用者',
                  username: 'test-user',
                },
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  unavailable_periods: null,
                  is_active: true,
                  name: '野台',
                  room_code: 'OUTDOOR',
                },
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'bookings') {
        return {
          select: vi.fn(() => bookingsSelectBuilder),
          insert: insertSpy,
        }
      }

      return {
        select: vi.fn(),
      }
    }),
  }

  return { supabase, insertSpy }
}

describe('POST /api/bookings (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendDiscordBookingNotificationMock.mockResolvedValue(undefined)
  })

  const payload = {
    roomId: '550e8400-e29b-41d4-a716-446655440000',
    borrowingUnit: '學生會活動部',
    purpose: '展覽活動借用',
    slots: [
      {
        startTime: '2099-03-30T10:00:00.000Z',
        endTime: '2099-03-30T11:00:00.000Z',
      },
      {
        startTime: '2099-03-31T10:00:00.000Z',
        endTime: '2099-03-31T11:00:00.000Z',
      },
    ],
  }

  it('returns 409 when any slot conflicts with existing booking', async () => {
    const { supabase } = createSupabaseMock({
      overlaps: [
        {
          id: 'existing-1',
          start_time: '2099-03-31T10:30:00.000Z',
          end_time: '2099-03-31T11:30:00.000Z',
        },
      ],
    })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain('已被預約')
    expect(sendDiscordBookingNotificationMock).not.toHaveBeenCalled()
  })

  it('does not insert any rows when conflict exists (all-or-nothing)', async () => {
    const { supabase, insertSpy } = createSupabaseMock({
      overlaps: [
        {
          id: 'existing-1',
          start_time: '2099-03-30T10:30:00.000Z',
          end_time: '2099-03-30T11:30:00.000Z',
        },
      ],
    })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(409)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(sendDiscordBookingNotificationMock).not.toHaveBeenCalled()
  })

  it('sends one Discord notification for a successful batch booking', async () => {
    const { supabase, insertSpy } = createSupabaseMock({ overlaps: [] })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(200)
    expect(insertSpy).toHaveBeenCalledTimes(1)

    const insertedRows = insertSpy.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(insertedRows).toHaveLength(2)

    const body = await response.json()
    expect(body.createdCount).toBe(2)
    expect(sendDiscordBookingNotificationMock).toHaveBeenCalledTimes(1)
    expect(sendDiscordBookingNotificationMock).toHaveBeenCalledWith({
      bookings: expect.arrayContaining([
        expect.objectContaining({ id: 'booking-1', status: 'approved' }),
        expect.objectContaining({ id: 'booking-2', status: 'approved' }),
      ]),
      room: {
        name: '野台',
        room_code: 'OUTDOOR',
      },
      applicant: {
        full_name: '測試使用者',
        username: 'test-user',
        email: 'user@example.com',
      },
    })
  })

  it('sends one Discord notification for a successful single booking', async () => {
    const { supabase } = createSupabaseMock({ overlaps: [], profileRole: 'user' })
    createClientMock.mockReturnValue(supabase)
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 2)
    startTime.setUTCHours(2, 0, 0, 0)
    const endTime = new Date(startTime)
    endTime.setUTCHours(3, 0, 0, 0)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: '550e8400-e29b-41d4-a716-446655440000',
        borrowingUnit: '學生會活動部',
        purpose: '展覽活動借用',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }),
    }))

    expect(response.status).toBe(200)
    expect(sendDiscordBookingNotificationMock).toHaveBeenCalledTimes(1)
    expect(sendDiscordBookingNotificationMock).toHaveBeenCalledWith(expect.objectContaining({
      bookings: [
        expect.objectContaining({
          id: 'booking-1',
          status: 'pending',
        }),
      ],
    }))
  })

  it('does not notify when insert fails', async () => {
    const { supabase } = createSupabaseMock({
      overlaps: [],
      createError: new Error('insert failed'),
    })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(500)
    expect(sendDiscordBookingNotificationMock).not.toHaveBeenCalled()
  })

  it('keeps the booking response successful when notification fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendDiscordBookingNotificationMock.mockRejectedValueOnce(new Error('Discord failed'))
    const { supabase } = createSupabaseMock({ overlaps: [] })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.createdCount).toBe(2)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send booking notification:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('allows an admin booking from 07:30 to 08:00 on the same local day', async () => {
    const { supabase, insertSpy } = createSupabaseMock({ overlaps: [], profileRole: 'admin' })
    createClientMock.mockReturnValue(supabase)

    const response = await POST(new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: '550e8400-e29b-41d4-a716-446655440000',
        borrowingUnit: '學生會活動部',
        purpose: '清晨場地借用',
        slots: [
          {
            startTime: '2099-03-30T23:30:00.000Z',
            endTime: '2099-03-31T00:00:00.000Z',
          },
        ],
      }),
    }))

    expect(response.status).toBe(200)
    expect(insertSpy).toHaveBeenCalledTimes(1)
  })
})
