import type { CSSProperties } from 'react'
import { mapIconName } from '~/utils/iconMap'
import classes from '~/generated/iconClasses.json'
import colored from '~/generated/coloredIcons.json'

type AppIconProps = {
  name: string
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

function iconRootClass(resolved: string, markup: string): string {
  if (markup) return 'sp-icon-root sp-icon-inline'
  const name = (classes as Record<string, string>)[resolved]
  if (!name && (import.meta.env.DEV || import.meta.env.MODE === 'test')) {
    throw new Error(`Missing local icon: ${resolved}`)
  }
  return `sp-icon-root sp-icon ${name ?? ''}`
}

export default function AppIcon({ name, className, style, 'aria-label': ariaLabel }: AppIconProps) {
  const resolved = mapIconName(name)
  const markup = (colored as Record<string, string>)[resolved] ?? ''
  const rootClass = iconRootClass(resolved, markup)
  return (
    <span
      className={className ? `${rootClass} ${className}` : rootClass}
      style={style}
      aria-hidden="true"
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={markup ? { __html: markup } : undefined}
    />
  )
}
