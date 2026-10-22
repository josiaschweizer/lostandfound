import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from './cn'

type Tone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', icon: <Info className="size-5 text-sky-600" /> },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: <CheckCircle2 className="size-5 text-emerald-600" /> },
  warning: { box: 'bg-accent-50 text-accent-700 ring-accent-100', icon: <AlertTriangle className="size-5 text-accent-600" /> },
  error: { box: 'bg-red-50 text-red-900 ring-red-200', icon: <XCircle className="size-5 text-red-600" /> },
}

export const Alert = ({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl p-4 text-sm ring-1 ring-inset', TONES[tone].box, className)}>
    <span className="shrink-0">{TONES[tone].icon}</span>
    <div className="space-y-1">
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="leading-relaxed">{children}</div>}
    </div>
  </div>
)

export const Spinner = ({ label = 'Wird geladen …' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-stone-500" role="status">
    <span className="size-5 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" aria-hidden />
    {label}
  </div>
)

export const EmptyState = ({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
    {icon && <div className="mb-3 rounded-full bg-stone-100 p-3 text-stone-500">{icon}</div>}
    <p className="font-semibold text-stone-900">{title}</p>
    {children && <div className="mt-1 max-w-md text-sm text-stone-600">{children}</div>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export const ErrorState = ({ error }: { error: unknown }) => (
  <Alert tone="error" title="Daten konnten nicht geladen werden">
    {error instanceof Error ? error.message : 'Bitte Seite neu laden.'}
  </Alert>
)
