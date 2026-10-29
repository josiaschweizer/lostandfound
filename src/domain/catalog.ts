import { CATEGORY_LABELS, COLOR_LABELS } from './labels'
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

/**
 * Gleichbedeutende Wörter (klein, ohne Umlaute – wie nach `normalize`).
 * Wer «Natel» sucht, findet so auch «Smartphone».
 */
const SYNONYM_GROUPS: string[][] = [
  ['handy', 'natel', 'smartphone', 'iphone', 'mobiltelefon', 'telefon', 'phone', 'mobile'],
  ['portemonnaie', 'portmonee', 'geldbeutel', 'geldborse', 'brieftasche', 'wallet', 'purse'],
  ['rucksack', 'schulsack', 'backpack'],
  ['kopfhorer', 'ohrhorer', 'headphones', 'headset', 'earbuds', 'airpods'],
  ['schlussel', 'schluessel', 'schlusselbund', 'hausschlussel', 'veloschlussel', 'key', 'keys'],
  ['jacke', 'regenjacke', 'windjacke', 'mantel', 'daunenjacke', 'jacket', 'coat'],
  ['pullover', 'pulli', 'hoodie', 'sweatshirt', 'kapuzenpulli', 'sweater'],
  ['brille', 'sonnenbrille', 'lesebrille', 'glasses', 'sunglasses'],
  ['flasche', 'trinkflasche', 'wasserflasche', 'bottle'],
  ['schirm', 'regenschirm', 'taschenschirm', 'umbrella'],
  ['laptop', 'notebook', 'computer'],
  ['ladegerat', 'ladekabel', 'netzteil', 'kabel', 'charger'],
  ['ausweis', 'identitatskarte', 'badge', 'karte', 'card'],
  ['uhr', 'armbanduhr', 'smartwatch', 'watch'],
  ['schmuck', 'ring', 'kette', 'halskette', 'armband', 'jewelry', 'jewellery'],
  ['mutze', 'kappe', 'cap', 'beanie'],
  ['velo', 'fahrrad', 'bike'],
]

/**
 * Das Suchwort selbst plus Synonyme (auch bei Mehrzahl: «handys» → Handy-Gruppe).
 * Sehr kurze Synonyme (z. B. «uhr») werden nicht ergänzt, weil sie in vielen Wörtern vorkommen.
 */
const expandTerm = (term: string): string[] => {
  const group = SYNONYM_GROUPS.find((words) => words.some((w) => term === w || (w.length >= 5 && term.startsWith(w))))
  return group ? [term, ...group.filter((w) => w !== term && w.length >= 4)] : [term]
}

/** Durchsucht nur öffentliche Angaben. Interne Merkmale sind hier nie vorhanden. */
const matchesQuery = (item: FoundItem, query: string, extraText: string[] = []): boolean => {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalize(
    [
      item.title,
      item.brand ?? '',
      item.publicDescription,
      item.foundLocation,
      item.itemNumber,
      // Farbe und Kategorie mitdurchsuchen: «Portemonnaie braun» findet so auch ein braunes Portemonnaie.
      COLOR_LABELS[item.color],
      CATEGORY_LABELS[item.category],
      ...extraText,
    ].join(' '),
  )
  return terms.every((term) => expandTerm(term).some((variant) => haystack.includes(variant)))
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
