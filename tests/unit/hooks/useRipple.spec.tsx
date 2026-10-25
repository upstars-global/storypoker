import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useRipple } from '~/hooks/useRipple'

function RippleButton({ disabled = false }: { disabled?: boolean }) {
  const ripple = useRipple<HTMLButtonElement>()
  return (
    <button ref={ripple} disabled={disabled} type="button">
      ok
    </button>
  )
}

function stubBox(el: HTMLElement) {
  el.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, width: 100, height: 40, right: 100, bottom: 40, toJSON: () => ({}),
  })
}

function setup(disabled = false) {
  const { getByRole } = render(<RippleButton disabled={disabled} />)
  const button = getByRole('button')
  stubBox(button)
  return button
}

function pointerDown(el: HTMLElement, x: number, y: number) {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }))
}

function container(el: HTMLElement) {
  return el.querySelector<HTMLElement>('[data-ripple-container]')
}

function wave(el: HTMLElement) {
  return container(el)?.firstElementChild as HTMLElement | null | undefined
}

describe('useRipple', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('starts a currentColor wave at 0.35 opacity with the v-wave transition', () => {
    const button = setup()
    pointerDown(button, 10, 20)

    const el = wave(button)
    expect(el).toBeTruthy()
    expect(el!.style.background.toLowerCase()).toBe('currentcolor')
    expect(el!.style.opacity).toBe('0.35')
    expect(el!.style.transition).toBe('transform 0.4s ease-out, opacity 0.4s ease-out')
    expect(el!.style.left).toBe('10px')
    expect(el!.style.top).toBe('20px')
    expect(el!.style.transform).toBe('translate(-50%,-50%) scale(0)')
  })

  it('makes a static element relative while the wave is shown', () => {
    const realComputed = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const styles = realComputed(el)
      return new Proxy(styles, { get: (target, key) => (key === 'position' ? 'static' : Reflect.get(target, key)) })
    })
    const button = setup()
    pointerDown(button, 10, 20)

    expect(button.style.position).toBe('relative')

    vi.advanceTimersByTime(75)
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(400)
    document.dispatchEvent(new PointerEvent('pointerup'))
    vi.advanceTimersByTime(150)

    expect(button.style.position).toBe('')
  })

  it('sizes the wave to 2.05 times the distance to the furthest corner', () => {
    const button = setup()
    pointerDown(button, 0, 0)

    const expected = 2.05 * Math.hypot(100, 40)
    expect(Number.parseFloat(wave(button)!.style.width)).toBeCloseTo(expected, 5)
  })

  it('grows to full size and fades to 0 after the cancellation period', () => {
    const button = setup()
    pointerDown(button, 10, 20)

    vi.advanceTimersByTime(75)
    vi.advanceTimersToNextFrame()

    expect(wave(button)!.style.transform).toBe('translate(-50%,-50%) scale(1)')
    expect(wave(button)!.style.opacity).toBe('0')
  })

  it('removes the wave and restores position after release and dissolve', () => {
    const button = setup()
    pointerDown(button, 10, 20)
    vi.advanceTimersByTime(75)
    vi.advanceTimersToNextFrame()
    vi.advanceTimersByTime(400)
    document.dispatchEvent(new PointerEvent('pointerup'))
    vi.advanceTimersByTime(150)

    expect(container(button)).toBeNull()
  })

  it('cancels the wave on pointercancel within the cancellation period', () => {
    const button = setup()
    pointerDown(button, 10, 20)
    document.dispatchEvent(new PointerEvent('pointercancel'))

    expect(container(button)).toBeNull()
  })

  it('waves from the center on a keyboard click', () => {
    const button = setup()
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))

    expect(wave(button)!.style.left).toBe('50px')
    expect(wave(button)!.style.top).toBe('20px')
  })

  it('skips disabled elements', () => {
    const button = setup(true)
    pointerDown(button, 10, 20)

    expect(container(button)).toBeNull()
  })

  it('skips when the user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const button = setup()
    pointerDown(button, 10, 20)

    expect(container(button)).toBeNull()
  })
})
