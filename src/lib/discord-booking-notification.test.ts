import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildDiscordBookingNotificationPayload,
  sendDiscordBookingNotification,
  type DiscordBookingNotificationInput,
} from './discord-booking-notification'

const originalWebhookUrl = process.env.DISCORD_BOOKING_WEBHOOK_URL

function createNotificationInput(overrides: Partial<DiscordBookingNotificationInput> = {}): DiscordBookingNotificationInput {
  return {
    bookings: [
      {
        id: 'booking-1',
        start_time: '2099-03-30T10:00:00.000Z',
        end_time: '2099-03-30T11:00:00.000Z',
        status: 'pending',
        borrowing_unit: '學生會活動部',
        purpose: '展覽活動借用',
        note: '需要音響',
      },
    ],
    room: {
      name: '野台',
      room_code: 'OUTDOOR',
    },
    applicant: {
      full_name: '測試使用者',
      username: 'test-user',
      email: 'user@example.com',
    },
    ...overrides,
  }
}

describe('sendDiscordBookingNotification', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DISCORD_BOOKING_WEBHOOK_URL
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    if (originalWebhookUrl === undefined) {
      delete process.env.DISCORD_BOOKING_WEBHOOK_URL
    } else {
      process.env.DISCORD_BOOKING_WEBHOOK_URL = originalWebhookUrl
    }
  })

  it('does not call fetch when DISCORD_BOOKING_WEBHOOK_URL is missing', async () => {
    await sendDiscordBookingNotification(createNotificationInput())

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends a Discord payload with mentions disabled', async () => {
    process.env.DISCORD_BOOKING_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'

    await sendDiscordBookingNotification(createNotificationInput())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://discord.com/api/webhooks/test')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const body = JSON.parse(init.body)
    expect(body.allowed_mentions).toEqual({ parse: [] })
    expect(body.content).toBe('新的借用申請')
    expect(body.embeds[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '空間', value: '野台 (OUTDOOR)' }),
      expect.objectContaining({ name: '時段', value: expect.stringContaining('2099/03/30') }),
    ]))
  })

  it('logs non-2xx Discord responses without throwing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.DISCORD_BOOKING_WEBHOOK_URL = 'https://discord.com/api/webhooks/test'
    fetchMock.mockResolvedValueOnce(new Response('bad webhook', { status: 500 }))

    await expect(sendDiscordBookingNotification(createNotificationInput())).resolves.toBeUndefined()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to send Discord booking notification:',
      500,
      'bad webhook',
    )

    consoleErrorSpy.mockRestore()
  })
})

describe('buildDiscordBookingNotificationPayload', () => {
  it('summarizes batch bookings in one message and caps visible time ranges', () => {
    const input = createNotificationInput({
      bookings: Array.from({ length: 12 }, (_, index) => ({
        id: `booking-${index + 1}`,
        start_time: `2099-03-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
        end_time: `2099-03-${String(index + 1).padStart(2, '0')}T11:00:00.000Z`,
        status: 'approved',
        borrowing_unit: '學生會活動部',
        purpose: '展覽活動借用',
        note: null,
      })),
    })

    const payload = buildDiscordBookingNotificationPayload(input)
    const timeField = payload.embeds[0].fields.find((field) => field.name === '時段')

    expect(payload.content).toBe('新的已核准借用')
    expect(payload.embeds[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '筆數', value: '12' }),
    ]))
    expect(timeField?.value).toContain('另有 2 筆')
  })
})
