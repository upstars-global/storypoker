import { describe, it, expect, vi } from 'vitest'
import { getTransitionOrigin } from '~/composables/useTheme'

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
