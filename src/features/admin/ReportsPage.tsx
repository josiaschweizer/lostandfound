import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight, Search } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatShortDate } from '@/domain/dates'
import { normalize } from '@/domain/search'
import { ColorLabels } from '@/components/items/ColorDot'
import { CATEGORY_ICONS } from '@/components/items/categoryIcons'
import { LossStatusBadge } from '@/components/items/StatusBadge'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Checkbox, Input } from '@/components/ui/Form'
import { Card, PageHeader } from '@/components/ui/Layout'
import { useLossReports, useMatchCounts } from './queries'

/** Verlustmeldungen mit Badge «Mögliche Treffer: n» (Muster aus der Tenant-App, T18). */
export const ReportsPage = () => {
  const reports = useLossReports()
  const counts = useMatchCounts()
  const [params, setParams] = useSearchParams()
  const onlyMatches = params.get('treffer') === '1'
  const [showClosed, setShowClosed] = useState(false)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    return (reports.data ?? [])
      .filter((r) => showClosed || r.status === 'open')
      .filter((r) => !onlyMatches || (counts.data?.reports[r.id] ?? 0) > 0)
      .filter((r) => {
        if (terms.length === 0) return true
        const hay = normalize([r.title, r.description, r.lostLocation, r.brand, r.reporterName, r.reporterEmail, t.labels.categories[r.category]].join(' '))
        return terms.every((term) => hay.includes(term))
      })
  }, [reports.data, counts.data, showClosed, onlyMatches, query])

  return (
    <>
      <PageHeader title={t.admin.reports.title} lead={t.admin.reports.lead} />
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="report-search" className="sr-only">
            {t.admin.reports.search}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <Input id="report-search" type="search" className="pl-10" placeholder={t.admin.reports.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Checkbox label={t.admin.reports.onlyMatches} checked={onlyMatches} onChange={(e) => setParams(e.target.checked ? { treffer: '1' } : {}, { replace: true })} />
        <Checkbox label={t.admin.reports.showClosed} checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
      </div>

      {reports.isError && <ErrorState error={reports.error} onRetry={() => reports.refetch()} />}
      {reports.isPending && (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {reports.isSuccess && visible.length === 0 && <EmptyState title={t.admin.reports.empty} />}
      {visible.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {visible.map((report) => {
            const Icon = CATEGORY_ICONS[report.category]
            const n = counts.data?.reports[report.id] ?? 0
            return (
              <Link key={report.id} to={`/verwaltung/meldungen/${report.id}`} className="flex items-center gap-3 p-3 hover:bg-stone-50 sm:p-4" data-testid="report-row">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{report.title}</span>
                    {report.status !== 'open' && <LossStatusBadge status={report.status} />}
                    {!report.organisationId && <Badge tone="violet">{t.admin.reports.unknownOffice}</Badge>}
                  </span>
                  <span className="block text-sm text-stone-700">
                    {t.labels.categories[report.category]} · {t.admin.reports.lost} {report.lostFrom === report.lostTo ? formatShortDate(report.lostFrom) : t.admin.reports.lostRange(formatShortDate(report.lostFrom), formatShortDate(report.lostTo))}
                  </span>
                  {report.colors.length > 0 && <ColorLabels colors={report.colors} className="text-sm text-stone-700" />}
                  {n > 0 && report.status === 'open' && <Badge tone="brand">{t.admin.reports.matchBadge(n)}</Badge>}
                </span>
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
