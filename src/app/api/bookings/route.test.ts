import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/semester', () => ({
  getMaxBookableMonths: () => 4,
  isDateWithin4Months: () => true,
}))

const createClientMock = vi.fn()

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

import { POST } from '@/app/api/bookings/route'

type SupabaseMockOptions = {
  overlaps?: Array<{ id: string; start_time: string; end_time: string }>
  profileRole?: 'admin' | 'user'
}

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const overlaps = options.overlaps ?? []
  const profileRole = options.profileRole ?? 'admin'

  const insertSpy = vi.fn((rows: Array<Record<string, unknown>>) => ({
    select: vi.fn().mockResolvedValue({
      data: rows.map((row, index) => ({ id: `booking-${index + 1}`, ...row })),
      error: null,
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
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { role: profileRole }, error: null }),
            })),
          })),
        }
      }

      if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { unavailable_periods: null, is_active: true },
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
  })

  it('inserts all slots when there is no conflict', async () => {
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
  })
})
