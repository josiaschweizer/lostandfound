import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { ToastContext, type ToastOptions } from './toastContext'

interface ToastState extends ToastOptions {
  id: number
}

const DURATION_MS = 5000

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current)
    setToast({ ...options, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), DURATION_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])
  const value = useMemo(() => show, [show])

  return (
    <ToastContext value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav)+var(--sticky-bar)+1rem)] z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-lg ${toast.tone === 'error' ? 'bg-red-700' : 'bg-stone-900'}`}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 font-semibold text-brand-200 hover:bg-white/10"
                onClick={() => {
                  toast.action?.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" aria-label={t.common.close} className="flex size-11 items-center justify-center rounded-lg hover:bg-white/10" onClick={() => setToast(null)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </ToastContext>
  )
}
