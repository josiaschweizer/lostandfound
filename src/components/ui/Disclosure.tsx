import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

export const Disclosure = ({ title, summary, children, className, defaultOpen }: { title: ReactNode; summary?: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) => (
  <details className={cn('group rounded-3xl bg-white shadow-xs ring-1 ring-stone-200/80', className)} open={defaultOpen}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block font-semibold text-stone-900">{title}</span>
        {summary && <span className="block text-sm text-stone-600">{summary}</span>}
      </span>
      <ChevronDown className="size-5 shrink-0 text-stone-500 transition group-open:rotate-180" aria-hidden />
    </summary>
    <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
  </details>
)
