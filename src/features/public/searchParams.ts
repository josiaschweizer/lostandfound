import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { EMPTY_FILTERS, type CatalogFilters } from '@/domain/search'
import { isCategory, isColor } from '@/domain/types'

/** Filter liegen in der URL (?q=&kat=&farbe=&von=&bis=&stelle=), damit Links teilbar sind und Neuladen sie behält. */
const PARAMS = { query: 'q', category: 'kat', colors: 'farbe', from: 'von', to: 'bis', officeId: 'stelle' } as const

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const parseFilters = (params: URLSearchParams): CatalogFilters => {
  const category = params.get(PARAMS.category)
  const from = params.get(PARAMS.from) ?? ''
  const to = params.get(PARAMS.to) ?? ''
  return {
    query: params.get(PARAMS.query) ?? '',
    category: isCategory(category) ? category : '',
    colors: (params.get(PARAMS.colors) ?? '').split(',').filter(isColor),
    from: ISO_DATE.test(from) ? from : '',
    to: ISO_DATE.test(to) ? to : '',
    officeId: params.get(PARAMS.officeId) ?? '',
  }
}

export const filtersToParams = (filters: Partial<CatalogFilters>): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters.query) params.set(PARAMS.query, filters.query)
  if (filters.category) params.set(PARAMS.category, filters.category)
  if (filters.colors?.length) params.set(PARAMS.colors, filters.colors.join(','))
  if (filters.from) params.set(PARAMS.from, filters.from)
  if (filters.to) params.set(PARAMS.to, filters.to)
  if (filters.officeId) params.set(PARAMS.officeId, filters.officeId)
  return params
}

export const searchUrl = (filters: Partial<CatalogFilters>): string => {
  const qs = filtersToParams(filters).toString()
  return qs ? `/suche?${qs}` : '/suche'
}

/** Angaben aus der Suche in die Verlustmeldung übernehmen. */
export const lossReportUrl = (filters: Partial<CatalogFilters>, officeSlug?: string): string => {
  const params = new URLSearchParams()
  if (filters.query?.trim()) params.set('titel', filters.query.trim())
  if (filters.category) params.set('kat', filters.category)
  if (filters.colors?.length) params.set('farbe', filters.colors.join(','))
  if (officeSlug) params.set('stelle', officeSlug)
  const qs = params.toString()
  return qs ? `/verlust-melden?${qs}` : '/verlust-melden'
}

const currentParams = () => new URLSearchParams(window.location.search)

/** `fixed` überschreibt Werte aus der URL (z. B. die Fundstelle auf ihrer eigenen Seite). Stabil übergeben (useMemo). */
export const useCatalogFilters = (fixed?: Partial<CatalogFilters>) => {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => ({ ...EMPTY_FILTERS, ...parseFilters(params), ...fixed }), [params, fixed])

  const update = useCallback(
    (patch: Partial<CatalogFilters>) => {
      // Immer von der aktuellen Adresse ausgehen: Die verzögerte Live-Suche (300 ms) darf einen
      // inzwischen gesetzten Filter nicht mit einem älteren Stand überschreiben.
      setParams(() => filtersToParams({ ...parseFilters(currentParams()), ...patch }), { replace: true })
    },
    [setParams],
  )
  const reset = useCallback(() => setParams(() => filtersToParams({ query: parseFilters(currentParams()).query }), { replace: true }), [setParams])

  return { filters, update, reset }
}
