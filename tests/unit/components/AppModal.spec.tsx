import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'

type ModalProps = {
  open?: boolean
  lockDismiss?: boolean
  labelledby?: string
  describedby?: string
  onClose?: () => void
}

function modal({ open = true, onClose = () => {}, ...props }: ModalProps = {}) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      {...props}
    >
      <AppModalPaper onClose={onClose}>
        <h2 id="title-id">Title</h2>
        <p id="desc-id">Description</p>
        <button type="button">inside</button>
      </AppModalPaper>
    </AppModal>
  )
}

function dialogElement() {
  return document.querySelector<HTMLDialogElement>('dialog.app-modal')
}

function focusedTrigger() {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()
  return trigger
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('AppModal', () => {
  it('forwards labelledby and describedby to the dialog element', async () => {
    render(modal({ labelledby: 'title-id', describedby: 'desc-id' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBe(dialogElement())
    expect(dialog.getAttribute('aria-labelledby')).toBe('title-id')
    expect(dialog.getAttribute('aria-describedby')).toBe('desc-id')
  })

  it('renders no aria attributes when ids are not provided', async () => {
    render(modal())
    const dialog = await screen.findByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
  })

  it('renders nothing while closed', () => {
    render(modal({ open: false }))
    expect(dialogElement()).toBeNull()
  })

  it('closes on Escape unless lockDismiss is set', async () => {
    const onClose = vi.fn()
    const { rerender } = render(modal({ onClose }))
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const onLockedClose = vi.fn()
    rerender(modal({ onClose: onLockedClose, lockDismiss: true }))
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' })
    expect(onLockedClose).not.toHaveBeenCalled()
    expect(dialogElement()).not.toBeNull()
  })

  it('closes on an overlay click unless lockDismiss is set', async () => {
    const onClose = vi.fn()
    const { rerender } = render(modal({ onClose }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Title'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('.mui-modal-overlay')!)
    expect(onClose).toHaveBeenCalledTimes(1)

    const onLockedClose = vi.fn()
    rerender(modal({ onClose: onLockedClose, lockDismiss: true }))
    fireEvent.click(document.querySelector('.mui-modal-overlay')!)
    expect(onLockedClose).not.toHaveBeenCalled()
  })

  it('focuses the dialog itself on open, not the first control', async () => {
    render(modal())
    const dialog = await screen.findByRole('dialog')
    await act(async () => {})
    expect(document.activeElement).toBe(dialog)
  })
})

describe('AppModalPaper', () => {
  it('names the close button through i18n and closes even with lockDismiss', async () => {
    const onClose = vi.fn()
    render(modal({ onClose, lockDismiss: true }))
    const close = await screen.findByRole('button', { name: i18n.t('common.close') })
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('AppModal focus return', () => {
  it('returns focus to the trigger when open becomes false', async () => {
    const trigger = focusedTrigger()
    const { rerender } = render(modal())
    await screen.findByRole('dialog')
    await act(async () => {})
    expect(document.activeElement).not.toBe(trigger)
    rerender(modal({ open: false }))
    await act(async () => {})
    expect(document.activeElement).toBe(trigger)
  })

  it('returns focus to the trigger when unmounted while open', async () => {
    const trigger = focusedTrigger()
    const { unmount } = render(modal())
    await screen.findByRole('dialog')
    await act(async () => {})
    unmount()
    await act(async () => {})
    expect(document.activeElement).toBe(trigger)
  })
})
