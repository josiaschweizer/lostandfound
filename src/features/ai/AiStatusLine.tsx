import { Sparkles } from 'lucide-react'
import { cn } from '@/components/ui/cn'

/** Dezente Statuszeile für Arbeit der KI im Hintergrund (aria-live, damit Screenreader sie hören). */
export const AiStatusLine = ({ running, text, className }: { running: boolean; text: string | null; className?: string }) => (
  <p aria-live="polite" className={cn('flex min-h-6 items-center gap-1.5 text-sm font-medium text-violet-800', !text && 'sr-only', className)}>
    {text && <Sparkles className={cn('size-4 shrink-0', running && 'animate-pulse')} aria-hidden />}
    {text}
  </p>
)
