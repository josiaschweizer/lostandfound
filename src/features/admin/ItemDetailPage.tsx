import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, BellRing, ExternalLink, Lock, Pencil } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDate, formatDateTime, formatShortDate } from '@/domain/dates'
import { reasonLabels } from '@/domain/reasons'
import { isColor, type ItemStatus } from '@/domain/types'
import { notifyMatch, saveItem, setItemStatus } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { ColorLabels } from '@/components/items/ColorDot'
import { ItemImage } from '@/components/items/ItemImage'
import { ClaimStatusBadge, ItemStatusBadge } from '@/components/items/StatusBadge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, DefinitionList, PageHeader, Section } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/toastContext'
import { ItemForm } from './ItemForm'
import { useClaims, useItemHistory, useItemMatches, useMembers, useStaffItem } from './queries'
import { useInvalidate } from './useInvalidate'

const historyValue = (field: string, value: string | null): string => {
  if (value === null || value === '') return '–'
  if (field === 'status') return t.labels.itemStatus[value as ItemStatus] ?? value
  if (field === 'category') return t.labels.categories[value as keyof typeof t.labels.categories] ?? value
  if (field === 'is_public') return value === 'true' ? t.admin.itemDetail.public : t.admin.itemDetail.notPublic
  if (field === 'colors') {
    try {
      return (JSON.parse(value) as string[]).filter(isColor).map((c) => t.labels.colors[c]).join(', ')
    } catch {
      return value
    }
  }
  if (field === 'found_on') return formatShortDate(value)
  return value
}

/** Fund-Detail intern: alle Felder, Bearbeiten, Statusverlauf, passende Verlustmeldungen (KONZEPT 4). */
export const ItemDetailPage = () => {
  const { id = '' } = useParams()
  const item = useStaffItem(id)
  const history = useItemHistory(id)
  const matches = useItemMatches(id)
  const claims = useClaims()
  const members = useMembers()
  const invalidate = useInvalidate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)

  const status = useMutation({
    mutationFn: ({ to }: { to: ItemStatus; from: ItemStatus; undo?: boolean }) => setItemStatus(id, to),
    onSuccess: async (_, { to, from, undo }) => {
      await invalidate()
      if (undo || !item.data) return
      const messages = t.admin.items.toasts
      const message = to === 'returned' ? messages.returned(item.data.title) : to === 'disposed' ? messages.disposed(item.data.title) : messages.available(item.data.title)
      toast({ message, action: { label: t.common.undo, onClick: () => status.mutate({ to: from, from: to, undo: true }) } })
    },
    onError: (error) => toast({ message: toUserMessage(error), tone: 'error' }),
  })
  const notify = useMutation({
    mutationFn: (reportId: string) => notifyMatch(reportId, id),
    onSuccess: async () => {
      await invalidate()
      toast({ message: t.admin.reports.notifiedToast })
    },
    onError: (error) => toast({ message: toUserMessage(error), tone: 'error' }),
  })

  if (item.isPending) return <Spinner />
  if (item.isError) return <ErrorState error={item.error} onRetry={() => item.refetch()} />
  if (!item.data) return <EmptyState as="h1" title={t.admin.itemDetail.notFound} action={<ButtonLink to="/verwaltung/funde">{t.admin.itemDetail.backToList}</ButtonLink>} />

  const data = item.data
  const memberName = (userId: string | null) => (userId ? (members.data?.find((m) => m.userId === userId)?.fullName ?? t.admin.itemDetail.bySystem) : t.admin.itemDetail.bySystem)
  const itemClaims = (claims.data ?? []).filter((c) => c.itemId === id)

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t.admin.itemForm.editTitle} eyebrow={<span className="font-mono">{data.itemNumber}</span>} />
        <ItemForm
          item={data}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await saveItem(id, input)
            await invalidate()
            setEditing(false)
            toast({ message: t.admin.office.saved })
          }}
        />
      </div>
    )
  }

  const nextStatuses: ItemStatus[] = data.status === 'returned' || data.status === 'disposed' ? ['available'] : ['returned', 'disposed']

  return (
    <div className="space-y-5">
      <ButtonLink to="/verwaltung/funde" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />} className="-ml-3">
        {t.admin.itemDetail.backToList}
      </ButtonLink>
      <PageHeader
        eyebrow={<span className="font-mono">{data.itemNumber}</span>}
        title={data.title}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(true)}>
              {t.common.edit}
            </Button>
            {data.isPublic && (data.status === 'available' || data.status === 'reserved') && (
              <ButtonLink to={`/fund/${data.itemNumber}`} variant="ghost" icon={<ExternalLink className="size-4" aria-hidden />}>
                {t.admin.itemDetail.publicView}
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-5">
          <Card className="overflow-hidden sm:flex">
            <ItemImage photoPath={data.photoPath} category={data.category} title={data.title} className="aspect-[2/1] w-full sm:aspect-auto sm:w-56" />
            <div className="flex-1 p-4 sm:p-5">
              <DefinitionList
                items={[
                  { label: t.common.category, value: t.labels.categories[data.category] },
                  { label: t.common.color, value: <ColorLabels colors={data.colors} /> },
                  { label: t.common.brand, value: data.brand },
                  { label: t.admin.itemForm.foundOn, value: formatDate(data.foundOn) },
                  { label: t.common.place, value: data.foundLocation },
                  { label: t.admin.itemForm.publicDescription, value: data.publicDescription },
                  { label: t.admin.itemDetail.visibility, value: data.isPublic ? t.admin.itemDetail.public : t.admin.itemDetail.notPublic },
                  { label: t.admin.itemDetail.created, value: `${formatDateTime(data.createdAt)} · ${memberName(data.createdBy)}` },
                ]}
              />
            </div>
          </Card>

          <Section
            title={t.admin.itemDetail.internal}
            className="ring-accent-100"
            actions={
              <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-700">
                <Lock className="size-4" aria-hidden /> {t.admin.itemForm.internalBadge}
              </span>
            }
          >
            <DefinitionList
              items={[
                { label: t.admin.itemDetail.storage, value: data.storageLocation },
                { label: t.admin.itemDetail.feature, value: data.identifyingFeature },
                { label: t.admin.itemDetail.note, value: data.internalNote },
              ]}
            />
          </Section>

          <Section title={t.admin.itemDetail.matches}>
            {matches.isPending ? (
              <Spinner />
            ) : (matches.data ?? []).length === 0 ? (
              <p className="text-stone-600">{t.admin.itemDetail.noMatches}</p>
            ) : (
              <ul className="space-y-3">
                {(matches.data ?? []).map((m) => (
                  <li key={m.reportId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
                    <Link to={`/verwaltung/meldungen/${m.reportId}`} className="min-w-0 flex-1 hover:text-brand-700">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {m.title} <Badge tone="brand">{t.admin.reports.score(m.score)}</Badge>
                        {m.isUnknownOffice && <Badge tone="violet">{t.admin.reports.unknownOffice}</Badge>}
                      </span>
                      <span className="block text-sm text-stone-700">{reasonLabels(m.reasons, 4).join(' · ')}</span>
                      <span className="block text-sm text-stone-600">
                        {t.admin.reports.lost}: {m.lostFrom === m.lostTo ? formatShortDate(m.lostFrom) : t.admin.reports.lostRange(formatShortDate(m.lostFrom), formatShortDate(m.lostTo))}
                      </span>
                    </Link>
                    {m.notifiedAt ? (
                      <Badge tone="green">{t.admin.reports.notified}</Badge>
                    ) : data.isPublic ? (
                      <Button size="sm" variant="secondary" icon={<BellRing className="size-4" aria-hidden />} loading={notify.isPending && notify.variables === m.reportId} onClick={() => notify.mutate(m.reportId)}>
                        {t.admin.reports.notify}
                      </Button>
                    ) : (
                      <span className="text-sm text-stone-600">{t.admin.reports.notPublicHint}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={t.admin.itemDetail.status}>
            <div className="mb-3">
              <ItemStatusBadge status={data.status} />
            </div>
            <div className="flex flex-col gap-2">
              {nextStatuses.map((to) => (
                <Button
                  key={to}
                  variant={to === 'returned' ? 'success' : 'secondary'}
                  loading={status.isPending && status.variables?.to === to}
                  disabled={status.isPending}
                  onClick={() => status.mutate({ to, from: data.status })}
                >
                  {t.admin.itemDetail.setStatus[to as keyof typeof t.admin.itemDetail.setStatus]}
                </Button>
              ))}
            </div>
          </Section>

          <Section title={t.admin.itemDetail.claims}>
            {itemClaims.length === 0 ? (
              <p className="text-stone-600">{t.admin.itemDetail.noClaims}</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {itemClaims.map((claim) => (
                  <li key={claim.id}>
                    <Link to={`/verwaltung/anfragen/${claim.id}`} className="flex min-h-12 items-center justify-between gap-2 py-2 hover:text-brand-700">
                      <span>
                        <span className="block font-medium">{claim.claimantName}</span>
                        <span className="block text-sm text-stone-600">{formatDateTime(claim.createdAt)}</span>
                      </span>
                      <ClaimStatusBadge status={claim.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t.admin.itemDetail.history}>
            {history.isPending ? (
              <Spinner />
            ) : (
              <ol className="space-y-3" data-testid="item-history">
                {(history.data ?? []).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span className="block font-medium text-stone-900">
                      {entry.field === 'created' ? t.admin.itemDetail.historyCreated : t.admin.itemDetail.historyEntry(t.admin.itemDetail.historyFields[entry.field] ?? entry.field)}
                    </span>
                    {entry.field !== 'created' && entry.field !== 'photo_path' && (
                      <span className="block text-stone-700">
                        {historyValue(entry.field, entry.oldValue)} → {historyValue(entry.field, entry.newValue)}
                      </span>
                    )}
                    <span className="block text-stone-600">
                      {formatDateTime(entry.changedAt)} · {memberName(entry.changedBy)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
