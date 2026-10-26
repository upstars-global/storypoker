import { useRef, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { Dialog, DialogPopup, DialogPortal } from '~/components/ui/dialog'

type AppModalProps = {
  open: boolean
  lockDismiss?: boolean
  labelledby?: string
  describedby?: string
  initialFocus?: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
}

export default function AppModal({ open, lockDismiss = false, labelledby, describedby, initialFocus, onClose, children }: AppModalProps) {
  const popupRef = useRef<HTMLDivElement | null>(null)

  function onOpenChange(next: boolean) {
    if (!next && !lockDismiss) onClose()
  }

  function onOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !lockDismiss) onClose()
  }

  return (
    <Dialog
      open={open}
      modal="trap-focus"
      disablePointerDismissal
      onOpenChange={onOpenChange}
    >
      <DialogPortal>
        <DialogPopup
          ref={popupRef}
          render={<dialog open />}
          className="app-modal"
          initialFocus={initialFocus ?? popupRef}
          aria-labelledby={labelledby}
          aria-describedby={describedby}
        >
          <div
            className="mui-modal-overlay"
            onClick={onOverlayClick}
          >
            {children}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
