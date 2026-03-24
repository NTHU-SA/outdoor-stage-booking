import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock matchMedia for jsdom
function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useIsMobile', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true })
    vi.restoreAllMocks()
  })

  it('should return true when window width is below 768px', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
    window.matchMedia = createMatchMedia(true)

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('should return false when window width is 768px or above', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    window.matchMedia = createMatchMedia(false)

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('should update when media query changes', async () => {
    let changeHandler: (() => void) | null = null

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
    act(() => {
      changeHandler?.()
    })

    expect(result.current).toBe(true)
  })

  it('should clean up event listener on unmount', async () => {
    const removeEventListenerMock = vi.fn()
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }))

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { unmount } = renderHook(() => useIsMobile())

    unmount()
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
