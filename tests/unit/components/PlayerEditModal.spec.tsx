import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import PlayerEditModal from '~/components/PlayerEditModal'

function mountModal(shields: string[] = ['dev']) {
  const onSave = vi.fn()
  render(
    <PlayerEditModal
      name="Alice"
      shields={shields}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  )
  return { onSave, input: document.getElementById('player-name') as HTMLInputElement }
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('PlayerEditModal', () => {
  it('focuses the name input when opened', async () => {
    const { input } = mountModal()
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve))
    })
    expect(document.activeElement).toBe(input)
  })

  it('saves the trimmed name and the role as a single shield', () => {
    const { onSave, input } = mountModal()
    fireEvent.change(input, { target: { value: '  Bob ' } })
    fireEvent.keyUp(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith({ name: 'Bob', shields: ['dev'] })
  })

  it('ignores an empty name', () => {
    const { onSave, input } = mountModal()
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }))
    expect(onSave).not.toHaveBeenCalled()
  })
})
