import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { BellRing, ExternalLink, Lock, Pencil } from 'lucide-react'
import { formatDate, formatDateTime } from '@/domain/dates'
import { CATEGORY_LABELS, ITEM_STATUS_LABELS } from '@/domain/labels'
import { pickAiMatches, reportCandidatesForItem, toFoundDescription, toLostDescription } from '@/domain/aiMatching'
import { findMatches } from '@/domain/matching'
import { allowedItemStatuses, pendingAfterReturn } from '@/domain/workflow'
import type { ItemStatus } from '@/domain/types'
import { rankMatches } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiButton } from '@/components/ai/AiButton'
import { AiReason, AiScoreBadge } from '@/components/ai/AiMatch'
import { ColorDot, ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge, RequestStatusBadge } from '@/components/items/StatusBadges'
import { BackLink } from '@/components/ui/BackLink'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, CardSection, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { useChangeItemStatus, useLossReports, useNotifyMatch, useRequests, useStaffItem } from './queries'
import { RejectOpenRequests } from './RejectOpenRequests'

const STATUS_ACTION_LABELS: Record<ItemStatus, string> = {
  available: 'Als verfügbar markieren',
  reserved: 'Als reserviert markieren',
  returned: 'Als zurückgegeben markieren',
}

export const StaffItemPage = () => {
  const { id = '' } = useParams()
  const location = useLocation()
  const flash = location.state as { created?: boolean; saved?: boolean } | null
  const item = useStaffItem(id)
  const requests = useRequests()
  const lossReports = useLossReports()
  const changeStatus = useChangeItemStatus()
  const notify = useNotifyMatch()

  const itemRequests = useMemo(() => (requests.data ?? []).filter((r) => r.itemId === id), [requests.data, id])
  const matchingReports = useMemo(() => {
    if (!item.data || !item.data.isPublic) return []
    const current = item.data
    return (lossReports.data ?? []).filter((r) => r.status === 'open' && findMatches(r, [current]).length > 0)
  }, [item.data, lossReports.data])

  const aiCandidates = useMemo(
    () => (item.data?.isPublic ? reportCandidatesForItem(item.data, lossReports.data ?? []) : []),
    [item.data, lossReports.data],
  )
  const ai = useMutation({
    mutationFn: () => rankMatches({ lost: aiCandidates.map(toLostDescription), found: [toFoundDescription(item.data!)] }),
  })

  if (item.isPending) return <Spinner />
  if (item.isError) return <ErrorState error={item.error} />
  if (!item.data) return <EmptyState title="Gegenstand nicht gefunden">Er gehört nicht zu Ihrer Organisation.</EmptyState>

  const data = item.data
  const nextStatuses = allowedItemStatuses(data.status, itemRequests)
  const stillOpen = pendingAfterReturn(data.status, itemRequests)
  const shownReports = ai.isSuccess
    ? pickAiMatches(aiCandidates, ai.data).map(({ entry, score, reason }) => ({ report: entry, score, reason }))
    : matchingReports.map((report) => ({ report, score: null as number | null, reason: '' }))

  return (
    <div className="space-y-6">
      <BackLink to="/verwaltung" label="Zur Übersicht" />
      <PageHeader
        eyebrow={<span className="font-mono">{data.itemNumber}</span>}
        title={data.title}
        actions={
          <>
            <ButtonLink to={`/verwaltung/gegenstand/${id}/bearbeiten`} variant="secondary" icon={<Pencil className="size-4" />}>
              Bearbeiten
            </ButtonLink>
            {data.isPublic && data.status !== 'returned' && (
              <ButtonLink to={`/fund/${id}`} variant="ghost" icon={<ExternalLink className="size-4" />}>
                Öffentliche Ansicht
              </ButtonLink>
            )}
          </>
        }
      />
      {flash?.created && (
        <Alert tone="success" title="Gegenstand erfasst">
          Fundnummer {data.itemNumber}. {data.isPublic ? 'Er ist ab sofort im öffentlichen Fundkatalog sichtbar.' : 'Er ist nicht öffentlich sichtbar.'}
        </Alert>
      )}
      {flash?.saved && <Alert tone="success">Änderungen gespeichert.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="overflow-hidden sm:flex">
            <ItemImage photoPath={data.photoPath} category={data.category} title={data.title} className="aspect-4/3 w-full sm:aspect-auto sm:w-56" />
            <div className="flex-1 p-5">
              <DefinitionList
                items={[
                  { label: 'Kategorie', value: CATEGORY_LABELS[data.category] },
                  { label: 'Farbe', value: <ColorDot color={data.color} /> },
                  { label: 'Marke', value: data.brand },
                  { label: 'Funddatum', value: formatDate(data.foundOn) },
                  { label: 'Fundort', value: data.foundLocation },
                  { label: 'Beschreibung', value: data.publicDescription },
                  { label: 'Sichtbarkeit', value: data.isPublic ? 'Im Fundkatalog' : 'Nur intern' },
                ]}
              />
            </div>
          </Card>

          <CardSection
            title="Interne Angaben"
            className="bg-accent-50/40"
            actions={
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-700">
                <Lock className="size-4" aria-hidden /> Nur für Ihre Organisation
              </span>
            }
          >
            <DefinitionList
              items={[
                { label: 'Erkennungsmerkmal', value: data.internal.identifyingFeature },
                { label: 'Aufbewahrungsort', value: data.internal.storageLocation },
                { label: 'Interne Notiz', value: data.internal.internalNote },
              ]}
            />
          </CardSection>

          <CardSection title="Rückgabeanfragen" description="Eine Anfrage ändert den Status nicht automatisch – mehrere Personen können denselben Gegenstand beanspruchen.">
            {itemRequests.length === 0 ? (
              <p className="text-sm text-stone-500">Noch keine Anfragen.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {itemRequests.map((r) => (
                  <li key={r.id}>
                    <Link to={`/verwaltung/anfragen/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-700">
                      <span>
                        <span className="block font-medium">{r.claimantName}</span>
                        <span className="block text-xs text-stone-500">{formatDateTime(r.createdAt)}</span>
                      </span>
                      <RequestStatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>
        </div>

        <div className="space-y-6">
          <CardSection title="Status">
            <div className="mb-3">
              <ItemStatusBadge status={data.status} />
            </div>
            <p className="text-sm text-stone-600">
              Der Status ändert sich normalerweise über die Anfragen: <strong>Bestätigen</strong> reserviert den Gegenstand, <strong>«Übergabe erfolgt»</strong>{' '}
              schliesst die Rückgabe ab.
            </p>
            {stillOpen.length > 0 && data.status === 'returned' && (
              <div className="mt-3">
                <RejectOpenRequests requests={itemRequests} />
              </div>
            )}
            {nextStatuses.length > 0 && (
              <details className="group mt-4 rounded-lg bg-stone-50 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-stone-700">Status manuell ändern (Sonderfälle)</summary>
                <p className="mt-2 text-xs text-stone-500">z. B. wenn ein Gegenstand ohne Anfrage direkt am Schalter abgeholt wurde.</p>
                <div className="mt-3 flex flex-col gap-2">
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === 'returned' ? 'success' : 'secondary'}
                      loading={changeStatus.isPending && changeStatus.variables?.status === s}
                      disabled={changeStatus.isPending}
                      onClick={() => changeStatus.mutate({ id, status: s })}
                    >
                      {STATUS_ACTION_LABELS[s]}
                    </Button>
                  ))}
                </div>
                {itemRequests.some((r) => r.status === 'confirmed') && (
                  <p className="mt-3 text-xs text-stone-500">«{ITEM_STATUS_LABELS.available}» ist erst möglich, wenn die bestätigte Anfrage abgelehnt wurde.</p>
                )}
              </details>
            )}
            {changeStatus.isError && <Alert tone="error" className="mt-3">{toUserMessage(changeStatus.error)}</Alert>}
          </CardSection>

          {(matchingReports.length > 0 || aiCandidates.length > 0) && (
            <CardSection
              title="Passende Verlustmeldungen"
              description={
                ai.isSuccess
                  ? 'Von der KI bewertet – auch mit anderer Kategorie oder Wortwahl. Nur Vorschläge.'
                  : 'Nach Kategorie, Datum und Farbe. Die Person erhält eine E-Mail.'
              }
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <AiButton onClick={() => ai.mutate()} loading={ai.isPending} disabled={aiCandidates.length === 0}>
                  {ai.isSuccess ? 'Erneut abgleichen' : 'KI-Abgleich'}
                </AiButton>
                {ai.isSuccess && (
                  <Button size="sm" variant="ghost" onClick={() => ai.reset()}>
                    Regel-Treffer zeigen
                  </Button>
                )}
              </div>
              {ai.isError && <p className="mb-2 text-xs font-medium text-red-700">{toUserMessage(ai.error)}</p>}
              {shownReports.length === 0 ? (
                <p className="text-sm text-stone-500">{ai.isSuccess ? 'Die KI hat keine wahrscheinliche Meldung gefunden.' : 'Keine Meldung nach fester Regel.'}</p>
              ) : (
                <ul className="space-y-3">
                  {shownReports.map(({ report: r, score, reason }) => (
                    <li key={r.id} className="space-y-1 rounded-lg bg-stone-50 p-3 text-sm">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-stone-500">
                        {r.reporterName} · verloren am {formatDate(r.lostOn)}
                        {!r.organisationId && ' · «Weiss nicht»'}
                      </p>
                      {score !== null && <AiScoreBadge score={score} />}
                      <AiReason>{reason}</AiReason>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-1"
                        icon={<BellRing className="size-4" />}
                        loading={notify.isPending && notify.variables?.reportId === r.id}
                        onClick={() => notify.mutate({ reportId: r.id, itemId: id })}
                      >
                        Person benachrichtigen
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {notify.isSuccess && (
                <Alert tone={notify.data ? 'success' : 'info'} className="mt-3">
                  {notify.data ? 'Benachrichtigung erstellt (siehe Postausgang).' : 'Diese Person wurde zu diesem Gegenstand bereits benachrichtigt.'}
                </Alert>
              )}
              {notify.isError && <Alert tone="error" className="mt-3">{toUserMessage(notify.error)}</Alert>}
            </CardSection>
          )}
        </div>
      </div>
    </div>
  )
}
