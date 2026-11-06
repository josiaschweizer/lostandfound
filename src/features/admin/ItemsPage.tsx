import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Archive, CheckCircle2, EyeOff, Inbox, PackagePlus, RotateCcw, Search } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatShortDate } from '@/domain/dates'
import { normalize } from '@/domain/search'
import { CATEGORIES, type ItemCategory, type ItemStatus, type StaffItem } from '@/domain/types'
import { setItemStatus } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { ItemImage } from '@/components/items/ItemImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useToast } from '@/components/ui/toastContext'
import { useMatchCounts, useStaffItems } from './queries'
import { useInvalidate } from './useInvalidate'

const TABS = {
  open: ['available'],
  reserved: ['reserved'],
  done: ['returned', 'disposed'],
} as const satisfies Record<string, readonly ItemStatus[]>
type Tab = keyof typeof TABS
type Sort = 'created' | 'found' | 'title'

const isTab = (value: string | null): value is Tab => value !== null && value in TABS

const SORTERS: Record<Sort, (a: StaffItem, b: StaffItem) => number> = {
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  found: (a, b) => b.foundOn.localeCompare(a.foundOn) || b.createdAt.localeCompare(a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, 'de-CH'),
}

/** Fundliste (KONZEPT 5.5): Tabs «Offen / Reserviert / Erledigt», neueste zuerst, Status mit einem Klick. */
export const ItemsPage = () => {
  const items = useStaffItems()
  const counts = useMatchCounts()
  const invalidate = useInvalidate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'open'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ItemCategory | ''>('')
  const [sort, setSort] = useState<Sort>('created')

  const status = useMutation({
    mutationFn: ({ item, to }: { item: StaffItem; to: ItemStatus; undo?: boolean }) => setItemStatus(item.id, to),
    onSuccess: async (_, { item, to, undo }) => {
      await invalidate()
      if (undo) return
      const messages = t.admin.items.toasts
      const message = to === 'returned' ? messages.returned(item.title) : to === 'disposed' ? messages.disposed(item.title) : messages.available(item.title)
      toast({ message, action: { label: t.common.undo, onClick: () => status.mutate({ item, to: item.status, undo: true }) } })
    },
    onError: (error) => toast({ message: toUserMessage(error), tone: 'error' }),
  })

  const all = items.data ?? []
  const tabCounts = Object.fromEntries((Object.keys(TABS) as Tab[]).map((key) => [key, all.filter((i) => (TABS[key] as readonly ItemStatus[]).includes(i.status)).length])) as Record<Tab, number>

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    return (items.data ?? [])
      .filter((item) => (TABS[tab] as readonly ItemStatus[]).includes(item.status))
      .filter((item) => !category || item.category === category)
      .filter((item) => {
        if (terms.length === 0) return true
        const hay = normalize([item.title, item.itemNumber, item.brand, item.foundLocation, item.storageLocation, item.identifyingFeature, item.internalNote, item.publicDescription].join(' '))
        return terms.every((term) => hay.includes(term))
      })
      .sort(SORTERS[sort])
  }, [items.data, tab, category, query, sort])

  return (
    <>
      <PageHeader
        title={t.admin.items.title}
        actions={
          <ButtonLink to="/verwaltung/funde/neu" icon={<PackagePlus className="size-5" aria-hidden />}>
            {t.admin.overview.newItem}
          </ButtonLink>
        }
      />

      <div className="mb-4 flex gap-1 rounded-2xl bg-stone-100 p-1" role="tablist" aria-label={t.admin.items.title}>
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'open' ? {} : { tab: key }, { replace: true })}
            className={cn('min-h-11 flex-1 rounded-xl px-3 font-medium transition', tab === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-700 hover:text-stone-900')}
          >
            {t.admin.items.tabs[key]} <span className="ml-1 text-stone-500">{tabCounts[key]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_14rem_12rem]">
        <div className="relative">
          <label htmlFor="staff-search" className="sr-only">
            {t.admin.items.search}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <Input id="staff-search" type="search" className="pl-10" placeholder={t.admin.items.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select
          aria-label={t.common.category}
          value={category}
          placeholder={t.search.allCategories}
          options={CATEGORIES.map((value) => ({ value, label: t.labels.categories[value] }))}
          onChange={(e) => setCategory(e.target.value as ItemCategory | '')}
        />
        <Select
          aria-label={t.admin.items.sort}
          value={sort}
          options={(Object.keys(t.admin.items.sorts) as Sort[]).map((value) => ({ value, label: t.admin.items.sorts[value] }))}
          onChange={(e) => setSort(e.target.value as Sort)}
        />
      </div>

      {items.isError && <ErrorState error={items.error} onRetry={() => items.refetch()} />}
      {items.isPending && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}
      {items.isSuccess && all.length === 0 && (
        <EmptyState icon={<Inbox className="size-6" />} title={t.admin.items.empty} action={<ButtonLink to="/verwaltung/funde/neu">{t.admin.overview.newItem}</ButtonLink>} />
      )}
      {items.isSuccess && all.length > 0 && visible.length === 0 && <EmptyState title={t.admin.items.emptyFiltered} />}

      {visible.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {visible.map((item) => {
            const matches = counts.data?.items[item.id] ?? 0
            const busy = status.isPending && status.variables?.item.id === item.id
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4" data-testid="staff-item-row">
                <Link to={`/verwaltung/funde/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-brand-700">
                  <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="size-14 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.title}</span>
                      {matches > 0 && <Badge tone="brand">{t.admin.items.matches(matches)}</Badge>}
                      {!item.isPublic && (
                        <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                          <EyeOff className="size-4" aria-hidden /> {t.admin.items.notPublic}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-stone-700">
                      <span className="font-mono">{item.itemNumber}</span> · {t.labels.categories[item.category]} · {formatShortDate(item.foundOn)}
                    </span>
                    <span className="block truncate text-sm text-accent-700">{item.storageLocation}</span>
                  </span>
                </Link>
                <div className="flex gap-2 max-sm:w-full">
                  {tab === 'done' ? (
                    <Button variant="secondary" size="sm" className="max-sm:flex-1" loading={busy} icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => status.mutate({ item, to: 'available' })}>
                      {t.admin.items.actions.reopen}
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" className="max-sm:flex-1" loading={busy} icon={<CheckCircle2 className="size-4 text-emerald-700" aria-hidden />} onClick={() => status.mutate({ item, to: 'returned' })}>
                        {t.admin.items.actions.pickedUp}
                      </Button>
                      {tab === 'open' && (
                        <Button variant="ghost" size="sm" disabled={busy} icon={<Archive className="size-4" aria-hidden />} onClick={() => status.mutate({ item, to: 'disposed' })} aria-label={`${t.admin.items.actions.dispose}: ${item.title}`}>
                          <span className="max-md:sr-only">{t.admin.items.actions.dispose}</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </>
  )
}
