import { Link, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, BellRing, CheckCheck, Lock } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime, formatShortDate } from '@/domain/dates'
import { reasonLabels } from '@/domain/reasons'
import { closeLossReport, notifyMatch } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { ColorLabels } from '@/components/items/ColorDot'
import { ItemImage } from '@/components/items/ItemImage'
import { LossStatusBadge } from '@/components/items/StatusBadge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { DefinitionList, PageHeader, Section } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/toastContext'
import { useLossMatches, useLossReport } from './queries'
import { useInvalidate } from './useInvalidate'

/** Detail einer Verlustmeldung: Angaben, Treffer mit Score und Begründung, benachrichtigen, erledigt. */
export const ReportDetailPage = () => {
  const { id = '' } = useParams()
  const report = useLossReport(id)
  const matches = useLossMatches(id)
  const invalidate = useInvalidate()
  const toast = useToast()
  const notify = useMutation({
    mutationFn: (itemId: string) => notifyMatch(id, itemId),
    onSuccess: async () => {
      await invalidate()
      toast({ message: t.admin.reports.notifiedToast })
    },
    onError: (error) => toast({ message: toUserMessage(error), tone: 'error' }),
  })
  const close = useMutation({
    mutationFn: () => closeLossReport(id),
    onSuccess: async () => {
      await invalidate()
      toast({ message: t.admin.reports.closedToast })
    },
    onError: (error) => toast({ message: toUserMessage(error), tone: 'error' }),
  })

  if (report.isPending) return <Spinner />
  if (report.isError) return <ErrorState error={report.error} onRetry={() => report.refetch()} />
  if (!report.data) return <EmptyState as="h1" title={t.admin.reports.notFound} action={<ButtonLink to="/verwaltung/meldungen">{t.admin.reports.backToList}</ButtonLink>} />
  const r = report.data

  return (
    <div className="space-y-5">
      <ButtonLink to="/verwaltung/meldungen" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />} className="-ml-3">
        {t.admin.reports.backToList}
      </ButtonLink>
      <PageHeader
        title={r.title}
        eyebrow={!r.organisationId ? t.admin.reports.unknownOffice : t.admin.reports.title}
        actions={
          r.status === 'open' ? (
            <Button variant="secondary" icon={<CheckCheck className="size-5" aria-hidden />} loading={close.isPending} onClick={() => close.mutate()}>
              {t.admin.reports.close}
            </Button>
          ) : (
            <LossStatusBadge status={r.status} />
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div className="space-y-5">
          <Section title={t.myLoss.details}>
            <DefinitionList
              items={[
                { label: t.common.category, value: t.labels.categories[r.category] },
                { label: t.common.color, value: r.colors.length > 0 ? <ColorLabels colors={r.colors} /> : null },
                { label: t.common.brand, value: r.brand },
                { label: t.admin.reports.description, value: r.description },
                { label: t.admin.reports.lost, value: r.lostFrom === r.lostTo ? formatShortDate(r.lostFrom) : t.admin.reports.lostRange(formatShortDate(r.lostFrom), formatShortDate(r.lostTo)) },
                { label: t.admin.reports.place, value: r.lostLocation },
                { label: t.admin.reports.created, value: formatDateTime(r.createdAt) },
                {
                  label: t.admin.reports.reporter,
                  value: (
                    <>
                      {r.reporterName && <span className="block">{r.reporterName}</span>}
                      <a href={`mailto:${r.reporterEmail}`} className="break-all text-brand-700 underline underline-offset-2">
                        {r.reporterEmail}
                      </a>
                    </>
                  ),
                },
              ]}
            />
          </Section>
          {r.privateFeature && (
            <Section
              title={t.admin.reports.privateFeature}
              className="ring-accent-100"
              actions={
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-700">
                  <Lock className="size-4" aria-hidden /> {t.admin.itemForm.internalBadge}
                </span>
              }
            >
              <p>{r.privateFeature}</p>
            </Section>
          )}
        </div>

        <Section title={t.admin.reports.matches}>
          {matches.isPending ? (
            <Spinner />
          ) : matches.isError ? (
            <ErrorState error={matches.error} />
          ) : (matches.data ?? []).length === 0 ? (
            <p className="text-stone-600">{t.admin.reports.noMatches}</p>
          ) : (
            <ul className="space-y-3" data-testid="report-matches">
              {(matches.data ?? []).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <Link to={`/verwaltung/funde/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-brand-700">
                    <ItemImage photoPath={m.photoPath} category={m.category} title={m.title} className="size-14 shrink-0 rounded-xl" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {m.title} {m.score !== undefined && <Badge tone="brand">{t.admin.reports.score(m.score)}</Badge>}
                      </span>
                      <span className="block font-mono text-sm text-stone-600">{m.itemNumber}</span>
                      <span className="block text-sm text-stone-700">{reasonLabels(m.reasons, 4).join(' · ')}</span>
                    </span>
                  </Link>
                  {r.status === 'open' &&
                    (m.notifiedAt ? (
                      <Badge tone="green">{t.admin.reports.notified}</Badge>
                    ) : m.isPublic ? (
                      <Button size="sm" variant="secondary" icon={<BellRing className="size-4" aria-hidden />} loading={notify.isPending && notify.variables === m.id} onClick={() => notify.mutate(m.id)}>
                        {t.admin.reports.notify}
                      </Button>
                    ) : (
                      <span className="text-sm text-stone-600">{t.admin.reports.notPublicHint}</span>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
