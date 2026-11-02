import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import AlignmentCard from '~/components/AlignmentCard'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('preserves separate row identities for built-in and custom DEV on reorder', () => {
  const error = vi.spyOn(console, 'error')
  const blocks = [{ key: 'DEV', label: 'DEV', value: 100 }, { key: 'custom:DEV', label: 'DEV', value: 40 }]
  const view = render(<AlignmentCard blocks={blocks} />)
  const rows = Array.from(view.container.querySelectorAll('.justify-between'))
  view.rerender(<AlignmentCard blocks={[blocks[1]!, blocks[0]!]} />)
  const reordered = Array.from(view.container.querySelectorAll('.justify-between'))
  expect(reordered).toEqual([rows[1], rows[0]])
  expect(reordered[0]).toBe(rows[1])
  expect(error).not.toHaveBeenCalled()
})
