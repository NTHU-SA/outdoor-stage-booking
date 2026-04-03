import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// We need to mock the Supabase client before importing the hook
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

// Import after mock setup
import { useUser } from '@/hooks/use-user'

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: no user
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  it('should start with loading=true and user=null', async () => {
    const { result } = renderHook(() => useUser())
    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()

    // Wait for initial effect to settle so test does not end mid-update.
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should set user after getUser resolves', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
  })

  it('should set user=null when getUser returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('should handle getUser error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockGetUser.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('should update user on auth state change', async () => {
    let authChangeCallback: ((event: string, session: { user: { id: string } } | null) => void) | null = null

    mockOnAuthStateChange.mockImplementation((callback: typeof authChangeCallback) => {
      authChangeCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate auth state change  
    const newUser = { id: 'user-2', email: 'new@example.com' }
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authChangeCallback?.('SIGNED_IN', { user: newUser } as any)
    })

    expect(result.current.user).toEqual(newUser)
  })

  it('should set user to null on sign out', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    let authChangeCallback: ((event: string, session: null) => void) | null = null

    mockOnAuthStateChange.mockImplementation((callback: typeof authChangeCallback) => {
      authChangeCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })

    // Simulate sign out
    act(() => {
      authChangeCallback?.('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
  })

  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() => useUser())

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
