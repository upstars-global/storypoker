import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { render } from '@testing-library/react'
import { useClickOutside } from '~/hooks/useClickOutside'

function makeWrapper(handler: () => void) {
  function Comp() {
    const target = useRef<HTMLDivElement | null>(null)
    useClickOutside(target, handler)
    return <div ref={target} data-testid="target" />
  }
  return render(<Comp />)
}

describe('useClickOutside', () => {
  it('calls handler when clicking outside the target', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).toHaveBeenCalledOnce()
    document.body.removeChild(outside)
    wrapper.unmount()
  })

  it('does not call handler when clicking inside the target', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.getByTestId('target').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('removes listener on unmount', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.unmount()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(outside)
  })
})
