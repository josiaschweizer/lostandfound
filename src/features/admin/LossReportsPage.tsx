import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { BellRing, CheckCheck, ChevronDown, SearchX } from 'lucide-react'
import { formatDate, formatDateTime } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import { itemCandidatesForReport, pickAiMatches, toFoundDescription, toLostDescription } from '@/domain/aiMatching'
import { findMatches } from '@/domain/matching'
import type { LossReport, StaffItem } from '@/domain/types'
import { rankMatches } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiButton } from '@/components/ai/AiButton'
import { AiReason, AiScoreBadge } from '@/components/ai/AiMatch'
import { ColorDot } from '@/components/items/ItemVisual'
import { LossReportStatusBadge } from '@/components/items/StatusBadges'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Badge, Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useCloseLossReport, useLossReports, useNotifyMatch, useStaffItems } from './queries'

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
        description="An Ihre Organisation und mit «Weiss nicht». Treffer aus Ihren öffentlichen Gegenständen."
      />
      <div className="mb-4 flex gap-1" role="tablist">
        {[false, true].map((closed) => (
          <button
            key={String(closed)}
            role="tab"
            aria-selected={showClosed === closed}
            onClick={() => setShowClosed(closed)}
            className={cn('rounded-lg px-3 py-2 text-sm font-medium sm:py-1.5', showClosed === closed ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
          >
            {closed ? 'Alle' : 'Offen'}
          </button>
        ))}
      </div>
      {(notify.isError || close.isError) && <Alert tone="error" className="mb-4">{toUserMessage(notify.error ?? close.error)}</Alert>}
      {notify.isSuccess && (
        <Alert tone={notify.data ? 'success' : 'info'} className="mb-4">
          {notify.data ? 'Benachrichtigung an die meldende Person erstellt.' : 'Zu diesem Gegenstand wurde bereits benachrichtigt.'}
        </Alert>
      )}
      {reports.isPending && <Spinner />}
      {reports.isError && <ErrorState error={reports.error} />}
      {reports.isSuccess && list.length === 0 && <EmptyState icon={<SearchX className="size-6" />} title="Keine Verlustmeldungen" />}
      <div className="space-y-4">
        {list.map((report) => {
          return (
            <Card key={report.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{report.title}</h2>
                <LossReportStatusBadge status={report.status} />
                {!report.organisationId && <Badge tone="violet">Weiss nicht – an alle</Badge>}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
                <span>{CATEGORY_LABELS[report.category]}</span>
                <ColorDot color={report.color} />
                {report.brand && <span>{report.brand}</span>}
                <span>verloren am {formatDate(report.lostOn)}</span>
              </p>
              <details className="group mt-2 text-sm">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-brand-700 [&::-webkit-details-marker]:hidden">
                  Details und Kontakt
                  <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-2 space-y-1 text-stone-700">
                  {report.lostLocation && <p>Ort: {report.lostLocation}</p>}
                  {report.description && <p>{report.description}</p>}
                  <p className="text-xs text-stone-500">
                    {report.reporterName} · {report.reporterContact} · gemeldet {formatDateTime(report.createdAt)}
                  </p>
                  {report.status === 'open' && (
                    <Button size="sm" variant="ghost" className="-ml-3" icon={<CheckCheck className="size-4" />} onClick={() => close.mutate(report.id)}>
                      Als erledigt markieren
                    </Button>
                  )}
                </div>
              </details>
              <ReportMatches report={report} items={publicItems} notify={notify} />
            </Card>
          )
        })}
      </div>
    </>
  )
}

interface ReportMatchesProps {
  report: LossReport
  items: StaffItem[]
  notify: ReturnType<typeof useNotifyMatch>
}

const ReportMatches = ({ report, items, notify }: ReportMatchesProps) => {
  const ruleMatches = findMatches(report, items).map(({ item, score }) => ({ item, detail: <span className="ml-2 text-xs text-stone-500">Übereinstimmung: {score}</span> }))
  const candidates = useMemo(() => itemCandidatesForReport(report, items), [report, items])
  const ai = useMutation({ mutationFn: () => rankMatches({ lost: [toLostDescription(report)], found: candidates.map(toFoundDescription) }) })
  const aiMatches = pickAiMatches(candidates, ai.data).map(({ entry, score, reason }) => ({
    item: entry,
    detail: (
      <span className="mt-1 flex flex-col gap-1">
        <AiScoreBadge score={score} className="self-start" />
        <AiReason>{reason}</AiReason>
      </span>
    ),
  }))
  const shown = ai.isSuccess ? aiMatches : ruleMatches

  return (
    <div className="mt-4 border-t border-stone-100 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-500 uppercase">{ai.isSuccess ? 'KI-Abgleich mit Ihrem Bestand' : 'Mögliche Treffer in Ihrem Bestand'}</p>
        <div className="flex flex-wrap gap-2">
          {ai.isSuccess && (
            <Button size="sm" variant="ghost" onClick={() => ai.reset()}>
              Regel-Treffer zeigen
            </Button>
          )}
          {report.status === 'open' && candidates.length > 0 && (
            <AiButton onClick={() => ai.mutate()} loading={ai.isPending}>
              {ai.isSuccess ? 'Erneut abgleichen' : 'KI-Abgleich'}
            </AiButton>
          )}
        </div>
      </div>
      {ai.isError && <p className="mb-2 text-xs font-medium text-red-700">{toUserMessage(ai.error)}</p>}
      {ai.isSuccess && (
        <p className="mb-2 text-xs text-stone-500">
          {candidates.length} Gegenstände aus dem Zeitraum geprüft – auch mit anderer Kategorie oder Wortwahl. Nur Vorschläge, bitte selbst prüfen.
        </p>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-stone-500">{ai.isSuccess ? 'Die KI hat keinen wahrscheinlichen Treffer gefunden.' : 'Kein passender Gegenstand.'}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map(({ item, detail }) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <Link to={`/verwaltung/gegenstand/${item.id}`} className="min-w-0 flex-1 font-medium hover:text-brand-700">
                {item.title} <span className="font-mono text-xs text-stone-500">{item.itemNumber}</span>
                {detail}
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
  )
}
