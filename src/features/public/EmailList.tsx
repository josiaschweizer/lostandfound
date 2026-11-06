import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import type { Email } from '@/domain/types'

/** Nachrichten an die suchende Person (gleicher Inhalt wie die E-Mail). */
export const EmailList = ({ emails }: { emails: Email[] }) => (
  <ul className="space-y-3">
    {emails.map((email) => (
      <li key={email.id} className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
        <p className="flex items-center gap-2 text-sm text-stone-600">
          <Mail className="size-4" aria-hidden /> {formatDateTime(email.createdAt)} · {t.labels.deliveryStatus[email.deliveryStatus]}
        </p>
        <p className="mt-1 font-semibold">{email.subject}</p>
        <p className="mt-1 whitespace-pre-line text-stone-800">{email.body}</p>
        {email.linkPath && (
          <Link to={email.linkPath} className="mt-1 inline-flex min-h-11 items-center font-medium text-brand-700 underline underline-offset-2">
            {t.admin.outbox.openLink}
          </Link>
        )}
      </li>
    ))}
  </ul>
)
