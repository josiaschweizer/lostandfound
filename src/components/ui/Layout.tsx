import type { ReactNode } from 'react'
import { cn } from './cn'

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('rounded-2xl bg-white shadow-xs ring-1 ring-stone-200', className)}>{children}</div>
)

export const CardSection = ({ title, description, children, className, actions }: { title?: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) => (
  <Card className={cn('p-5 sm:p-6', className)}>
    {(title || actions) && (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-semibold text-stone-900">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </Card>
)

export const PageHeader = ({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="mb-1 text-sm text-stone-500">{eyebrow}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-stone-600">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
)

export const Badge = ({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'green' | 'amber' | 'blue' | 'red' | 'violet'; children: ReactNode; className?: string }) => {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200',
    red: 'bg-red-50 text-red-800 ring-red-200',
    violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>{children}</span>
}

export const DefinitionList = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
    {items.map(({ label, value }) => (
      <div key={label} className="contents">
        <dt className="text-stone-500">{label}</dt>
        <dd className="font-medium text-stone-900">{value || <span className="font-normal text-stone-400">–</span>}</dd>
      </div>
    ))}
  </dl>
)
