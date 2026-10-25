import { describe, it, expect, afterEach } from 'vitest'
import { useEffect, useRef, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useMenuKeyboard } from '~/hooks/useMenuKeyboard'

let picked: string | null = null
let setOpenFromTest: (value: boolean) => void = () => {}

function Host() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const menuEl = useRef<HTMLUListElement | null>(null)
  const { onKeydown, onFocusout } = useMenuKeyboard(open, setOpen, trigger, menuEl)
  useEffect(() => { setOpenFromTest = setOpen }, [])
  return (
    <div>
      <button ref={trigger} aria-expanded={open} onClick={() => setOpen(!open)}>menu</button>
      {open && (
        <ul ref={menuEl} role="menu" onKeyDown={onKeydown} onBlur={onFocusout}>
          <li role="menuitem" tabIndex={-1} onClick={() => { picked = 'a' }}>A</li>
          <li role="menuitemradio" tabIndex={-1} aria-checked={false} onClick={() => { picked = 'b' }}>B</li>
          <li role="menuitem" tabIndex={-1} onClick={() => { picked = 'c' }}>C</li>
        </ul>
      )}
    </div>
  )
}

function mountHost() {
  picked = null
  return render(<Host />)
}

function openMenu() {
  fireEvent.click(screen.getByRole('button'))
  return Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
}

function menu() {
  return document.querySelector<HTMLElement>('[role="menu"]')
}

describe('useMenuKeyboard', () => {
  afterEach(() => cleanup())

  it('focuses the first item on open', () => {
    mountHost()
    const items = openMenu()
    expect(document.activeElement).toBe(items[0])
  })

  it('moves with ArrowDown/ArrowUp and wraps around', () => {
    mountHost()
    const items = openMenu()
    fireEvent.keyDown(menu()!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(menu()!, { key: 'ArrowDown' })
    fireEvent.keyDown(menu()!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(menu()!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[2])
  })

  it('jumps with Home and End', () => {
    mountHost()
    const items = openMenu()
    fireEvent.keyDown(menu()!, { key: 'End' })
    expect(document.activeElement).toBe(items[2])
    fireEvent.keyDown(menu()!, { key: 'Home' })
    expect(document.activeElement).toBe(items[0])
  })

  it('activates a menuitemradio with Enter', () => {
    mountHost()
    const items = openMenu()
    fireEvent.keyDown(items[1]!, { key: 'Enter' })
    expect(picked).toBe('b')
  })

  it('closes with Escape and returns focus to the trigger', () => {
    mountHost()
    openMenu()
    fireEvent.keyDown(menu()!, { key: 'Escape' })
    expect(menu()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button'))
  })

  it('closes when focus leaves the menu with Tab', () => {
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    mountHost()
    const items = openMenu()
    fireEvent.focusOut(items[0]!, { relatedTarget: outside })
    expect(menu()).toBeNull()
    outside.remove()
  })

  it('stays open while focus moves between its own items', () => {
    mountHost()
    const items = openMenu()
    fireEvent.focusOut(items[0]!, { relatedTarget: items[1]! })
    expect(menu()).not.toBeNull()
  })

  it('leaves focus alone when the menu closes because focus moved elsewhere', () => {
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    mountHost()
    openMenu()
    outside.focus()
    act(() => setOpenFromTest(false))
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})
