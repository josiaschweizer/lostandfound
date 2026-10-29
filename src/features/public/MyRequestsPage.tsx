import { ClipboardList, Inbox, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { useSavedLinks } from '@/app/useSavedLinks'
import { formatDateTime } from '@/domain/dates'
import { linkPath, removeLink } from '@/lib/localTokens'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'

export const MyRequestsPage = () => {
  const links = useSavedLinks()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Meine Anfragen"
        description="Ihre Rückgabeanfragen und Verlustmeldungen aus diesem Browser. Auf einem anderen Gerät öffnen Sie den Link aus der Bestätigungs-E-Mail."
      />
      {links.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title="Noch nichts gesendet"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink to="/suche">Gegenstand suchen</ButtonLink>
              <ButtonLink to="/verlust-melden" variant="secondary">
                Verlust melden
              </ButtonLink>
            </div>
          }
        >
          Sobald Sie eine Rückgabe anfragen oder einen Verlust melden, finden Sie den Stand hier.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {links.map((link) => (
            <div key={link.token} className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {link.kind === 'request' ? <Inbox className="size-5" aria-hidden /> : <ClipboardList className="size-5" aria-hidden />}
              </span>
              <Link to={linkPath(link)} className="min-w-0 flex-1 hover:text-brand-700">
                <span className="block truncate font-medium">{link.title}</span>
                <span className="block text-xs text-stone-500">
                  {link.kind === 'request' ? 'Rückgabeanfrage' : 'Verlustmeldung'} · {formatDateTime(link.createdAt)}
                </span>
              </Link>
              <ButtonLink to={linkPath(link)} size="sm" variant="secondary">
                Stand ansehen
              </ButtonLink>
              <button
                type="button"
                onClick={() => removeLink(link.token)}
                className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label={`«${link.title}» aus dieser Liste entfernen`}
                title="Aus Liste entfernen"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
