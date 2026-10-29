import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { RotateCcw, Search, SearchX, Sparkles } from 'lucide-react'
import { AI_SEARCH_MAX_CANDIDATES, pickAiMatches, toSearchCandidate } from '@/domain/aiMatching'
import { filterCatalog, hasActiveFilters } from '@/domain/catalog'
import { CATEGORY_LABELS, COLOR_LABELS, toOptions } from '@/domain/labels'
import type { ItemCategory, ItemColor } from '@/domain/types'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { searchWithAi } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiReason, AiScoreBadge } from '@/components/ai/AiMatch'
import { ITEM_GRID, ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { cn } from '@/components/ui/cn'
import { useCatalog, useOrganisationLookup, useOrganisations } from './queries'
import { lossReportUrl, useCatalogFilters } from './useCatalogFilters'

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

  // KI-Suche: ergänzt die Treffer um Gegenstände, die anders beschrieben sind.
  // Sparsam: erst nach einer Tipppause, nur ab 3 Zeichen, Ergebnisse werden pro Suche zwischengespeichert.
  const [aiEnabled, setAiEnabled] = useState(readAiPreference)
  const toggleAi = () => {
    setAiEnabled((on) => {
      writeAiPreference(!on)
      return !on
    })
  }
  const aiQuery = useDebouncedValue(filters.query.trim(), 900)
  const aiCandidates = useMemo(() => {
    if (!aiEnabled || aiQuery.length < 3) return []
    const shown = new Set(results.map((r) => r.id))
    return filterCatalog(catalog.data ?? [], { ...filters, query: '' })
      .filter((item) => !shown.has(item.id))
      .slice(0, AI_SEARCH_MAX_CANDIDATES)
  }, [aiEnabled, aiQuery, results, catalog.data, filters])
  const aiSearch = useQuery({
    queryKey: ['ai-search', aiQuery, aiCandidates.map((c) => c.id).join(',')],
    queryFn: () => searchWithAi(aiQuery, aiCandidates.map((i) => toSearchCandidate(i, lookup.get(i.organisationId)?.name ?? null))),
    enabled: aiCandidates.length > 0 && aiQuery === filters.query.trim(),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  })
  const aiMatches = aiEnabled && aiSearch.data ? pickAiMatches(aiCandidates, aiSearch.data) : []
  const aiPending = aiEnabled && aiSearch.isFetching

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
              placeholder={aiEnabled ? 'Beschreiben Sie, was Sie verloren haben …' : 'Was haben Sie verloren? z. B. Rucksack, Natel, Schlüssel'}
              className="h-12 pr-24 pl-10 text-base"
              value={filters.query}
              onChange={(e) => setFilter('query', e.target.value)}
            />
            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              aria-label="KI-Suche"
              title={aiEnabled ? 'KI-Suche ausschalten' : 'KI-Suche einschalten: findet auch anders beschriebene Gegenstände'}
              onClick={toggleAi}
              className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5 rounded-full py-1 pr-1 pl-2 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              <Sparkles className={cn('size-3.5', aiEnabled ? 'text-brand-600' : 'text-stone-400')} aria-hidden />
              KI
              <span className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition', aiEnabled ? 'bg-brand-600' : 'bg-stone-300')}>
                <span className={cn('inline-block size-4 rounded-full bg-white shadow transition', aiEnabled ? 'translate-x-4.5' : 'translate-x-0.5')} />
              </span>
            </button>
          </div>
          {aiEnabled && (
            <p className="mt-2 flex items-center gap-1 text-xs text-brand-700">
              <Sparkles className="size-3.5" aria-hidden />
              KI-Suche aktiv: Zusätzlich zu den Treffern sucht die KI nach anders beschriebenen Gegenständen – auch ganze Sätze funktionieren.
            </p>
          )}
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
              <FilterLabel htmlFor="f-org">Fundstelle</FilterLabel>
              <Select
                id="f-org"
                placeholder="Alle Fundstellen"
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
                <strong className="text-stone-900">{results.length + aiMatches.length}</strong>{' '}
                {results.length + aiMatches.length === 1 ? 'Fundgegenstand' : 'Fundgegenstände'}
                {aiMatches.length > 0 && <span className="text-brand-700"> · davon {aiMatches.length} von der KI ergänzt</span>}
                {aiPending && <span className="text-brand-700"> · KI sucht weitere …</span>}
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
      {catalog.isSuccess && results.length === 0 && aiMatches.length === 0 && !aiPending && (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Keine passenden Fundgegenstände"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {!aiEnabled && filters.query.trim().length >= 3 && (
                <Button variant="secondary" size="sm" icon={<Sparkles className="size-4 text-brand-600" />} onClick={toggleAi}>
                  KI-Suche einschalten
                </Button>
              )}
              {active && (
                <Button variant="secondary" size="sm" onClick={resetFilters} icon={<RotateCcw className="size-4" />}>
                  Filter zurücksetzen
                </Button>
              )}
              <ButtonLink to={lossReportUrl(filters)} size="sm">
                Verlust melden
              </ButtonLink>
            </div>
          }
        >
          Vielleicht wurde der Gegenstand noch nicht abgegeben. Melden Sie den Verlust – Ihre Angaben aus der Suche werden übernommen, und die
          Fundstellen sehen Ihre Meldung.
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
      {aiEnabled && (aiMatches.length > 0 || aiPending || aiSearch.isError) && (
        <section aria-labelledby="ai-results-title" className="space-y-4 rounded-3xl bg-brand-50/60 p-4 ring-1 ring-brand-100 sm:p-5">
          <h2 id="ai-results-title" className="flex items-center gap-2 font-semibold text-stone-900">
            <Sparkles className="size-4 text-brand-600" aria-hidden /> Von der KI ergänzt
          </h2>
          {aiPending && (
            <p className="flex items-center gap-2 text-sm text-stone-600" role="status">
              <span className="size-4 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" aria-hidden />
              Die KI prüft weitere Gegenstände …
            </p>
          )}
          {aiSearch.isError && !aiPending && <p className="text-sm font-medium text-red-700">{toUserMessage(aiSearch.error)}</p>}
          {aiMatches.length > 0 && (
            <ul className={ITEM_GRID}>
              {aiMatches.map(({ entry: item, score, reason }) => (
                <li key={item.id} className="space-y-2">
                  <ItemCard item={item} to={`/fund/${item.id}`} organisationName={organisationId ? undefined : lookup.get(item.organisationId)?.name} />
                  <div className="space-y-1 px-1">
                    <AiScoreBadge score={score} />
                    <AiReason>{reason}</AiReason>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {aiMatches.length > 0 && <p className="text-xs text-stone-500">Vorschläge der KI – bitte die Angaben selbst prüfen.</p>}
        </section>
      )}
      {(results.length > 0 || aiMatches.length > 0) && (
        <p className="text-center text-sm text-stone-600">
          Nicht dabei?{' '}
          <Link to={lossReportUrl(filters)} className="font-medium text-brand-700 underline underline-offset-2">
            Verlust melden
          </Link>{' '}
          – Ihre Suchangaben werden übernommen.
        </p>
      )}
    </div>
  )
}

const AI_PREFERENCE_KEY = 'lostandfound:ai-search'

const readAiPreference = (): boolean => {
  try {
    return localStorage.getItem(AI_PREFERENCE_KEY) === '1'
  } catch {
    return false
  }
}

const writeAiPreference = (on: boolean) => {
  try {
    if (on) localStorage.setItem(AI_PREFERENCE_KEY, '1')
    else localStorage.removeItem(AI_PREFERENCE_KEY)
  } catch {
    /* ohne Speicher: Schalter gilt nur für diese Seite */
  }
}
