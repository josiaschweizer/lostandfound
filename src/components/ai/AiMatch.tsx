import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/components/ui/cn'

const label = (score: number) => (score >= 85 ? 'Sehr wahrscheinlich' : score >= 65 ? 'Gut möglich' : 'Möglich')

/** Einschätzung der KI als Abzeichen, z. B. «Sehr wahrscheinlich · 88». */
export const AiScoreBadge = ({ score, className }: { score: number; className?: string }) => (
  <span
    title={`KI-Einschätzung ${score} von 100`}
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      score >= 85 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : score >= 65 ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-stone-100 text-stone-700 ring-stone-200',
      className,
    )}
  >
    <Sparkles className="size-3" aria-hidden />
    {label(score)} · {score}
  </span>
)

export const AiReason = ({ children }: { children: ReactNode }) => (children ? <p className="text-xs text-stone-600">{children}</p> : null)
