import { useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { getSupabase } from '~/lib/supabase-instance'

export const REPORT_ISSUE_URL = 'https://github.com/upstars-global/storypoker/issues'
export const REPORT_ISSUE_BUCKET = 'app-assets'
export const REPORT_ISSUE_PREVIEW_PATH = 'report-issue/nice.gif'

function previewUrl(): string {
  return getSupabase().storage.from(REPORT_ISSUE_BUCKET).getPublicUrl(REPORT_ISSUE_PREVIEW_PATH).data.publicUrl
}

function matchesMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

const HOVER_POINTER_TYPES = new Set(['mouse', 'pen'])

export default function ReportIssueTab() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  function show() {
    if (matchesMedia('(prefers-reduced-motion: reduce)')) return
    if (!src) setSrc(previewUrl())
    setOpen(true)
  }

  return (
    <div
      className="fixed right-0 top-1/2 z-30 -translate-y-1/2"
      onPointerEnter={(event: PointerEvent) => {
        if (HOVER_POINTER_TYPES.has(event.pointerType)) show()
      }}
      onPointerLeave={() => setOpen(false)}
    >
      <a
        href={REPORT_ISSUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="report-issue-tab"
        data-testid="report-issue-tab"
        aria-label={t('reportIssue.label')}
        onFocus={() => {
          if (!matchesMedia('(hover: none)')) show()
        }}
        onBlur={() => setOpen(false)}
      >
        <span
          className="flex sm:hidden"
          data-testid="report-issue-icon"
        >
          <AppIcon
            name="ic:baseline-feedback"
            style={{ fontSize: '1.25rem' }}
          />
        </span>
        <span
          className="sr-only sm:not-sr-only"
          data-testid="report-issue-label"
        >
          {t('reportIssue.label')}
        </span>
      </a>
      {src && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className={open ? 'report-issue-preview' : 'report-issue-preview hidden'}
          data-testid="report-issue-preview"
        />
      )}
    </div>
  )
}
