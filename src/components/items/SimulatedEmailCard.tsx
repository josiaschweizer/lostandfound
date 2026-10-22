import { Mail } from 'lucide-react'
import { Link } from 'react-router'
import { formatDateTime } from '@/domain/dates'
import type { SimulatedEmail } from '@/domain/types'
import { Badge } from '../ui/Layout'

/** Zeigt eine E-Mail, die im Prototyp NICHT versendet, sondern nur simuliert wird. */
export const SimulatedEmailCard = ({ email }: { email: SimulatedEmail }) => (
  <article className="rounded-xl border border-dashed border-accent-600/40 bg-accent-50/60 p-4 text-sm">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Mail className="size-4 text-accent-600" aria-hidden />
      <Badge tone="amber">Simulierte E-Mail – nicht versendet</Badge>
      <span className="text-xs text-stone-500">{formatDateTime(email.createdAt)}</span>
    </div>
    <p className="text-xs text-stone-600">An: {email.recipient}</p>
    <p className="mt-1 font-semibold text-stone-900">{email.subject}</p>
    <p className="mt-2 whitespace-pre-line text-stone-700">{email.body}</p>
    {email.linkPath && (
      <Link to={email.linkPath} className="mt-2 inline-block font-medium text-brand-700 underline underline-offset-2">
        Link in der E-Mail öffnen
      </Link>
    )}
  </article>
)
