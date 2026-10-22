import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { BellRing, ExternalLink, Lock, Pencil } from 'lucide-react'
import { formatDate, formatDateTime } from '@/domain/dates'
import { CATEGORY_LABELS, ITEM_STATUS_LABELS } from '@/domain/labels'
import { findMatches } from '@/domain/matching'
import { allowedItemStatuses, pendingAfterReturn } from '@/domain/workflow'
import type { ItemStatus } from '@/domain/types'
import { toUserMessage } from '@/services/errors'
import { ColorDot, ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge, RequestStatusBadge } from '@/components/items/StatusBadges'
import { BackLink } from '@/components/ui/BackLink'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, CardSection, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { useChangeItemStatus, useLossReports, useNotifyMatch, useRequests, useStaffItem } from './queries'

const STATUS_ACTION_LABELS: Record<ItemStatus, string> = {
  available: 'Als verfügbar markieren',
  reserved: 'Als reserviert markieren',
  returned: 'Als zurückgegeben markieren',
}

/** Interne Detailansicht eines Gegenstands. */
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

  if (item.isPending) return <Spinner />
  if (item.isError) return <ErrorState error={item.error} />
  if (!item.data) return <EmptyState title="Gegenstand nicht gefunden">Er gehört nicht zu Ihrer Organisation.</EmptyState>

  const data = item.data
  const nextStatuses = allowedItemStatuses(data.status, itemRequests)
  const stillOpen = pendingAfterReturn(data.status, itemRequests)

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
            <div className="mb-4">
              <ItemStatusBadge status={data.status} />
            </div>
            <div className="flex flex-col gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
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
            {changeStatus.isError && <Alert tone="error" className="mt-3">{toUserMessage(changeStatus.error)}</Alert>}
            {stillOpen.length > 0 && (
              <Alert tone="warning" className="mt-3">
                {stillOpen.length} offene Anfrage{stillOpen.length > 1 ? 'n' : ''} – bitte bewusst ablehnen.
              </Alert>
            )}
          </CardSection>

          {matchingReports.length > 0 && (
            <CardSection title="Passende Verlustmeldungen" description="Nach Kategorie, Datum und Farbe. Benachrichtigung wird nur simuliert.">
              <ul className="space-y-3">
                {matchingReports.map((r) => (
                  <li key={r.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-stone-500">
                      {r.reporterName} · verloren am {formatDate(r.lostOn)}
                      {!r.organisationId && ' · «Weiss nicht»'}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      icon={<BellRing className="size-4" />}
                      loading={notify.isPending && notify.variables?.reportId === r.id}
                      onClick={() => notify.mutate({ reportId: r.id, itemId: id })}
                    >
                      Person benachrichtigen
                    </Button>
                  </li>
                ))}
              </ul>
              {notify.isSuccess && (
                <Alert tone={notify.data ? 'success' : 'info'} className="mt-3">
                  {notify.data ? 'Simulierte E-Mail erstellt (siehe Postausgang).' : 'Diese Person wurde zu diesem Gegenstand bereits benachrichtigt.'}
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
