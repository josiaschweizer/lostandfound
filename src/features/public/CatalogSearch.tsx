import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, SearchX, X } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { addDays, formatShortDate, todayIso } from '@/domain/dates'
import { searchCatalog, type CatalogFilters } from '@/domain/search'
import { CATEGORIES } from '@/domain/types'
import { Swatch } from '@/components/items/ColorDot'
import { ITEM_GRID, ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { cn } from '@/components/ui/cn'
import { COLORS } from '@/domain/types'
import { useCatalog, useOfficeMap, useOffices, useSynonyms } from './queries'
import { lossReportUrl, useCatalogFilters } from './searchParams'

const PERIODS = ['all', '7', '30'] as const
type Period = (typeof PERIODS)[number]

const periodOf = (filters: CatalogFilters): Period | null => {
  if (!filters.from && !filters.to) return 'all'
  if (filters.to) return null
  if (filters.from === addDays(todayIso(), -7)) return '7'
  if (filters.from === addDays(todayIso(), -30)) return '30'
  return null
}

const chipClass = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 transition',
    active ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-300 hover:ring-stone-500',
  )

/**
 * Suche mit direkt sichtbarer Filterleiste (KONZEPT 5.2): Live-Suche (300 ms), X zum Leeren,
 * aktive Filter als entfernbare Chips, Synonym-Block bei weniger als 3 Treffern.
 * Mit `officeId` sucht sie nur in einer Fundstelle (Seite /o/:slug).
 */
export const CatalogSearch = ({ officeId, officeSlug }: { officeId?: string; officeSlug?: string }) => {
  const fixed = useMemo(() => (officeId ? { officeId } : undefined), [officeId])
  const { filters, update, reset } = useCatalogFilters(fixed)
  const catalog = useCatalog()
  const offices = useOffices()
  const officeMap = useOfficeMap()
  const synonyms = useSynonyms()
  const ids = useId()

  // Live-Suche: Eingabe sofort anzeigen, Suche und URL nach 300 ms aktualisieren
  const [input, setInput] = useState(filters.query)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onInput = (value: string) => {
    setInput(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => update({ query: value }), 300)
  }

  const { results, similar, alsoSearched } = useMemo(
    () => searchCatalog(catalog.data ?? [], filters, (item) => officeMap.get(item.organisationId)?.name ?? '', synonyms.data ?? []),
    [catalog.data, filters, officeMap, synonyms.data],
  )

  const period = periodOf(filters)
  const activeChips: { key: string; label: React.ReactNode; text: string; remove: () => void }[] = [
    ...(filters.category
      ? [{ key: 'kat', label: t.labels.categories[filters.category], text: t.labels.categories[filters.category], remove: () => update({ category: '' }) }]
      : []),
    ...filters.colors.map((color) => ({
      key: `farbe-${color}`,
      label: (
        <>
          <Swatch color={color} /> {t.labels.colors[color]}
        </>
      ),
      text: t.labels.colors[color],
      remove: () => update({ colors: filters.colors.filter((c) => c !== color) }),
    })),
    ...(filters.from || filters.to
      ? [
          {
            key: 'zeit',
            label: period && period !== 'all' ? t.search.periods[period] : [filters.from && t.search.since(formatShortDate(filters.from)), filters.to && t.search.until(formatShortDate(filters.to))].filter(Boolean).join(' '),
            text: t.search.period,
            remove: () => update({ from: '', to: '' }),
          },
        ]
      : []),
    ...(!officeId && filters.officeId
      ? [{ key: 'stelle', label: officeMap.get(filters.officeId)?.name ?? t.search.office, text: t.search.office, remove: () => update({ officeId: '' }) }]
      : []),
  ]

  const officeName = (organisationId: string) => (officeId ? undefined : officeMap.get(organisationId)?.name)

  return (
    <div className="space-y-5">
      <form role="search" className="space-y-4 rounded-3xl bg-white p-3 shadow-xs ring-1 ring-stone-200/80 sm:p-5" onSubmit={(event) => event.preventDefault()}>
        <div className="relative">
          <label htmlFor={`${ids}-q`} className="sr-only">
            {t.search.label}
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <Input
            id={`${ids}-q`}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            className="h-13 pr-12 pl-10 text-lg"
            placeholder={t.search.placeholder}
            value={input}
            onChange={(event) => onInput(event.target.value)}
          />
          {input && (
            <button
              type="button"
              aria-label={t.search.clear}
              onClick={() => {
                clearTimeout(timer.current)
                setInput('')
                update({ query: '' })
              }}
              className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>

        <fieldset className="min-w-0 space-y-3">
          <legend className="sr-only">{t.search.filters}</legend>
          <div className={cn('grid gap-3', officeId ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            <div>
              <label htmlFor={`${ids}-kat`} className="mb-1 block text-sm font-medium text-stone-700">
                {t.search.category}
              </label>
              <Select
                id={`${ids}-kat`}
                value={filters.category}
                placeholder={t.search.allCategories}
                options={CATEGORIES.map((value) => ({ value, label: t.labels.categories[value] }))}
                onChange={(event) => update({ category: event.target.value as CatalogFilters['category'] })}
              />
            </div>
            {!officeId && (
              <div>
                <label htmlFor={`${ids}-stelle`} className="mb-1 block text-sm font-medium text-stone-700">
                  {t.search.office}
                </label>
                <Select
                  id={`${ids}-stelle`}
                  value={filters.officeId}
                  placeholder={t.search.allOffices}
                  options={(offices.data ?? []).map((office) => ({ value: office.id, label: office.name }))}
                  onChange={(event) => update({ officeId: event.target.value })}
                />
              </div>
            )}
            <div>
              <span className="mb-1 block text-sm font-medium text-stone-700" id={`${ids}-period`}>
                {t.search.period}
              </span>
              <div className="flex gap-1 rounded-xl bg-stone-100 p-1" role="group" aria-labelledby={`${ids}-period`}>
                {PERIODS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={period === value}
                    onClick={() => update(value === 'all' ? { from: '', to: '' } : { from: addDays(todayIso(), -Number(value)), to: '' })}
                    className={cn(
                      'min-h-10 flex-1 rounded-lg px-2 text-sm font-medium whitespace-nowrap transition',
                      period === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-700 hover:text-stone-900',
                    )}
                  >
                    {t.search.periods[value]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-stone-700" id={`${ids}-farbe`}>
              {t.search.colors}
            </span>
            {/* Mobile: horizontal scrollbar mit sichtbarem Verlauf am Rand, Chips umbrechen nie */}
            <div className="relative -mx-3 sm:mx-0">
              <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-labelledby={`${ids}-farbe`}>
                {COLORS.map((color) => {
                  const active = filters.colors.includes(color)
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={active}
                      className={chipClass(active)}
                      onClick={() => update({ colors: active ? filters.colors.filter((c) => c !== color) : [...filters.colors, color] })}
                    >
                      <Swatch color={color} />
                      {t.labels.colors[color]}
                    </button>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-white sm:hidden" aria-hidden />
            </div>
          </div>
        </fieldset>
      </form>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label={t.search.activeFilters} role="group">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              aria-label={t.search.removeFilter(chip.text)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-50 px-3.5 text-sm font-medium text-brand-900 ring-1 ring-brand-200 hover:bg-brand-100"
            >
              {chip.label}
              <X className="size-4" aria-hidden />
            </button>
          ))}
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-stone-700 underline underline-offset-2 hover:text-stone-900">
            {t.search.clearAll}
          </button>
        </div>
      )}

      {catalog.isError && <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />}

      {catalog.isPending ? (
        <ul className={ITEM_GRID} aria-label={t.common.loading}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <ItemCardSkeleton />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p aria-live="polite" className="font-medium text-stone-800" data-testid="result-count">
            {t.search.count(results.length)}
          </p>
          {results.length > 0 && (
            <ul className={ITEM_GRID}>
              {results.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} officeName={officeName(item.organisationId)} />
                </li>
              ))}
            </ul>
          )}

          {similar.length > 0 && (
            <section aria-labelledby={`${ids}-similar`} className="space-y-3 rounded-3xl bg-stone-100/70 p-4 sm:p-5">
              <div>
                <h2 id={`${ids}-similar`} className="text-lg font-semibold">
                  {t.search.similar}
                </h2>
                <p className="text-stone-700">{t.search.alsoSearched(alsoSearched.join(', '))}</p>
              </div>
              <ul className={ITEM_GRID}>
                {similar.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} officeName={officeName(item.organisationId)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.length === 0 && similar.length === 0 && (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title={t.search.nothing}
              action={
                <ButtonLink to={lossReportUrl(filters, officeSlug)} className="max-w-full whitespace-normal">
                  {t.search.reportCta}
                </ButtonLink>
              }
            >
              {t.search.nothingTips}
            </EmptyState>
          )}
        </>
      )}
    </div>
  )
}
