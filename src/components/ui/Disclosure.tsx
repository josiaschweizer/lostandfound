import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

interface DisclosureProps {
  title: ReactNode
  summary?: ReactNode
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

export const Disclosure = ({ title, summary, defaultOpen, className, children }: DisclosureProps) => (
  <details open={defaultOpen} className={cn('group rounded-2xl bg-white shadow-xs ring-1 ring-stone-200', className)}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block font-semibold text-stone-900">{title}</span>
        {summary && <span className="block truncate text-sm text-stone-500">{summary}</span>}
      </span>
      <ChevronDown className="size-5 shrink-0 text-stone-400 transition group-open:rotate-180" aria-hidden />
    </summary>
    <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
  </details>
)
