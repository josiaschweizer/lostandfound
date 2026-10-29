import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AiButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  children: ReactNode
  className?: string
}

/** Einheitlicher Auslöser für KI-Vorschläge. Ergebnisse landen immer zuerst im Formular zum Prüfen. */
export const AiButton = ({ onClick, loading, disabled, children, className }: AiButtonProps) => (
  <Button
    variant="secondary"
    size="sm"
    icon={<Sparkles className="size-4 text-brand-600" aria-hidden />}
    loading={loading}
    disabled={disabled}
    onClick={onClick}
    className={className}
  >
    {children}
  </Button>
)

export const AiNote = ({ children = 'KI-Vorschlag – bitte prüfen und bei Bedarf anpassen.' }: { children?: ReactNode }) => (
  <p className="flex items-center gap-1 text-xs text-brand-700">
    <Sparkles className="size-3.5" aria-hidden /> {children}
  </p>
)
