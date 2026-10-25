import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getTransitionOrigin, useTheme } from '~/hooks/useTheme'

type Origin = { x: number; y: number }

function originFromDispatch(el: HTMLElement, init: MouseEventInit): Origin {
  let origin: Origin | null = null
  const listener = (e: Event) => {
    origin = getTransitionOrigin(e as MouseEvent)
  }
  el.addEventListener('click', listener)
  el.dispatchEvent(new MouseEvent('click', init))
  el.removeEventListener('click', listener)
  if (!origin) throw new Error('click listener did not fire')
  return origin
}

describe('getTransitionOrigin', () => {
  it('uses the pointer coordinates for a real mouse click', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    expect(originFromDispatch(el, { detail: 1, clientX: 42, clientY: 24 })).toEqual({ x: 42, y: 24 })
    el.remove()
  })

  it('falls back to the trigger element center for keyboard activation', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 50, width: 40, height: 20,
    } as DOMRect)
    expect(originFromDispatch(el, { detail: 0, clientX: 0, clientY: 0 })).toEqual({ x: 120, y: 60 })
    el.remove()
  })

  it('falls back to the viewport center without an event', () => {
    expect(getTransitionOrigin()).toEqual({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-palette')
  })

  it('applies the stored theme and palette on init without rewriting them', () => {
    localStorage.setItem('sp-theme', 'light')
    localStorage.setItem('sp-palette', 'cyberdeck')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.init())
    expect(result.current.theme).toBe('light')
    expect(result.current.isLight).toBe(true)
    expect(result.current.palette).toBe('cyberdeck')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-palette')).toBe('cyberdeck')
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('falls back to dark and classic for unknown stored values', () => {
    localStorage.setItem('sp-theme', 'sepia')
    localStorage.setItem('sp-palette', 'neon')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.init())
    expect(result.current.theme).toBe('dark')
    expect(result.current.palette).toBe('classic')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-palette')).toBe('classic')
  })

  it('persists the palette and shares it between callers', () => {
    const first = renderHook(() => useTheme())
    const second = renderHook(() => useTheme())
    act(() => first.result.current.setPalette('matcha'))
    expect(second.result.current.palette).toBe('matcha')
    expect(localStorage.getItem('sp-palette')).toBe('matcha')
    expect(document.documentElement.getAttribute('data-palette')).toBe('matcha')
  })

  it('toggles and persists the theme without view transitions', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('sp-theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
