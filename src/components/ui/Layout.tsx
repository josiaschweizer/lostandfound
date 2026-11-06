import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export const Card = ({ className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { 'data-testid'?: string }) => (
  <div {...rest} className={cn('rounded-3xl bg-white shadow-xs ring-1 ring-stone-200/80', className)}>
    {children}
  </div>
)

export const Section = ({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <Card className={cn('p-4 sm:p-6', className)}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-stone-600">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </Card>
)

export const PageHeader = ({ title, lead, eyebrow, actions }: { title: ReactNode; lead?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
    <div className="min-w-0">
      {eyebrow && <div className="mb-1 text-sm font-medium text-brand-700">{eyebrow}</div>}
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
      {lead && <p className="mt-1 text-stone-600">{lead}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
)

/** Zwei Spalten «Bezeichnung: Wert», leere Werte werden ausgelassen. */
export const DefinitionList = ({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) => (
  <dl className={cn('grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,auto)_1fr]', className)}>
    {items
      .filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
      .map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-sm text-stone-600 sm:text-base">{item.label}</dt>
          <dd className="font-medium break-words text-stone-900 max-sm:mb-1">{item.value}</dd>
        </div>
      ))}
  </dl>
)
