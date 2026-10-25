import { useId, type ReactElement, type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

type AppTooltipProps = {
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  className?: string
  trigger: ReactElement
  children: ReactNode
}

export default function AppTooltip({ side = 'top', sideOffset = 6, className, trigger, children }: AppTooltipProps) {
  const tooltipId = useId()
  return (
    <Tooltip>
      <span
        className={className}
        style={{ display: 'inline-flex', position: 'relative', alignItems: 'center' }}
      >
        <TooltipTrigger
          render={trigger}
          delay={0}
          closeDelay={0}
          aria-describedby={tooltipId}
        />
      </span>
      <TooltipContent
        id={tooltipId}
        role="tooltip"
        side={side}
        sideOffset={sideOffset}
        keepMounted
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
