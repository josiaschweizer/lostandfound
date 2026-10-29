import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { EMPTY_FILTERS, type CatalogFilters } from '@/domain/catalog'

const PARAM_NAMES: Record<keyof CatalogFilters, string> = {
  query: 'q',
  category: 'kategorie',
  color: 'farbe',
  organisationId: 'org',
  foundFrom: 'von',
  foundTo: 'bis',
}

/** Filter liegen in der URL – so lassen sich Suchen teilen und mit «Zurück» wiederherstellen. */
/** `fixed` muss eine stabile Referenz sein (useMemo), z. B. die Organisation der Seite. */
export const useCatalogFilters = (fixed: Partial<CatalogFilters>) => {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => {
    const fromUrl = Object.fromEntries(
      (Object.keys(PARAM_NAMES) as (keyof CatalogFilters)[]).map((key) => [key, params.get(PARAM_NAMES[key]) ?? '']),
    ) as unknown as CatalogFilters
    return { ...EMPTY_FILTERS, ...fromUrl, ...fixed }
  }, [params, fixed])

  const setFilter = useCallback(
    <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(PARAM_NAMES[key], value)
          else next.delete(PARAM_NAMES[key])
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const resetFilters = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { filters, setFilter, resetFilters }
}

export const searchUrl = (filters: Partial<CatalogFilters>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters) as [keyof CatalogFilters, string][]) {
    if (value) params.set(PARAM_NAMES[key], value)
  }
  const qs = params.toString()
  return qs ? `/suche?${qs}` : '/suche'
}

/**
 * Link zu «Verlust melden» mit den Angaben aus der Suche – so muss niemand alles nochmals eintippen.
 * Ein «Gefunden ab»-Datum wird als Verlustdatum übernommen.
 */
export const lossReportUrl = (filters: Partial<CatalogFilters>): string => {
  const params = new URLSearchParams()
  if (filters.query?.trim()) params.set('titel', filters.query.trim())
  if (filters.category) params.set('kategorie', filters.category)
  if (filters.color) params.set('farbe', filters.color)
  if (filters.organisationId) params.set('org', filters.organisationId)
  if (filters.foundFrom) params.set('datum', filters.foundFrom)
  const qs = params.toString()
  return qs ? `/verlust-melden?${qs}` : '/verlust-melden'
}
