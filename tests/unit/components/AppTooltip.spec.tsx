import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AppTooltip from '~/components/AppTooltip'

function mountTooltip() {
  render(
    <AppTooltip trigger={<button type="button">info</button>}>
      Tooltip text
    </AppTooltip>,
  )
  return {
    trigger: screen.getByRole('button', { name: 'info' }),
    tooltip: () => document.querySelector<HTMLElement>('[role="tooltip"]'),
  }
}

function isShown(el: HTMLElement | null) {
  if (!el) return false
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node.hidden || node.style.display === 'none') return false
  }
  return true
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('AppTooltip', () => {
  it('exposes tooltip role and links trigger via aria-describedby', () => {
    const { trigger, tooltip } = mountTooltip()
    const id = tooltip()?.id
    expect(id).toBeTruthy()
    expect(trigger.getAttribute('aria-describedby')).toBe(id)
    expect(tooltip()?.textContent).toBe('Tooltip text')
  })

  it('shows content on focus and hides on blur', async () => {
    const { trigger, tooltip } = mountTooltip()
    expect(isShown(tooltip())).toBe(false)
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Tab' })
      trigger.focus()
    })
    expect(isShown(tooltip())).toBe(true)
    await act(async () => {
      trigger.blur()
    })
    await waitFor(() => expect(isShown(tooltip())).toBe(false))
  })

  it('shows content on hover', async () => {
    const { trigger, tooltip } = mountTooltip()
    await act(async () => {
      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
      fireEvent.mouseEnter(trigger)
      fireEvent.mouseMove(trigger)
    })
    expect(isShown(tooltip())).toBe(true)
  })
})
