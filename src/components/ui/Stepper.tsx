import { Check } from 'lucide-react'
import { cn } from './cn'

export const Stepper = ({ steps, current, className }: { steps: string[]; current: number; className?: string }) => (
  <ol className={cn('mb-6 grid auto-cols-fr grid-flow-col gap-2 sm:mb-8', className)} aria-label="Fortschritt">
    {steps.map((label, index) => {
      const done = index < current
      const active = index === current
      return (
        <li key={label} aria-current={active ? 'step' : undefined} className="flex flex-col items-center gap-1.5 text-center text-xs sm:flex-row sm:text-left sm:text-sm">
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
