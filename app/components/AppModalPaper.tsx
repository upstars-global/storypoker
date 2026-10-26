import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import { useRipple } from '~/hooks/useRipple'

type AppModalPaperProps = {
  className?: string
  style?: CSSProperties
  onClose: () => void
  children: ReactNode
}

export default function AppModalPaper({ className, style, onClose, children }: AppModalPaperProps) {
  const { t } = useTranslation()
  const ripple = useRipple<HTMLButtonElement>()
  return (
    <div
      className={className ? `mui-modal-paper ${className}` : 'mui-modal-paper'}
      style={style}
      onPointerDown={event => event.stopPropagation()}
    >
      {children}
      <button
        ref={ripple}
        type="button"
        className="mui-icon-btn absolute"
        style={{ top: '12px', right: '12px' }}
        aria-label={t('common.close')}
        onClick={onClose}
      >
        <AppIcon
          className="mui-svg-icon"
          name="ic:baseline-close"
          style={{ fontSize: '1.5rem' }}
        />
      </button>
    </div>
  )
}
