import { Link, useSearchParams } from 'react-router'
import { ChevronRight, Inbox } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import type { ClaimStatus } from '@/domain/types'
import { ItemImage } from '@/components/items/ItemImage'
import { ClaimStatusBadge } from '@/components/items/StatusBadge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useClaims, useStaffItems } from './queries'

const TABS: ClaimStatus[] = ['open', 'confirmed', 'completed', 'rejected']
const isTab = (value: string | null): value is ClaimStatus => TABS.includes(value as ClaimStatus)

export const ClaimsPage = () => {
  const claims = useClaims()
  const items = useStaffItems()
  const [params, setParams] = useSearchParams()
  const tab = isTab(params.get('status')) ? (params.get('status') as ClaimStatus) : 'open'
  const itemById = new Map((items.data ?? []).map((item) => [item.id, item]))
  const list = (claims.data ?? []).filter((c) => c.status === tab)

  return (
    <>
      <PageHeader title={t.admin.claims.title} />
      <div className="scrollbar-none mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1" role="tablist" aria-label={t.admin.claims.title}>
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'open' ? {} : { status: key }, { replace: true })}
            className={cn('min-h-11 flex-1 shrink-0 rounded-xl px-3 font-medium whitespace-nowrap transition', tab === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-700 hover:text-stone-900')}
          >
            {t.admin.claims.tabs[key]} <span className="ml-1 text-stone-500">{(claims.data ?? []).filter((c) => c.status === key).length}</span>
          </button>
        ))}
      </div>
      {claims.isError && <ErrorState error={claims.error} onRetry={() => claims.refetch()} />}
      {claims.isPending && <Skeleton className="h-40" />}
      {claims.isSuccess && list.length === 0 && <EmptyState icon={<Inbox className="size-6" />} title={t.admin.claims.empty} />}
      {list.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {list.map((claim) => {
            const item = itemById.get(claim.itemId)
            return (
              <Link key={claim.id} to={`/verwaltung/anfragen/${claim.id}`} className="flex items-center gap-3 p-3 hover:bg-stone-50 sm:p-4" data-testid="claim-row">
                {item && <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="size-12 shrink-0 rounded-xl" />}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item?.title ?? '…'}</span>
                    <span className="font-mono text-sm text-stone-600">{item?.itemNumber}</span>
                  </span>
                  <span className="block text-sm text-stone-700">
                    {claim.claimantName} · {t.admin.claims.requestedAt} {formatDateTime(claim.createdAt)}
                  </span>
                </span>
                <ClaimStatusBadge status={claim.status} />
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
