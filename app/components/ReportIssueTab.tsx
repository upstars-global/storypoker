import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSupabase } from '~/lib/supabase-instance'

export const REPORT_ISSUE_URL = 'https://github.com/upstars-global/storypoker/issues'
export const REPORT_ISSUE_BUCKET = 'app-assets'
export const REPORT_ISSUE_PREVIEW_PATH = 'report-issue/nice.gif'

function previewUrl(): string {
  return getSupabase().storage.from(REPORT_ISSUE_BUCKET).getPublicUrl(REPORT_ISSUE_PREVIEW_PATH).data.publicUrl
}

export default function ReportIssueTab() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  function show() {
    if (!src) setSrc(previewUrl())
    setOpen(true)
  }

  return (
    <div
      className="fixed right-0 top-1/2 z-30 -translate-y-1/2"
      onPointerEnter={show}
      onPointerLeave={() => setOpen(false)}
    >
      <a
        href={REPORT_ISSUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="report-issue-tab"
        data-testid="report-issue-tab"
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        {t('reportIssue.label')}
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
