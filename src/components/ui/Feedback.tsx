import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { toUserMessage } from '@/services/errors'
import { cn } from './cn'

type Tone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: 'bg-sky-50 text-sky-950 ring-sky-200', icon: Info },
  success: { box: 'bg-emerald-50 text-emerald-950 ring-emerald-200', icon: CheckCircle2 },
  warning: { box: 'bg-amber-50 text-amber-950 ring-amber-200', icon: AlertTriangle },
  error: { box: 'bg-red-50 text-red-950 ring-red-200', icon: XCircle },
}

export const Alert = ({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) => {
  const { box, icon: Icon } = TONES[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-2xl p-4 ring-1', box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-base">{children}</div>}
      </div>
    </div>
  )
}

export const Spinner = ({ label = t.common.loading }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-12 text-stone-600">
    <span className="size-5 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" aria-hidden />
    {label}
  </div>
)

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-xl bg-stone-200/70', className)} aria-hidden />

export const EmptyState = ({ icon, title, children, action, as: Heading = 'p' }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; as?: 'p' | 'h1' | 'h2' }) => (
  <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
    {icon && <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">{icon}</div>}
    <Heading className="text-lg font-semibold text-stone-900">{title}</Heading>
    {children && <div className="mx-auto mt-1 max-w-md text-stone-600">{children}</div>}
    {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>
)

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <Alert tone="error" title={toUserMessage(error)}>
    {onRetry && (
      <button type="button" onClick={onRetry} className="mt-1 font-medium underline underline-offset-2">
        {t.common.retry}
      </button>
    )}
  </Alert>
)

type BadgeTone = 'neutral' | 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'accent'

const BADGES: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-800 ring-stone-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-900 ring-amber-300',
  red: 'bg-red-50 text-red-800 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100',
}

export const Badge = ({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset', BADGES[tone], className)}>
    {children}
  </span>
)
