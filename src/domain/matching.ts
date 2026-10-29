import { daysBetween } from './dates'
import type { FoundItem, ItemCategory, ItemColor } from './types'

/**
 * Abgleich Verlustmeldung ↔ Fundgegenstand (vereinbarte Regel):
 * 1. Pflicht: gleiche Kategorie.
 * 2. Pflicht: Funddatum am oder nach dem Verlustdatum, höchstens 30 Tage später.
 * 3. Rangfolge: gleiche Farbe (+2), jedes gemeinsame Stichwort aus Titel/Marke/Beschreibung (+1).
 * Treffer sind nur Vorschläge – es wird nichts automatisch reserviert.
 */
export const MATCH_WINDOW_DAYS = 30
const COLOR_SCORE = 2
const KEYWORD_SCORE = 1

export interface MatchCriteria {
  organisationId: string | null
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  lostOn: string
  description: string
}

interface MatchResult<T extends FoundItem = FoundItem> {
  item: T
  score: number
  colorMatches: boolean
  sharedKeywords: string[]
}

const STOP_WORDS = new Set([
  'und', 'oder', 'mit', 'ohne', 'der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'einen',
  'den', 'dem', 'des', 'von', 'vom', 'für', 'aus', 'auf', 'bei', 'beim', 'ist', 'sind', 'nicht',
  'sehr', 'mein', 'meine', 'ich', 'habe', 'ca', 'etwa', 'innen', 'aussen',
])

/** Zerlegt Text in vergleichbare Stichworte (klein, ohne Füllwörter, ab 3 Zeichen). */
export const extractKeywords = (...texts: (string | null | undefined)[]): Set<string> => {
  const words = texts
    .filter((t): t is string => Boolean(t))
    .join(' ')
    .toLowerCase()
    .normalize('NFC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  return new Set(words)
}

const isCandidate = (criteria: MatchCriteria, item: FoundItem): boolean => {
  if (item.status === 'returned') return false
  if (criteria.organisationId && item.organisationId !== criteria.organisationId) return false
  if (item.category !== criteria.category) return false
  const days = daysBetween(criteria.lostOn, item.foundOn)
  return days >= 0 && days <= MATCH_WINDOW_DAYS
}

export const scoreMatch = <T extends FoundItem>(criteria: MatchCriteria, item: T): MatchResult<T> => {
  const reportWords = extractKeywords(criteria.title, criteria.brand, criteria.description)
  const itemWords = extractKeywords(item.title, item.brand, item.publicDescription)
  const sharedKeywords = [...reportWords].filter((w) => itemWords.has(w)).sort()
  const colorMatches = item.color === criteria.color
  const score = (colorMatches ? COLOR_SCORE : 0) + sharedKeywords.length * KEYWORD_SCORE
  return { item, score, colorMatches, sharedKeywords }
}

/** Liefert passende Gegenstände, bester Treffer zuerst (bei Gleichstand: neuester Fund zuerst). */
export const findMatches = <T extends FoundItem>(criteria: MatchCriteria, items: readonly T[]): MatchResult<T>[] =>
  items
    .filter((item) => isCandidate(criteria, item))
    .map((item) => scoreMatch(criteria, item))
    .sort((a, b) => b.score - a.score || b.item.foundOn.localeCompare(a.item.foundOn))
