import { Mail, MailCheck, MailWarning, MailX } from 'lucide-react'
import { Link } from 'react-router'
import { formatDateTime } from '@/domain/dates'
import type { EmailDeliveryStatus, SimulatedEmail } from '@/domain/types'
import { Badge } from '../ui/Layout'
import { cn } from '../ui/cn'

const DELIVERY: Record<EmailDeliveryStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'neutral'; icon: typeof Mail; box: string }> = {
  sent: { label: 'E-Mail versendet', tone: 'green', icon: MailCheck, box: 'border-emerald-200 bg-emerald-50/50' },
  pending: { label: 'Wird versendet …', tone: 'amber', icon: Mail, box: 'border-amber-200 bg-amber-50/50' },
  failed: { label: 'Versand fehlgeschlagen', tone: 'red', icon: MailWarning, box: 'border-red-200 bg-red-50/50' },
  skipped: { label: 'Nur simuliert – nicht versendet', tone: 'neutral', icon: MailX, box: 'border-dashed border-accent-600/40 bg-accent-50/60' },
}

/** Nachricht aus dem Postausgang mit Versandstatus. */
export const SimulatedEmailCard = ({ email }: { email: SimulatedEmail }) => {
  const d = DELIVERY[email.deliveryStatus]
  const Icon = d.icon
  return (
    <article className={cn('rounded-xl border p-4 text-sm', d.box)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Icon className="size-4 text-stone-500" aria-hidden />
        <Badge tone={d.tone}>{d.label}</Badge>
        <span className="text-xs text-stone-500">{formatDateTime(email.sentAt ?? email.createdAt)}</span>
      </div>
      <p className="text-xs text-stone-600">An: {email.recipient}</p>
      <p className="mt-1 font-semibold text-stone-900">{email.subject}</p>
      <p className="mt-2 whitespace-pre-line text-stone-700">{email.body}</p>
      {email.linkPath && (
        <Link to={email.linkPath} className="mt-2 inline-block font-medium text-brand-700 underline underline-offset-2">
          Link in der E-Mail öffnen
        </Link>
      )}
      {email.deliveryNote && email.deliveryStatus !== 'sent' && <p className="mt-2 text-xs text-stone-500">{email.deliveryNote}</p>}
    </article>
  )
}
