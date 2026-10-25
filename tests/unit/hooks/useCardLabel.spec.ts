import { describe, it, expect, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { i18n, persistLocale } from '~/i18n'
import { useCardLabel } from '~/hooks/useCardLabel'
import uk from '~/i18n/locales/uk.json'
import en from '~/i18n/locales/en.json'

describe('useCardLabel', () => {
  afterEach(async () => {
    await act(() => persistLocale('uk'))
    localStorage.clear()
  })

  it('translates yes/no cards and their Ukrainian aliases', () => {
    const { result } = renderHook(() => useCardLabel())
    expect(result.current('yes')).toBe(uk.deck.cardLabels.yes)
    expect(result.current('no')).toBe(uk.deck.cardLabels.no)
    expect(result.current('За')).toBe(uk.deck.cardLabels.yes)
    expect(result.current('Проти')).toBe(uk.deck.cardLabels.no)
  })

  it('returns other cards unchanged', () => {
    const { result } = renderHook(() => useCardLabel())
    expect(result.current('13')).toBe('13')
    expect(result.current('?')).toBe('?')
  })

  it('follows the active language', async () => {
    const { result } = renderHook(() => useCardLabel())
    await act(() => persistLocale('en'))
    expect(i18n.language).toBe('en')
    expect(result.current('yes')).toBe(en.deck.cardLabels.yes)
  })
})
