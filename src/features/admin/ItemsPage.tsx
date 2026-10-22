import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, EyeOff, Inbox, PackagePlus, PackageSearch, RotateCcw } from 'lucide-react'
import { EMPTY_FILTERS, filterCatalog } from '@/domain/catalog'
import { formatDate } from '@/domain/dates'
import { CATEGORY_LABELS, ITEM_STATUS_LABELS, toOptions } from '@/domain/labels'
import type { ItemCategory, ItemStatus } from '@/domain/types'
import { useStaffContext } from '@/app/useAuth'
import { ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge } from '@/components/items/StatusBadges'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useRequests, useStaffItems } from './queries'

type StatusFilter = ItemStatus | 'all'

/** Verwaltungsübersicht: alle Gegenstände der eigenen Organisation. */
export const ItemsPage = () => {
  const { organisation } = useStaffContext()
  const items = useStaffItems()
  const requests = useRequests()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ItemCategory | ''>('')

  const counts = useMemo(() => {
    const list = items.data ?? []
    return {
      all: list.length,
      available: list.filter((i) => i.status === 'available').length,
      reserved: list.filter((i) => i.status === 'reserved').length,
      returned: list.filter((i) => i.status === 'returned').length,
    }
  }, [items.data])
  const openRequests = (requests.data ?? []).filter((r) => r.status === 'open')

  const visible = useMemo(
    () =>
      filterCatalog(
        (items.data ?? []).filter((i) => status === 'all' || i.status === status),
        { ...EMPTY_FILTERS, query, category },
        // Mitarbeitende dürfen auch in internen Angaben suchen.
        (i) => [i.internal.identifyingFeature, i.internal.storageLocation, i.internal.internalNote],
      ),
    [items.data, status, query, category],
  )
  const filtered = status !== 'all' || query !== '' || category !== ''

  return (
    <>
      <PageHeader
        title="Fundgegenstände"
        description={`Verwaltung von ${organisation.office.name} · ${organisation.name}`}
        actions={
          <ButtonLink to="/verwaltung/neu" icon={<PackagePlus className="size-4" />}>
            Fundgegenstand erfassen
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Verfügbar" value={counts.available} />
        <StatCard label="Reserviert" value={counts.reserved} />
        <Link to="/verwaltung/anfragen" className="rounded-2xl bg-brand-600 p-4 text-white shadow-xs transition hover:bg-brand-700">
          <p className="text-sm text-brand-100">Offene Anfragen</p>
          <p className="mt-1 flex items-center justify-between text-2xl font-semibold">
            {openRequests.length} <ChevronRight className="size-5" aria-hidden />
          </p>
        </Link>
      </div>

      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Nach Status filtern">
          {(['all', 'available', 'reserved', 'returned'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', status === s ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}
            >
              {s === 'all' ? 'Alle' : ITEM_STATUS_LABELS[s]} <span className="ml-1 opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <label className="sr-only" htmlFor="staff-q">Suche</label>
          <Input id="staff-q" type="search" placeholder="Suchen: Titel, Fundnummer, Merkmal, Aufbewahrungsort …" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="sr-only" htmlFor="staff-cat">Kategorie</label>
          <Select id="staff-cat" placeholder="Alle Kategorien" options={toOptions(CATEGORY_LABELS)} value={category} onChange={(e) => setCategory(e.target.value as ItemCategory | '')} />
        </div>
      </Card>

      {items.isPending && <Spinner />}
      {items.isError && <ErrorState error={items.error} />}
      {items.isSuccess && counts.all === 0 && (
        <EmptyState icon={<Inbox className="size-6" />} title="Noch keine Fundgegenstände" action={<ButtonLink to="/verwaltung/neu">Ersten Gegenstand erfassen</ButtonLink>}>
          Erfasste Gegenstände erscheinen hier und – wenn öffentlich – sofort im Fundkatalog.
        </EmptyState>
      )}
      {items.isSuccess && counts.all > 0 && visible.length === 0 && (
        <EmptyState
          icon={<PackageSearch className="size-6" />}
          title="Keine Treffer"
          action={
            <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => { setStatus('all'); setQuery(''); setCategory('') }}>
              Filter zurücksetzen
            </Button>
          }
        />
      )}
      {visible.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {visible.map((item) => {
            const open = openRequests.filter((r) => r.itemId === item.id).length
            return (
              <Link key={item.id} to={`/verwaltung/gegenstand/${item.id}`} className="flex items-center gap-4 p-3 transition hover:bg-stone-50 sm:p-4">
                <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="size-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <ItemStatusBadge status={item.status} />
                    {!item.isPublic && (
                      <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                        <EyeOff className="size-3.5" aria-hidden /> nicht öffentlich
                      </span>
                    )}
                    {open > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">{open} Anfrage{open > 1 ? 'n' : ''}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">
                    <span className="font-mono">{item.itemNumber}</span> · {CATEGORY_LABELS[item.category]} · {formatDate(item.foundOn)}
                    {item.internal.storageLocation && <> · {item.internal.storageLocation}</>}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-stone-400" aria-hidden />
              </Link>
            )
          })}
        </Card>
      )}
      {filtered && visible.length > 0 && <p className="mt-2 text-sm text-stone-500">{visible.length} von {counts.all} Gegenständen</p>}
    </>
  )
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-stone-200">
    <p className="text-sm text-stone-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
)
