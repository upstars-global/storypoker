import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { i18n } from '~/i18n'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import ReportIssueTab, { REPORT_ISSUE_BUCKET, REPORT_ISSUE_PREVIEW_PATH, REPORT_ISSUE_URL } from '~/components/ReportIssueTab'
import { asSupabase } from '../../support/helpers/fakeSupabase'

const PREVIEW_URL = 'https://example.supabase.co/storage/v1/object/public/app-assets/report-issue/nice.gif'
const requested: string[] = []

function mountTab() {
  requested.length = 0
  setSupabase(asSupabase({
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => {
          requested.push(`${bucket}/${path}`)
          return { data: { publicUrl: PREVIEW_URL } }
        },
      }),
    },
  }))
  render(<ReportIssueTab />)
  return screen.getByTestId('report-issue-tab') as HTMLAnchorElement
}

afterEach(() => {
  cleanup()
  resetSupabase()
  vi.restoreAllMocks()
})

describe('ReportIssueTab', () => {
  it('links to the GitHub issues page in a new tab', () => {
    const tab = mountTab()
    expect(tab.href).toBe(REPORT_ISSUE_URL)
    expect(tab.target).toBe('_blank')
    expect(tab.rel).toBe('noopener noreferrer')
    expect(tab.textContent).toBe(i18n.t('reportIssue.label'))
  })

  it('loads the preview from Storage only once the tab is hovered', () => {
    const tab = mountTab()
    expect(screen.queryByTestId('report-issue-preview')).toBeNull()
    fireEvent.pointerEnter(tab.parentElement!)
    const preview = screen.getByTestId('report-issue-preview') as HTMLImageElement
    expect(preview.src).toBe(PREVIEW_URL)
    expect(requested).toEqual([`${REPORT_ISSUE_BUCKET}/${REPORT_ISSUE_PREVIEW_PATH}`])
    expect(preview.classList.contains('hidden')).toBe(false)
    fireEvent.pointerLeave(tab.parentElement!)
    expect(preview.classList.contains('hidden')).toBe(true)
  })

  it('reveals the preview on keyboard focus', () => {
    const tab = mountTab()
    fireEvent.focus(tab)
    expect(screen.getByTestId('report-issue-preview').classList.contains('hidden')).toBe(false)
    fireEvent.blur(tab)
    expect(screen.getByTestId('report-issue-preview').classList.contains('hidden')).toBe(true)
  })

  it('never loads or shows the GIF when the user prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList)
    const tab = mountTab()
    fireEvent.pointerEnter(tab.parentElement!)
    fireEvent.focus(tab)
    expect(screen.queryByTestId('report-issue-preview')).toBeNull()
    expect(requested).toEqual([])
  })
})
