import { useMemo, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { ClipboardList, Hand, Inbox, Trash2 } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import { linkPath, parseSavedLinks, readSavedLinksRaw, removeLink, SAVED_LINKS_EVENT } from '@/lib/savedLinks'
import { EmptyState } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'

const subscribe = (onChange: () => void) => {
  window.addEventListener(SAVED_LINKS_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(SAVED_LINKS_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Zusatz zum Link in der E-Mail: Meldungen und Anfragen aus diesem Browser (KONZEPT 5.8). */
export const MyReportsPage = () => {
  const raw = useSyncExternalStore(subscribe, readSavedLinksRaw, () => '')
  const links = useMemo(() => parseSavedLinks(raw), [raw])
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.myReports.title} lead={t.myReports.lead} />
      {links.length === 0 ? (
        <EmptyState icon={<Inbox className="size-6" />} title={t.myReports.empty} />
      ) : (
        <Card className="divide-y divide-stone-100">
          {links.map((link) => (
            <div key={link.token} className="flex items-center gap-3 p-3 sm:p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {link.kind === 'loss' ? <ClipboardList className="size-5" aria-hidden /> : <Hand className="size-5" aria-hidden />}
              </span>
              <Link to={linkPath(link)} className="min-w-0 flex-1 py-1 hover:text-brand-700">
                <span className="block truncate font-medium">{link.title}</span>
                <span className="block text-sm text-stone-600">
                  {link.kind === 'loss' ? t.myReports.loss : t.myReports.claim} · {formatDateTime(link.createdAt)}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => removeLink(link.token)}
                aria-label={t.myReports.remove(link.title)}
                className="flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
