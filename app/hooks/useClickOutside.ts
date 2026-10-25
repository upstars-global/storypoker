import { useEffect, useRef, type RefObject } from 'react'

export function useClickOutside(target: RefObject<HTMLElement | null>, handler: () => void): void {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!target.current || target.current.contains(e.target as Node)) return
      handlerRef.current()
    }
    document.addEventListener('mousedown', listener, true)
    return () => document.removeEventListener('mousedown', listener, true)
  }, [target])
}
