import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react'

const ITEM_SELECTOR = '[role^="menuitem"]'

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return menu ? Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : []
}

function focusItemAt(menu: HTMLElement | null, index: number) {
  const list = menuItems(menu)
  if (!list.length) return
  list[(index + list.length) % list.length]?.focus()
}

export function useMenuKeyboard(
  open: boolean,
  setOpen: (open: boolean) => void,
  trigger: RefObject<HTMLElement | null>,
  menuEl: RefObject<HTMLElement | null>,
) {
  const focusInside = useRef(false)

  useEffect(() => {
    if (!open) return
    function trackFocus(e: globalThis.FocusEvent) {
      focusInside.current = e.target instanceof Node && !!menuEl.current?.contains(e.target)
    }
    document.addEventListener('focusin', trackFocus)
    focusItemAt(menuEl.current, 0)
    return () => document.removeEventListener('focusin', trackFocus)
  }, [open, menuEl])

  useEffect(() => {
    if (open || !focusInside.current) return
    focusInside.current = false
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) trigger.current?.focus()
  }, [open, trigger])

  function onKeydown(e: KeyboardEvent<HTMLElement>) {
    const menu = menuEl.current
    const list = menuItems(menu)
    const active = document.activeElement
    const current = list.findIndex(el => el === active || el.contains(active))
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusItemAt(menu, current + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusItemAt(menu, current - 1)
        break
      case 'Home':
        e.preventDefault()
        focusItemAt(menu, 0)
        break
      case 'End':
        e.preventDefault()
        focusItemAt(menu, list.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        ;(e.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR)?.click()
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  function onFocusout(e: FocusEvent<HTMLElement>) {
    const next = e.relatedTarget
    if (!(next instanceof Node) || !menuEl.current?.contains(next)) setOpen(false)
  }

  return { onKeydown, onFocusout }
}
