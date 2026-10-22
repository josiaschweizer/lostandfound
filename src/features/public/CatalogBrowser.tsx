import { useMemo } from 'react'
import { RotateCcw, Search, SearchX } from 'lucide-react'
import { filterCatalog, hasActiveFilters } from '@/domain/catalog'
import { CATEGORY_LABELS, COLOR_LABELS, toOptions } from '@/domain/labels'
import type { ItemCategory, ItemColor } from '@/domain/types'
import { ITEM_GRID, ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { cn } from '@/components/ui/cn'
import { useCatalog, useOrganisationLookup, useOrganisations } from './queries'
import { useCatalogFilters } from './useCatalogFilters'

interface CatalogBrowserProps {
  /** Wenn gesetzt: Suche nur innerhalb dieser Organisation. */
  organisationId?: string
}

const FilterLabel = ({ htmlFor, children }: { htmlFor: string; children: string }) => (
  <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-stone-600">
    {children}
  </label>
)

/** Suchfeld, Filter und Ergebnisliste – global oder für eine Organisation. */
export const CatalogBrowser = ({ organisationId }: CatalogBrowserProps) => {
  const fixed = useMemo(() => (organisationId ? { organisationId } : {}), [organisationId])
  const { filters, setFilter, resetFilters } = useCatalogFilters(fixed)
  const catalog = useCatalog()
  const organisations = useOrganisations()
  const lookup = useOrganisationLookup()

  const results = useMemo(
    () =>
      filterCatalog(catalog.data ?? [], filters, (item) => {
        const org = lookup.get(item.organisationId)
        return org ? [org.name, org.address] : []
      }),
    [catalog.data, filters, lookup],
  )
  const active = hasActiveFilters(filters, organisationId ? ['organisationId'] : [])

  return (
    <div className="space-y-6">
      <form
        role="search"
        className="space-y-4 rounded-3xl bg-white p-4 shadow-xs ring-1 ring-stone-200/80 sm:p-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="catalog-query" className="sr-only">
            Suchbegriff
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
            <Input
              id="catalog-query"
              type="search"
              placeholder="Was haben Sie verloren? z. B. Rucksack, Kopfhörer, Schlüssel"
              className="h-12 pl-10 text-base"
              value={filters.query}
              onChange={(e) => setFilter('query', e.target.value)}
            />
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Kategorie">
          {[{ value: '' as const, label: 'Alle' }, ...toOptions(CATEGORY_LABELS)].map((c) => {
            const active = filters.category === c.value
            return (
              <button
                key={c.value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter('category', c.value as ItemCategory | '')}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ring-1 transition',
                  active ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-200 hover:ring-stone-400',
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <div className={cn('grid gap-3 sm:grid-cols-2', organisationId ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
          <div>
            <FilterLabel htmlFor="f-color">Farbe</FilterLabel>
            <Select id="f-color" placeholder="Alle Farben" options={toOptions(COLOR_LABELS)} value={filters.color} onChange={(e) => setFilter('color', e.target.value as ItemColor | '')} />
          </div>
          {!organisationId && (
            <div>
              <FilterLabel htmlFor="f-org">Organisation / Standort</FilterLabel>
              <Select
                id="f-org"
                placeholder="Alle Organisationen"
                options={(organisations.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
                value={filters.organisationId}
                onChange={(e) => setFilter('organisationId', e.target.value)}
              />
            </div>
          )}
          <div>
            <FilterLabel htmlFor="f-from">Gefunden ab</FilterLabel>
            <Input id="f-from" type="date" value={filters.foundFrom} max={filters.foundTo || undefined} onChange={(e) => setFilter('foundFrom', e.target.value)} />
          </div>
          <div>
            <FilterLabel htmlFor="f-to">Gefunden bis</FilterLabel>
            <Input id="f-to" type="date" value={filters.foundTo} min={filters.foundFrom || undefined} onChange={(e) => setFilter('foundTo', e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
          <p aria-live="polite">
            {catalog.isSuccess && (
              <>
                <strong className="text-stone-900">{results.length}</strong> {results.length === 1 ? 'Fundgegenstand' : 'Fundgegenstände'}
              </>
            )}
          </p>
          {active && (
            <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
      </form>

      {catalog.isPending && (
        <div className={ITEM_GRID} role="status" aria-label="Fundgegenstände werden geladen">
          {Array.from({ length: 8 }, (_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      )}
      {catalog.isError && <ErrorState error={catalog.error} />}
      {catalog.isSuccess && results.length === 0 && (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Keine passenden Fundgegenstände"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {active && (
                <Button variant="secondary" onClick={resetFilters} icon={<RotateCcw className="size-4" />}>
                  Filter zurücksetzen
                </Button>
              )}
              <ButtonLink to={organisationId ? `/verlust-melden?org=${organisationId}` : '/verlust-melden'}>Verlust melden</ButtonLink>
            </div>
          }
        >
          Versuchen Sie einen anderen Begriff oder weniger Filter. Oder melden Sie den Verlust – wir zeigen Ihnen passende Funde, sobald sie erfasst werden.
        </EmptyState>
      )}
      {results.length > 0 && (
        <ul className={ITEM_GRID}>
          {results.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} to={`/fund/${item.id}`} organisationName={organisationId ? undefined : lookup.get(item.organisationId)?.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
