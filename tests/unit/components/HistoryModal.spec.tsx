import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '~/i18n'
import HistoryModal from '~/components/HistoryModal'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import type { RoundHistory } from '~/stores/types'
import { shieldForRoleTag } from '~/utils/shields'
import { resetStores } from '../../support/helpers/resetStores'
import { colorContrast } from '../../support/helpers/colorContrast'

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

function setRoles(roles: [string, string | null][]) {
  usePlayersStore.setState({
    players: roles.map(([id, role]) => ({
      id,
      room_id: 'r1',
      name: id,
      is_moderator: false,
      vote: null,
      user_id: null,
      shields: role === null ? [] : [shieldForRoleTag(role)],
      created_at: '2026-10-20T10:00:00Z',
      left_at: null,
    })),
  })
}

function setRound(votes: [string, string][]) {
  useRoomStore.setState({
    fetchHistory: vi.fn().mockResolvedValue([round('h1', '2026-10-20T10:00:00Z', votes)]),
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
  it('lists role rows in canonical order followed by every custom vote without a badge', async () => {
    setRoles([['fe', 'FE'], ['be', 'BE'], ['be2', 'BE'], ['gqa', 'GQA'], ['custom', 'Designer']])
    setRound([['fe', '3'], ['be', '5'], ['gqa', '3'], ['custom', '8'], ['be2', '5']])
    render(<HistoryModal onClose={vi.fn()} />)
    const card = await screen.findByTestId('history-round')
    expect(Array.from(card.lastElementChild!.children, row => row.textContent)).toEqual([
      'BE5 × 2', 'FE3 × 1', 'GQA3 × 1', '8 × 1',
    ])
    expect(screen.getByText('BE').style.backgroundColor).toBe('#42a5f5')
    expect(screen.getByText('FE').style.backgroundColor).toBe('#ab47bc')
    expect(screen.getByText('GQA').style.backgroundColor).toBe('#ff7043')
  })

  it('keeps all nine roles distinct in canonical order', async () => {
    const roles = ['SM', 'PO', 'AQA', 'GQA', 'QA', 'SRE', 'FE', 'BE', 'DEV']
    setRoles(roles.map(role => [role, role]))
    setRound(roles.map(role => [role, '3']))
    render(<HistoryModal onClose={vi.fn()} />)
    const card = await screen.findByTestId('history-round')
    expect(Array.from(card.lastElementChild!.children, row => row.textContent)).toEqual([
      'DEV3 × 1', 'BE3 × 1', 'FE3 × 1', 'SRE3 × 1', 'QA3 × 1',
      'GQA3 × 1', 'AQA3 × 1', 'PO3 × 1', 'SM3 × 1',
    ])
    expect(screen.getByText('AQA').style.backgroundColor).toBe('#fdd835')
    for (const role of roles) {
      const badge = screen.getByText(role)
      expect(colorContrast(badge.style.color || '#fff', badge.style.backgroundColor), role).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each<{
    roles: [string, string | null][]
    votes: [string, string][]
    counts: string[]
  }>([
    { roles: [['be', 'BE']], votes: [['be', '3']], counts: ['3 × 1'] },
    {
      roles: [['be', 'BE'], ['custom', 'Designer']],
      votes: [['be', '3'], ['custom', '8']],
      counts: ['3 × 1', '8 × 1'],
    },
    { roles: [['custom', 'Designer']], votes: [['custom', '8']], counts: ['8 × 1'] },
  ])('shows all votes without a badge with fewer than two role rows: $counts', async ({ roles, votes, counts }) => {
    setRoles(roles)
    setRound(votes)
    render(<HistoryModal onClose={vi.fn()} />)
    const card = await screen.findByTestId('history-round')
    const rows = card.lastElementChild!.children
    expect(rows).toHaveLength(1)
    expect(Array.from(rows[0]!.children, chip => chip.textContent)).toEqual(counts)
  })

  it('groups departed and unassigned players as DEV', async () => {
    setRoles([['be', 'BE'], ['unassigned', null]])
    setRound([['be', '5'], ['departed', '3'], ['unassigned', '3']])
    render(<HistoryModal onClose={vi.fn()} />)
    const card = await screen.findByTestId('history-round')
    expect(Array.from(card.lastElementChild!.children, row => row.textContent)).toEqual([
      'DEV3 × 2', 'BE5 × 1',
    ])
  })

  it('keeps the round average and alignment based on the pooled estimators', async () => {
    setRoles([['be', 'BE'], ['fe', 'FE'], ['po', 'PO'], ['custom', 'Designer']])
    setRound([['be', '3'], ['fe', '3'], ['po', '8'], ['custom', '1']])
    render(<HistoryModal onClose={vi.fn()} />)
    await screen.findByTestId('history-round')
    expect(screen.getByText('3.0')).toBeDefined()
    expect(screen.getByText('100')).toBeDefined()
  })

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
