import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import ConfigureCardDeckModal from '~/components/ConfigureCardDeckModal'
import type { DeckPresetId } from '~/utils/cardDecks'

function mountModal(props: { deckPreset?: DeckPresetId; resultCohorts?: string[] | null } = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <ConfigureCardDeckModal
      deckPreset={props.deckPreset ?? 'scrum'}
      activeCards={['1', '2', '3']}
      resultCohorts={props.resultCohorts ?? null}
      onSave={onSave}
      onClose={onClose}
    />,
  )
  return { ...view, onSave, onClose }
}

function saveButton() {
  return screen.getByRole('button', { name: i18n.t('deck.save') })
}

function presetTrigger() {
  return document.querySelector<HTMLElement>('[data-testid="deck-preset-select"]')!
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function cohortChips() {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-testid="deck-result-cohort"]')]
}

describe('ConfigureCardDeckModal result cohort chips', () => {
  it('shows the DEV, QA, PO and SM chip groups, none selected by default', () => {
    const { onSave } = mountModal()
    expect([...document.querySelectorAll('[data-testid="deck-result-cohort-group"]')].map(group => group.textContent)).toEqual(['DEVBEFESRE', 'QAAQAGQA', 'PO', 'SM'])
    expect(cohortChips().every(chip => chip.getAttribute('aria-pressed') === 'false')).toBe(true)
    fireEvent.click(saveButton())
    expect(onSave).toHaveBeenCalledWith({ deckPreset: 'scrum', cards: ['1', '2', '3'], resultCohorts: [] })
  })

  it('breaks the chips into two rows below the lg breakpoint after the DEV group', () => {
    mountModal()
    const rowBreak = screen.getByTestId('deck-result-cohort-break')
    expect(rowBreak.className.split(' ')).toEqual(expect.arrayContaining(['basis-full', 'lg:hidden']))
    expect(rowBreak.nextElementSibling?.textContent).toBe('QAAQAGQA')
  })

  it('shows PO and SM side by side without a divider between them', () => {
    mountModal()
    const groups = screen.getAllByTestId('deck-result-cohort-group')
    expect(groups[2]!.className).toContain('border-l')
    expect(groups[3]!.className).not.toContain('border-l')
  })

  it.each(['voting', 'vote_question'] as const)('hides the result chips for the %s deck', deckPreset => {
    const { onSave } = mountModal({ deckPreset, resultCohorts: ['BE'] })
    expect(screen.queryByTestId('deck-result-cohorts')).toBeNull()
    fireEvent.click(saveButton())
    expect(onSave.mock.calls[0]![0]).toMatchObject({ resultCohorts: ['BE'] })
  })

  it('saves the toggled subset in canonical order', () => {
    const { onSave } = mountModal({ resultCohorts: ['SRE', 'QA'] })
    expect(cohortChips().map(chip => chip.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true', 'true', 'false', 'false', 'false', 'false'])
    fireEvent.click(cohortChips()[7]!)
    fireEvent.click(cohortChips()[1]!)
    fireEvent.click(cohortChips()[4]!)
    fireEvent.click(saveButton())
    expect(onSave).toHaveBeenCalledWith({ deckPreset: 'scrum', cards: ['1', '2', '3'], resultCohorts: ['BE', 'SRE', 'PO'] })
  })
})

describe('ConfigureCardDeckModal cards', () => {
  it('toggles a card and keeps the deck order', () => {
    const { onSave } = mountModal()
    fireEvent.click(document.getElementById('deck-card-1/2')!)
    fireEvent.click(document.getElementById('deck-card-2')!)
    fireEvent.click(saveButton())
    expect(onSave.mock.calls[0]![0]).toMatchObject({ cards: ['1/2', '1', '3'] })
  })
})

describe('ConfigureCardDeckModal preset select', () => {
  it('shows the current preset name in the closed trigger', () => {
    mountModal()
    expect(presetTrigger().textContent).toContain('Scrum Scale')
    expect(presetTrigger().classList.contains('mui-input')).toBe(true)
  })

  it('applies the default cards of a chosen preset', async () => {
    const { onSave } = mountModal()
    await act(async () => {
      fireEvent.click(presetTrigger())
    })
    const option = await screen.findByRole('option', { name: 'Vote - Y/N' })
    await act(async () => {
      option.focus()
      fireEvent.keyDown(option, { key: 'Enter' })
    })
    expect(presetTrigger().textContent).toContain('Vote - Y/N')
    fireEvent.click(saveButton())
    expect(onSave.mock.calls[0]![0]).toMatchObject({ deckPreset: 'voting' })
  })

  it('closes the open list on a pointer press elsewhere in the modal', async () => {
    mountModal()
    await act(async () => {
      fireEvent.click(presetTrigger())
    })
    await screen.findByRole('listbox')
    const title = document.getElementById('card-deck-modal-title')!
    await act(async () => {
      fireEvent.pointerDown(title)
      fireEvent.mouseDown(title)
      fireEvent.pointerUp(title)
      fireEvent.mouseUp(title)
      fireEvent.click(title)
    })
    await vi.waitFor(() => expect(presetTrigger().getAttribute('aria-expanded')).toBe('false'))
  })
})
