import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Escape, Fokusfalle und Hintergrund-Sperre liefert das native <dialog>. */
export const Sheet = ({ open, onClose, title, children, footer }: SheetProps) => {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Klick auf den abgedunkelten Hintergrund schliesst
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-3xl bg-white p-0 shadow-2xl backdrop:bg-stone-900/40 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Schliessen">
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="border-t border-stone-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
