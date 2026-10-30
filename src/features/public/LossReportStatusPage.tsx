import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'
import { SearchX } from 'lucide-react'
import { formatDate } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import { itemCandidatesForReport, pickAiMatches, toFoundDescription, toLostDescription } from '@/domain/aiMatching'
import { findMatches, MATCH_WINDOW_DAYS } from '@/domain/matching'
import { rankMatches } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiButton } from '@/components/ai/AiButton'
import { AiReason, AiScoreBadge } from '@/components/ai/AiMatch'
import { ColorDot } from '@/components/items/ItemVisual'
import { ITEM_GRID, ItemCard } from '@/components/items/ItemCard'
import { LossReportStatusBadge } from '@/components/items/StatusBadges'
import { SimulatedEmailCard } from '@/components/items/SimulatedEmailCard'
import { ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { DefinitionList, PageHeader } from '@/components/ui/Layout'
import { Disclosure } from '@/components/ui/Disclosure'
import { useCatalog, useLossReport, useOrganisationLookup } from './queries'

/** Statusseite der Verlustmeldung (nur über geheimen Link erreichbar) mit möglichen Treffern. */
export const LossReportStatusPage = () => {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const report = useLossReport(token)
  const catalog = useCatalog()
  const lookup = useOrganisationLookup()

  const matches = useMemo(
    () => (report.data && catalog.data ? findMatches(report.data, catalog.data) : []),
    [report.data, catalog.data],
  )

  const aiCandidates = useMemo(
    () => (report.data && catalog.data ? itemCandidatesForReport(report.data, catalog.data) : []),
    [report.data, catalog.data],
  )
  const ai = useMutation({
    mutationFn: () => rankMatches({ lost: [toLostDescription(report.data!)], found: aiCandidates.map(toFoundDescription) }),
  })

  if (report.isPending) return <Spinner />
  if (report.isError) return <ErrorState error={report.error} />
  if (!report.data) return <EmptyState title="Meldung nicht gefunden">Bitte prüfen Sie den Link aus Ihrer Bestätigung.</EmptyState>

  const r = report.data
  const aiMatches = pickAiMatches(aiCandidates, ai.data)
  const orgName = r.organisationId ? lookup.get(r.organisationId)?.name : 'Alle Fundstellen («Weiss nicht»)'

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader eyebrow="Ihre Verlustmeldung" title={r.title} actions={<LossReportStatusBadge status={r.status} />} />
      {params.get('neu') && (
        <Alert tone="success" title="Verlustmeldung erfasst">
          Sie finden sie jederzeit unter «Meine Anfragen» im Menü (in diesem Browser) oder über den Link in der Bestätigungs-E-Mail.
        </Alert>
      )}

      <section aria-labelledby="matches-title">
        <h2 id="matches-title" className="text-lg font-semibold sm:text-xl">
          Mögliche Treffer
        </h2>
        <p className="mb-4 text-sm text-stone-600">
          Gleiche Kategorie, gefunden bis {MATCH_WINDOW_DAYS} Tage nach dem Verlust, sortiert nach Farbe und Stichworten. Nur Vorschläge.
        </p>
        {catalog.isPending ? (
          <Spinner />
        ) : matches.length === 0 ? (
          <EmptyState icon={<SearchX className="size-6" />} title="Noch kein passender Fund" action={<ButtonLink to="/suche" variant="secondary">Selbst suchen</ButtonLink>}>
            Sobald eine Fundstelle einen passenden Gegenstand erfasst, kann sie Sie per E-Mail benachrichtigen.
          </EmptyState>
        ) : (
          <ul className={ITEM_GRID}>
            {matches.map(({ item, colorMatches, sharedKeywords }) => (
              <li key={item.id} className="space-y-2">
                <ItemCard item={item} to={`/fund/${item.id}`} organisationName={lookup.get(item.organisationId)?.name} />
                <p className="px-1 text-xs text-stone-500">
                  {colorMatches ? 'Farbe stimmt' : 'Andere Farbe'}
                  {sharedKeywords.length > 0 && ` · gemeinsam: ${sharedKeywords.join(', ')}`}
                </p>
              </li>
            ))}
          </ul>
        )}

        {r.status === 'open' && aiCandidates.length > 0 && (
          <div className="mt-6 space-y-4 rounded-3xl bg-brand-50/60 p-4 ring-1 ring-brand-100 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-xl">
                <p className="font-semibold text-stone-900">KI-Abgleich</p>
                <p className="text-sm text-stone-600">
                  Vergleicht mit {aiCandidates.length} {aiCandidates.length === 1 ? 'Fund' : 'Funden'} aus dem Zeitraum – auch bei anderer Wortwahl oder Kategorie.
                </p>
              </div>
              <AiButton onClick={() => ai.mutate()} loading={ai.isPending}>
                {ai.isSuccess ? 'Erneut abgleichen' : 'Mit KI abgleichen'}
              </AiButton>
            </div>
            {ai.isError && <p className="text-sm font-medium text-red-700">{toUserMessage(ai.error)}</p>}
            {ai.isSuccess &&
              (aiMatches.length === 0 ? (
                <p className="text-sm text-stone-600">Die KI hat keinen wahrscheinlichen Treffer gefunden. Sie können später erneut abgleichen.</p>
              ) : (
                <ul className={ITEM_GRID}>
                  {aiMatches.map(({ entry: item, score, reason }) => (
                    <li key={item.id} className="space-y-2">
                      <ItemCard item={item} to={`/fund/${item.id}`} organisationName={lookup.get(item.organisationId)?.name} />
                      <div className="space-y-1 px-1">
                        <AiScoreBadge score={score} />
                        <AiReason>{reason}</AiReason>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
            {ai.isSuccess && <p className="text-xs text-stone-500">Nur Vorschläge der KI – ob es Ihr Gegenstand ist, klärt die Fundstelle mit Ihrer Rückgabeanfrage.</p>}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Disclosure title="Ihre Angaben" summary={`${CATEGORY_LABELS[r.category]} · verloren am ${formatDate(r.lostOn)}`}>
          <DefinitionList
            items={[
              { label: 'Gemeldet bei', value: orgName },
              { label: 'Kategorie', value: CATEGORY_LABELS[r.category] },
              { label: 'Farbe', value: <ColorDot color={r.color} /> },
              { label: 'Marke', value: r.brand },
              { label: 'Verloren am', value: formatDate(r.lostOn) },
              { label: 'Ort', value: r.lostLocation },
              { label: 'Beschreibung', value: r.description },
            ]}
          />
        </Disclosure>
        <Disclosure title="Nachrichten" summary={`${r.emails.length} ${r.emails.length === 1 ? 'Nachricht' : 'Nachrichten'} per E-Mail`}>
          <div className="space-y-3">
            {r.emails.map((email) => (
              <SimulatedEmailCard key={email.id} email={email} />
            ))}
          </div>
        </Disclosure>
      </div>
    </div>
  )
}
