import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import { AppMenu, AppMenuItem } from '~/components/AppMenu'
import PlayerRow from '~/components/PlayerRow'

const onToggleModerator = vi.fn()
const onEdit = vi.fn()
const onLeave = vi.fn()

function PlayerMenu({ name }: { name: string }) {
  return (
    <AppMenu
      label={i18n.t('players.menuFor', { name })}
      triggerClassName="mui-icon-btn"
      minWidth="200px"
      trigger="more"
    >
      <AppMenuItem onClick={() => onToggleModerator('p1', true)}>moderator</AppMenuItem>
      <AppMenuItem onClick={() => onEdit('p1')}>edit</AppMenuItem>
      <AppMenuItem onClick={() => onLeave('p1')}>leave</AppMenuItem>
    </AppMenu>
  )
}

function mountRow() {
  vi.clearAllMocks()
  render(<PlayerMenu name="Alice" />)
  return screen.getByRole('button', { name: i18n.t('players.menuFor', { name: 'Alice' }) })
}

async function openMenu(trigger: HTMLElement) {
  await act(async () => {
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  })
  const menu = await screen.findByRole('menu')
  return { menu, items: screen.getAllByRole('menuitem') }
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('PlayerRow menu keyboard support', () => {
  it('opens from the keyboard and focuses the first item', async () => {
    const trigger = mountRow()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const { menu, items } = await openMenu(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(menu.classList.contains('mui-menu')).toBe(true)
    expect(menu.style.minWidth).toBe('200px')
    expect(items.every(item => item.classList.contains('mui-menu-item'))).toBe(true)
    expect(document.activeElement).toBe(items[0])
  })

  it('activates a menu item with Enter', async () => {
    const { items } = await openMenu(mountRow())
    await act(async () => {
      fireEvent.keyDown(items[1]!, { key: 'Enter' })
    })
    expect(onEdit).toHaveBeenCalledWith('p1')
  })

  it('activates a menu item with Space', async () => {
    const { items } = await openMenu(mountRow())
    await act(async () => {
      fireEvent.keyDown(items[0]!, { key: ' ' })
      fireEvent.keyUp(items[0]!, { key: ' ' })
    })
    expect(onToggleModerator).toHaveBeenCalledWith('p1', true)
  })

  it('moves focus between items with ArrowDown', async () => {
    const { items } = await openMenu(mountRow())
    expect(document.activeElement).toBe(items[0])
    await act(async () => {
      fireEvent.keyDown(items[0]!, { key: 'ArrowDown' })
    })
    expect(document.activeElement).toBe(items[1])
  })

  it('closes the menu with Escape and returns focus to the trigger', async () => {
    const trigger = mountRow()
    const { items } = await openMenu(trigger)
    await act(async () => {
      fireEvent.keyDown(items[0]!, { key: 'Escape' })
    })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

describe('PlayerRow menu button name', () => {
  it('names the menu button after the player', () => {
    const trigger = mountRow()
    expect(i18n.getFixedT('en')('players.menuFor', { name: 'Alice' })).toBe('Player menu: Alice')
    expect(trigger.getAttribute('aria-label')).toBe(i18n.t('players.menuFor', { name: 'Alice' }))
    expect(trigger.getAttribute('aria-label')).toContain('Alice')
  })
})

type RowProps = ComponentProps<typeof PlayerRow>

function renderRow(overrides: Partial<RowProps> & { shields?: string[]; isModeratorPlayer?: boolean } = {}) {
  const { shields, isModeratorPlayer, ...rest } = overrides
  const props: RowProps = {
    player: {
      id: 'p1',
      name: 'Alice',
      is_moderator: isModeratorPlayer ?? false,
      vote: null,
      is_online: true,
      user_id: null,
      shields: shields ?? [],
      votePending: false,
    },
    phase: 'voting',
    currentPlayerId: 'p1',
    currentUserIsModerator: false,
    currentUserIsAuthorizedModerator: false,
    onEdit: vi.fn(),
    onToggleModerator: vi.fn(),
    onLeave: vi.fn(),
    onKick: vi.fn(),
    ...rest,
  }
  render(<PlayerRow {...props} />)
  return props
}

async function openRowMenu() {
  const trigger = screen.getByRole('button', { name: i18n.t('players.menuFor', { name: 'Alice' }) })
  await act(async () => {
    fireEvent.click(trigger)
  })
  await screen.findByRole('menu')
  return screen.getAllByRole('menuitem')
}

describe('PlayerRow hidden vote marker', () => {
  it('paints the role badge red when the role is hidden from results', () => {
    renderRow({ shields: ['sre'], voteHidden: true })
    const badge = document.querySelector('.mui-role-tag')!
    expect(badge.classList.contains('is-excluded')).toBe(true)
    expect(badge.getAttribute('data-excluded')).toBe('true')
  })

  it('keeps the role badge neutral otherwise', () => {
    renderRow({ shields: ['sre'] })
    const badge = document.querySelector('.mui-role-tag')!
    expect(badge.textContent).toBe('SRE')
    expect(badge.classList.contains('is-excluded')).toBe(false)
    expect(badge.hasAttribute('data-excluded')).toBe(false)
  })
})

describe('PlayerRow row', () => {
  it('exposes the row data attributes and the own-row menu', async () => {
    const props = renderRow()
    const row = screen.getByTestId('player-row')
    expect(row.getAttribute('data-player-name')).toBe('Alice')
    expect(row.getAttribute('data-voted')).toBe('false')
    expect(row.getAttribute('data-vote-pending')).toBe('false')
    const items = await openRowMenu()
    expect(items.map(item => item.textContent)).toEqual([
      i18n.t('players.isModerator'),
      i18n.t('players.edit'),
      i18n.t('players.leaveRoom'),
    ])
    await act(async () => {
      fireEvent.click(items[0]!)
    })
    expect(props.onToggleModerator).toHaveBeenCalledWith('p1', true)
  })

  it('gives a moderator kick, and an authorized moderator edit, on another row', async () => {
    renderRow({ currentPlayerId: 'p2', currentUserIsModerator: true })
    expect((await openRowMenu()).map(item => item.textContent)).toEqual([i18n.t('players.kickPlayer')])
    cleanup()
    const props = renderRow({ currentPlayerId: 'p2', currentUserIsModerator: true, currentUserIsAuthorizedModerator: true })
    const items = await openRowMenu()
    expect(items.map(item => item.textContent)).toEqual([i18n.t('players.edit'), i18n.t('players.kickPlayer')])
    await act(async () => {
      fireEvent.click(items[1]!)
    })
    expect(props.onKick).toHaveBeenCalledWith('p1')
  })

  it('shows no menu on another row for a plain player', () => {
    renderRow({ currentPlayerId: 'p2' })
    expect(screen.queryByRole('button', { name: i18n.t('players.menuFor', { name: 'Alice' }) })).toBeNull()
  })

  it('shows the vote after reveal and truncates long answers', () => {
    renderRow({ phase: 'revealed', truncateVotes: true, player: {
      id: 'p1', name: 'Alice', is_moderator: false, vote: 'Definitely yes', is_online: true,
      user_id: null, shields: [], votePending: false,
    } })
    expect(screen.getByText('Definite')).toBeTruthy()
  })
})
