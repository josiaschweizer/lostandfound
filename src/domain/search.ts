import { t } from '@/i18n/de-CH'
import type { ItemCategory, ItemColor, PublicItem } from './types'

/**
 * Öffentliche Suche (KONZEPT 5.2): Gross-/Kleinschreibung und Umlaute egal (ä = ae),
 * einfache Pluralformen werden gekürzt. Liefert die normale Suche weniger als 3 Treffer,
 * werden die Suchwörter mit lokalen Synonymen erweitert («Ähnliche Gegenstände»).
 */

export interface CatalogFilters {
  query: string
  category: ItemCategory | ''
  colors: ItemColor[]
  from: string
  to: string
  officeId: string
}

export const EMPTY_FILTERS: CatalogFilters = { query: '', category: '', colors: [], from: '', to: '', officeId: '' }

export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const STOP_WORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'einen', 'mit', 'und', 'oder', 'von', 'im', 'am', 'in', 'an', 'auf', 'bei',
  'mein', 'meine', 'meinen', 'ich', 'habe', 'hab', 'verloren', 'gefunden', 'fuer', 'aus', 'zu',
])

/** Kürzt einfache Endungen (-en, -er, -es, -em, -e, -n, -s), damit «Jacken» und «Jacke» gleich gefunden werden. */
export const stem = (word: string): string => {
  if (word.length > 5 && /(en|er|es|em)$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && /[ens]$/.test(word)) return word.slice(0, -1)
  return word
}

export const searchTerms = (query: string): string[] =>
  normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))

interface Haystack {
  text: string
  words: string[]
}

const buildHaystack = (item: PublicItem, officeName: string): Haystack => {
  const text = normalize(
    [
      item.title,
      item.brand ?? '',
      item.publicDescription,
      item.foundLocation,
      item.itemNumber,
      t.labels.categories[item.category],
      ...item.colors.map((color) => t.labels.colors[color]),
      officeName,
    ].join(' '),
  )
  return { text, words: text.split(/[^a-z0-9]+/).filter(Boolean) }
}

/** Kurze Wörter (z. B. «rot», «ID») müssen am Wortanfang stehen, längere dürfen auch in Zusammensetzungen vorkommen. */
const termMatches = (term: string, hay: Haystack): boolean => {
  const stemmed = stem(term)
  if (stemmed.length < 4) return hay.words.some((word) => word === term || word.startsWith(stemmed))
  return hay.text.includes(stemmed)
}

const passesFilters = (item: PublicItem, filters: CatalogFilters): boolean =>
  (!filters.category || item.category === filters.category) &&
  (filters.colors.length === 0 || item.colors.some((color) => filters.colors.includes(color))) &&
  (!filters.from || item.foundOn >= filters.from) &&
  (!filters.to || item.foundOn <= filters.to) &&
  (!filters.officeId || item.organisationId === filters.officeId)

const byNewest = (a: PublicItem, b: PublicItem) => b.foundOn.localeCompare(a.foundOn) || b.createdAt.localeCompare(a.createdAt)

/** Synonymgruppen aus der Datenbank (search_synonyms), z. B. [«Jacke», «Winterjacke», «Mantel»]. */
export type SynonymGroups = string[][]

/** Alternativen pro Suchwort: das Wort selbst plus die übrigen Wörter seiner Synonymgruppe. */
export const expandTerms = (terms: string[], groups: SynonymGroups): { alternatives: string[][]; shown: string[] } => {
  const shown: string[] = []
  const alternatives = terms.map((term) => {
    const group = groups.find((words) =>
      words.some((word) => {
        const synonym = normalize(word)
        return synonym === term || stem(synonym) === stem(term) || (synonym.length >= 5 && term.includes(synonym))
      }),
    )
    if (!group) return [term]
    const others = group.filter((word) => normalize(word) !== term)
    for (const word of others) if (!shown.includes(word)) shown.push(word)
    return [term, ...others.map(normalize)]
  })
  return { alternatives, shown }
}

export interface CatalogResult<T extends PublicItem> {
  results: T[]
  similar: T[]
  /** Synonyme, nach denen zusätzlich gesucht wurde («auch gesucht nach: …») */
  alsoSearched: string[]
}

export const SIMILAR_THRESHOLD = 3

export const searchCatalog = <T extends PublicItem>(
  items: readonly T[],
  filters: CatalogFilters,
  officeName: (item: T) => string,
  synonyms: SynonymGroups = [],
): CatalogResult<T> => {
  const terms = searchTerms(filters.query)
  const candidates = items.filter((item) => passesFilters(item, filters))
  const haystacks = new Map(candidates.map((item) => [item.id, buildHaystack(item, officeName(item))]))
  const hay = (item: T) => haystacks.get(item.id)!

  const results = candidates.filter((item) => terms.every((term) => termMatches(term, hay(item)))).sort(byNewest)
  if (terms.length === 0 || results.length >= SIMILAR_THRESHOLD) return { results, similar: [], alsoSearched: [] }

  const { alternatives, shown } = expandTerms(terms, synonyms)
  if (shown.length === 0) return { results, similar: [], alsoSearched: [] }
  const found = new Set(results.map((item) => item.id))
  const similar = candidates
    .filter((item) => !found.has(item.id))
    .filter((item) => alternatives.every((options) => options.some((option) => termMatches(option, hay(item)))))
    .sort(byNewest)
  return { results, similar, alsoSearched: similar.length > 0 ? shown.slice(0, 4) : [] }
}
