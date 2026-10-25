import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import HistoryModal from '~/components/HistoryModal'
import { useRoomStore } from '~/stores/room'
import type { RoundHistory } from '~/stores/types'
import { resetStores } from '../../support/helpers/resetStores'

function round(id: string, revealedAt: string, votes: [string, string][]): RoundHistory {
  return {
    id,
    room_id: 'r1',
    started_at: revealedAt,
    revealed_at: revealedAt,
    votes: votes.map(([name, vote]) => ({ player_id: name, name, vote })),
    active_cards: ['1', '2', '3', '5', '8'],
    deck_preset: 'scrum',
    created_at: revealedAt,
  }
}

async function flush() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

beforeEach(async () => {
  await resetStores()
  useRoomStore.setState({
    fetchHistory: vi.fn().mockResolvedValue([
      round('h2', '2026-10-20T10:00:00Z', [['alice', '3'], ['bob', '3']]),
      round('h1', '2026-10-19T10:00:00Z', [['alice', '5'], ['bob', '3']]),
    ]),
  })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('HistoryModal', () => {
  it('lists the fetched rounds', async () => {
    render(<HistoryModal onClose={vi.fn()} />)
    await flush()
    expect(screen.getAllByTestId('history-round')).toHaveLength(2)
  })

  it('opens a round snapshot on top and closes only the snapshot with Escape', async () => {
    const onClose = vi.fn()
    render(<HistoryModal onClose={onClose} />)
    await flush()
    await act(async () => {
      fireEvent.click(screen.getAllByTestId('history-round')[0]!)
    })
    await flush()
    const snapshotTitle = document.getElementById('round-snapshot-modal-title')
    expect(snapshotTitle).not.toBeNull()
    const snapshotDialog = snapshotTitle!.closest('dialog')!
    expect(snapshotDialog.contains(document.activeElement)).toBe(true)
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    })
    await flush()
    expect(document.getElementById('round-snapshot-modal-title')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })
})
