import { Check } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const Stepper = ({ steps, current }: { steps: string[]; current: number }) => (
  <ol className="mb-8 grid gap-2 sm:auto-cols-fr sm:grid-flow-col" aria-label="Fortschritt">
    {steps.map((label, index) => {
      const done = index < current
      const active = index === current
      return (
        <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              done && 'bg-brand-600 text-white',
              active && 'bg-brand-100 text-brand-800 ring-2 ring-brand-600',
              !done && !active && 'bg-stone-200 text-stone-600',
            )}
          >
            {done ? <Check className="size-4" aria-hidden /> : index + 1}
          </span>
          <span className={cn(active ? 'font-semibold text-stone-900' : 'text-stone-600')}>{label}</span>
        </li>
      )
    })}
  </ol>
)
