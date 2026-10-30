import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronRight, Inbox } from 'lucide-react'
import { formatDateTime } from '@/domain/dates'
import { REQUEST_STATUS_LABELS } from '@/domain/labels'
import type { RequestStatus } from '@/domain/types'
import { RequestStatusBadge } from '@/components/items/StatusBadges'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useRequests, useStaffItems } from './queries'

const TABS: (RequestStatus | 'all')[] = ['open', 'confirmed', 'completed', 'rejected', 'all']

export const RequestsPage = () => {
  const requests = useRequests()
  const items = useStaffItems()
  const [params] = useSearchParams()
  const initialTab = TABS.find((t) => t === params.get('status')) ?? 'open'
  const [tab, setTab] = useState<RequestStatus | 'all'>(initialTab)
  const itemsById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data])
  const list = (requests.data ?? []).filter((r) => tab === 'all' || r.status === tab)
  const count = (s: RequestStatus | 'all') => (requests.data ?? []).filter((r) => s === 'all' || r.status === s).length

  return (
    <>
      <PageHeader title="Rückgabeanfragen" description="Eigentumsnachweis prüfen, dann bestätigen oder ablehnen." />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Nach Status filtern">
        {TABS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn('shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap sm:py-1.5', tab === s ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
          >
            {s === 'all' ? 'Alle' : REQUEST_STATUS_LABELS[s]} <span className="ml-1 opacity-70">{count(s)}</span>
          </button>
        ))}
      </div>
      {requests.isPending && <Spinner />}
      {requests.isError && <ErrorState error={requests.error} />}
      {requests.isSuccess && list.length === 0 && (
        <EmptyState icon={<Inbox className="size-6" />} title="Keine Anfragen in dieser Ansicht">
          Neue Anfragen von Suchenden erscheinen hier automatisch.
        </EmptyState>
      )}
      {list.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {list.map((r) => {
            const item = itemsById.get(r.itemId)
            return (
              <Link key={r.id} to={`/verwaltung/anfragen/${r.id}`} className="flex items-center gap-4 p-4 hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.claimantName}</p>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">
                    {item ? `${item.title} · ${item.itemNumber}` : 'Gegenstand'} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <ChevronRight className="size-4 text-stone-400" aria-hidden />
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
