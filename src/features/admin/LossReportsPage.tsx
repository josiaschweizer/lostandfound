import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BellRing, CheckCheck, SearchX } from 'lucide-react'
import { formatDate, formatDateTime } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import { findMatches } from '@/domain/matching'
import { toUserMessage } from '@/services/errors'
import { ColorDot } from '@/components/items/ItemVisual'
import { LossReportStatusBadge } from '@/components/items/StatusBadges'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Badge, Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useCloseLossReport, useLossReports, useNotifyMatch, useStaffItems } from './queries'

/** Verlustmeldungen an die eigene Organisation sowie alle «Weiss nicht»-Meldungen, mit Treffern aus dem eigenen Bestand. */
export const LossReportsPage = () => {
  const reports = useLossReports()
  const items = useStaffItems()
  const notify = useNotifyMatch()
  const close = useCloseLossReport()
  const [showClosed, setShowClosed] = useState(false)

  const publicItems = useMemo(() => (items.data ?? []).filter((i) => i.isPublic), [items.data])
  const list = (reports.data ?? []).filter((r) => showClosed || r.status === 'open')

  return (
    <>
      <PageHeader
        title="Verlustmeldungen"
        description="Meldungen an Ihre Organisation und Meldungen mit «Weiss nicht». Treffer stammen aus Ihren öffentlichen Gegenständen."
      />
      <div className="mb-4 flex gap-1" role="tablist">
        {[false, true].map((closed) => (
          <button
            key={String(closed)}
            role="tab"
            aria-selected={showClosed === closed}
            onClick={() => setShowClosed(closed)}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', showClosed === closed ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
          >
            {closed ? 'Alle' : 'Offen'}
          </button>
        ))}
      </div>
      {(notify.isError || close.isError) && <Alert tone="error" className="mb-4">{toUserMessage(notify.error ?? close.error)}</Alert>}
      {notify.isSuccess && (
        <Alert tone={notify.data ? 'success' : 'info'} className="mb-4">
          {notify.data ? 'Simulierte E-Mail an die meldende Person erstellt.' : 'Zu diesem Gegenstand wurde bereits benachrichtigt.'}
        </Alert>
      )}
      {reports.isPending && <Spinner />}
      {reports.isError && <ErrorState error={reports.error} />}
      {reports.isSuccess && list.length === 0 && <EmptyState icon={<SearchX className="size-6" />} title="Keine Verlustmeldungen" />}
      <div className="space-y-4">
        {list.map((report) => {
          const matches = findMatches(report, publicItems)
          return (
            <Card key={report.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{report.title}</h2>
                    <LossReportStatusBadge status={report.status} />
                    {!report.organisationId && <Badge tone="violet">Weiss nicht – an alle Fundstellen</Badge>}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
                    <span>{CATEGORY_LABELS[report.category]}</span>
                    <ColorDot color={report.color} />
                    {report.brand && <span>{report.brand}</span>}
                    <span>verloren am {formatDate(report.lostOn)}</span>
                    {report.lostLocation && <span>{report.lostLocation}</span>}
                  </p>
                  {report.description && <p className="mt-2 text-sm text-stone-700">{report.description}</p>}
                  <p className="mt-2 text-xs text-stone-500">
                    {report.reporterName} · {report.reporterContact} · gemeldet {formatDateTime(report.createdAt)}
                  </p>
                </div>
                {report.status === 'open' && (
                  <Button size="sm" variant="ghost" icon={<CheckCheck className="size-4" />} onClick={() => close.mutate(report.id)}>
                    Als erledigt markieren
                  </Button>
                )}
              </div>
              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="mb-2 text-xs font-medium text-stone-500 uppercase">Mögliche Treffer in Ihrem Bestand</p>
                {matches.length === 0 ? (
                  <p className="text-sm text-stone-500">Kein passender Gegenstand.</p>
                ) : (
                  <ul className="space-y-2">
                    {matches.map(({ item, score }) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                        <Link to={`/verwaltung/gegenstand/${item.id}`} className="font-medium hover:text-brand-700">
                          {item.title} <span className="font-mono text-xs text-stone-500">{item.itemNumber}</span>
                          <span className="ml-2 text-xs text-stone-500">Übereinstimmung: {score}</span>
                        </Link>
                        {report.status === 'open' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<BellRing className="size-4" />}
                            loading={notify.isPending && notify.variables?.reportId === report.id && notify.variables.itemId === item.id}
                            onClick={() => notify.mutate({ reportId: report.id, itemId: item.id })}
                          >
                            Benachrichtigen
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
