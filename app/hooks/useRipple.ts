import { useCallback } from 'react'

export interface RippleOptions {
  color: string
  initialOpacity: number
  finalOpacity: number
  duration: number
  dissolveDuration: number
  easing: string
  cancellationPeriod: number
}

export const RIPPLE_OPTIONS: RippleOptions = {
  color: 'currentColor',
  initialOpacity: 0.35,
  finalOpacity: 0,
  duration: 0.4,
  dissolveDuration: 0.15,
  easing: 'ease-out',
  cancellationPeriod: 75,
}

const SCALE_FACTOR = 2.05
const activeWaves = new WeakMap<HTMLElement, number>()
const savedPositions = new WeakMap<HTMLElement, string>()

interface Point {
  x: number
  y: number
}

function furthestCornerDistance({ x, y }: Point, width: number, height: number): number {
  return Math.max(Math.hypot(x, y), Math.hypot(x - width, y), Math.hypot(x, y - height), Math.hypot(x - width, y - height))
}

function createContainer(styles: CSSStyleDeclaration): HTMLDivElement {
  const container = document.createElement('div')
  Object.assign(container.style, {
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    position: 'absolute',
    borderRadius: `${styles.borderTopLeftRadius} ${styles.borderTopRightRadius} ${styles.borderBottomRightRadius} ${styles.borderBottomLeftRadius}`,
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  container.style.setProperty('-webkit-mask-image', '-webkit-radial-gradient(white, black)')
  container.dataset.rippleContainer = 'true'
  return container
}

function createWave({ x, y }: Point, size: number, options: RippleOptions): HTMLDivElement {
  const wave = document.createElement('div')
  Object.assign(wave.style, {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    top: `${y}px`,
    left: `${x}px`,
    background: options.color,
    borderRadius: '50%',
    opacity: `${options.initialOpacity}`,
    transform: 'translate(-50%,-50%) scale(0)',
    transition: `transform ${options.duration}s ${options.easing}, opacity ${options.duration}s ${options.easing}`,
  })
  return wave
}

function finishWave(el: HTMLElement, container: HTMLElement, wave: HTMLElement): void {
  wave.remove()
  const remaining = (activeWaves.get(el) ?? 1) - 1
  if (remaining > 0) {
    activeWaves.set(el, remaining)
    return
  }
  activeWaves.delete(el)
  container.remove()
  if (savedPositions.has(el)) {
    el.style.position = savedPositions.get(el) ?? ''
    savedPositions.delete(el)
  }
}

export function startRipple(el: HTMLElement, screen: Point, waitForRelease: boolean, options: RippleOptions = RIPPLE_OPTIONS): void {
  if (el.hasAttribute('disabled')) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const rect = el.getBoundingClientRect()
  const styles = window.getComputedStyle(el)
  const point = { x: screen.x - rect.left, y: screen.y - rect.top }
  const size = SCALE_FACTOR * furthestCornerDistance(point, rect.width, rect.height)
  const existing = el.querySelector<HTMLElement>(':scope > [data-ripple-container]')
  const container = existing ?? createContainer(styles)
  const wave = createWave(point, size, options)

  activeWaves.set(el, (activeWaves.get(el) ?? 0) + 1)
  if (styles.position === 'static' && !savedPositions.has(el)) {
    savedPositions.set(el, el.style.position)
    el.style.position = 'relative'
  }
  container.appendChild(wave)
  if (!existing) el.appendChild(container)

  let shouldDissolve = !waitForRelease

  const dissolve = () => {
    wave.style.transition = `opacity ${options.dissolveDuration}s linear`
    wave.style.opacity = '0'
    setTimeout(() => finishWave(el, container, wave), options.dissolveDuration * 1000)
  }

  const release = (event?: Event) => {
    if (event) {
      document.removeEventListener('pointerup', release)
      document.removeEventListener('pointercancel', release)
    }
    if (shouldDissolve) dissolve()
    else shouldDissolve = true
  }

  const cancel = () => {
    clearTimeout(token)
    finishWave(el, container, wave)
    document.removeEventListener('pointerup', release)
    document.removeEventListener('pointercancel', release)
    document.removeEventListener('pointercancel', cancel)
  }

  if (waitForRelease) {
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', release)
  }

  const token: ReturnType<typeof setTimeout> = setTimeout(() => {
    document.removeEventListener('pointercancel', cancel)
    requestAnimationFrame(() => {
      wave.style.transform = 'translate(-50%,-50%) scale(1)'
      wave.style.opacity = `${options.finalOpacity}`
      setTimeout(() => release(), options.duration * 1000)
    })
  }, options.cancellationPeriod)

  document.addEventListener('pointercancel', cancel)
}

function centerOf(el: HTMLElement): Point {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export function useRipple<T extends HTMLElement>(): (el: T | null) => (() => void) | undefined {
  return useCallback((el: T | null) => {
    if (!el) return undefined
    const onPointerDown = (event: PointerEvent) => startRipple(el, { x: event.clientX, y: event.clientY }, true)
    const onClick = (event: MouseEvent) => {
      if (event.detail !== 0) return
      startRipple(el, centerOf(el), false)
    }
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('click', onClick)
    }
  }, [])
}
