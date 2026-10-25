import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { useRipple } from '~/hooks/useRipple'

type AppMenuProps = {
  label: string
  testId?: string
  triggerClassName: string
  triggerStyle?: CSSProperties
  minWidth: string
  sideOffset?: number
  alignOffset?: number
  trigger: ReactNode
  children: ReactNode
}

export function AppMenu({ label, testId, triggerClassName, triggerStyle, minWidth, sideOffset = 4, alignOffset = 0, trigger, children }: AppMenuProps) {
  const ripple = useRipple<HTMLButtonElement>()
  return (
    <DropdownMenu modal={false}>
      <div style={{ position: 'relative' }}>
        <DropdownMenuTrigger
          ref={ripple}
          type="button"
          className={triggerClassName}
          style={triggerStyle}
          aria-label={label}
          data-testid={testId}
        >
          {trigger}
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        style={{ minWidth }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppMenuItem(props: Omit<ComponentProps<typeof DropdownMenuItem>, 'ref'>) {
  const ripple = useRipple<HTMLDivElement>()
  return (
    <DropdownMenuItem
      ref={ripple}
      {...props}
    />
  )
}
