import type { FoundItem, ItemCategory, ItemColor } from './types'

export interface CatalogFilters {
  query: string
  category: ItemCategory | ''
  color: ItemColor | ''
  organisationId: string
  /** Gefunden am oder nach diesem Datum (YYYY-MM-DD). */
  foundFrom: string
  /** Gefunden am oder vor diesem Datum (YYYY-MM-DD). */
  foundTo: string
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: '',
  category: '',
  color: '',
  organisationId: '',
  foundFrom: '',
  foundTo: '',
}

export const hasActiveFilters = (filters: CatalogFilters, ignore: (keyof CatalogFilters)[] = []): boolean =>
  (Object.keys(filters) as (keyof CatalogFilters)[]).some((key) => !ignore.includes(key) && filters[key] !== '')

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Durchsucht nur öffentliche Angaben. Interne Merkmale sind hier nie vorhanden. */
export const matchesQuery = (item: FoundItem, query: string, extraText: string[] = []): boolean => {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalize(
    [item.title, item.brand ?? '', item.publicDescription, item.foundLocation, item.itemNumber, ...extraText].join(' '),
  )
  return terms.every((term) => haystack.includes(term))
}

export const filterCatalog = <T extends FoundItem>(
  items: readonly T[],
  filters: CatalogFilters,
  searchableExtras: (item: T) => string[] = () => [],
): T[] =>
  items
    .filter((item) => !filters.category || item.category === filters.category)
    .filter((item) => !filters.color || item.color === filters.color)
    .filter((item) => !filters.organisationId || item.organisationId === filters.organisationId)
    .filter((item) => !filters.foundFrom || item.foundOn >= filters.foundFrom)
    .filter((item) => !filters.foundTo || item.foundOn <= filters.foundTo)
    .filter((item) => matchesQuery(item, filters.query, searchableExtras(item)))
    .sort((a, b) => b.foundOn.localeCompare(a.foundOn) || b.createdAt.localeCompare(a.createdAt))
