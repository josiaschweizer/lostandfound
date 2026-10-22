import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

const CLASSES = 'inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900'

interface BackLinkProps {
  to: string
  label?: string
  /** Zur vorherigen Seite zurück (z. B. um Suchfilter zu behalten), sonst zu `to`. */
  preferHistory?: boolean
}

export const BackLink = ({ to, label = 'Zurück', preferHistory = false }: BackLinkProps) => {
  const navigate = useNavigate()
  const hasHistory = (window.history.state as { idx?: number } | null)?.idx
  if (preferHistory && hasHistory) {
    return (
      <button type="button" onClick={() => navigate(-1)} className={CLASSES}>
        <ArrowLeft className="size-4" aria-hidden /> {label}
      </button>
    )
  }
  return (
    <Link to={to} className={CLASSES}>
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Link>
  )
}
