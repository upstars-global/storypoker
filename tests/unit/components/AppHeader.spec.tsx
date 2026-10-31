import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import '~/i18n'
import AppHeader from '~/components/AppHeader'
import { themeStore } from '~/hooks/useTheme'

function mountHeader() {
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  )
  return screen.getByTestId('account-menu-button')
}

async function openFromKeyboard(trigger: HTMLElement) {
  await act(async () => {
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  })
  return screen.findByRole('menu')
}

beforeEach(() => {
  themeStore.setState({ palette: 'classic' })
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('AppHeader palette menu', () => {
  it('keeps appearance and volume controls inside the account menu', async () => {
    const trigger = mountHeader()
    expect(screen.queryByTestId('volume-slider')).toBeNull()
    expect(screen.queryByTestId('theme-toggle-button')).toBeNull()
    expect(screen.queryByTestId('palette-option-classic')).toBeNull()
    await act(async () => { fireEvent.click(trigger) })
    const menu = await screen.findByRole('menu')
    expect(menu.contains(screen.getByTestId('volume-slider'))).toBe(true)
    expect(menu.contains(screen.getByTestId('theme-toggle-button'))).toBe(true)
    expect(menu.contains(screen.getByTestId('palette-option-classic'))).toBe(true)
  })

  it('opens on click with radio items for every palette', async () => {
    const trigger = mountHeader()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await act(async () => {
      fireEvent.click(trigger)
    })
    const menu = await screen.findByRole('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(menu.classList.contains('mui-menu')).toBe(true)
    const classic = screen.getByTestId('palette-option-classic')
    expect(classic.getAttribute('role')).toBe('menuitemradio')
    expect(classic.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('palette-option-matcha').getAttribute('aria-checked')).toBe('false')
  })

  it('picks a palette with Enter, closes and returns focus to the trigger', async () => {
    const trigger = mountHeader()
    await openFromKeyboard(trigger)
    const matcha = screen.getByTestId('palette-option-matcha')
    await act(async () => {
      fireEvent.keyDown(matcha, { key: 'Enter' })
    })
    expect(themeStore.getState().palette).toBe('matcha')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const trigger = mountHeader()
    const menu = await openFromKeyboard(trigger)
    await act(async () => {
      fireEvent.keyDown(menu, { key: 'Escape' })
    })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })
})
