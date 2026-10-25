import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import { AppMenu, AppMenuItem } from '~/components/AppMenu'

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
