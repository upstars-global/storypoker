import { watch, type Ref } from 'vue'

const ITEM_SELECTOR = '[role^="menuitem"]'

export function useMenuKeyboard(
  open: Ref<boolean>,
  trigger: Ref<HTMLElement | null>,
  menuEl: Ref<HTMLElement | null>,
) {
  function items(): HTMLElement[] {
    return menuEl.value ? Array.from(menuEl.value.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : []
  }

  function focusAt(index: number) {
    const list = items()
    if (!list.length) return
    list[(index + list.length) % list.length]?.focus()
  }

  function onKeydown(e: KeyboardEvent) {
    const list = items()
    const active = document.activeElement
    const current = list.findIndex(el => el === active || el.contains(active))
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusAt(current + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusAt(current - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        ;(e.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR)?.click()
        break
      case 'Escape':
        e.preventDefault()
        open.value = false
        break
    }
  }

  watch(open, (isOpen) => {
    if (isOpen) focusAt(0)
  }, { flush: 'post' })

  watch(open, (isOpen) => {
    if (!isOpen && menuEl.value?.contains(document.activeElement)) trigger.value?.focus()
  })

  return { onKeydown }
}
