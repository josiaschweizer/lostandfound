import { daysBetween } from './dates'
import { MATCH_WINDOW_DAYS, scoreMatch, type MatchCriteria } from './matching'
import type { FoundItem, ItemCategory, ItemColor, LossReport } from './types'

/** Alles, was für den Abgleich nötig ist – passt auf LossReport und auf die öffentliche Statusansicht. */
export type ReportLike = MatchCriteria & { id: string; lostLocation: string }

/**
 * Vorbereitung für den KI-Abgleich: Kandidaten auswählen und nur die nötigen Angaben weitergeben.
 * Anders als die feste Regel (matching.ts) darf die Kategorie abweichen – die KI erkennt z. B.,
 * dass ein «Handy» unter «Sonstiges» erfasst wurde. Zeitfenster und Organisation gelten weiterhin.
 */

/** Ab dieser KI-Einschätzung (0–100) wird ein Treffer angezeigt. */
export const AI_MATCH_THRESHOLD = 50
/** Höchstens so viele Kandidaten pro Abgleich (Kosten und Antwortzeit). */
export const AI_MAX_CANDIDATES = 20

export interface LostDescription {
  id: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  lostOn: string
  lostLocation: string
  description: string
}

export interface FoundDescription {
  id: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  foundOn: string
  foundLocation: string
  description: string
}

/** Ohne Name und Kontakt der meldenden Person. */
export const toLostDescription = (r: ReportLike): LostDescription => ({
  id: r.id,
  title: r.title,
  category: r.category,
  color: r.color,
  brand: r.brand,
  lostOn: r.lostOn,
  lostLocation: r.lostLocation,
  description: r.description,
})

/** Nur öffentliche Angaben – interne Merkmale gibt es auf FoundItem gar nicht. */
export const toFoundDescription = (i: FoundItem): FoundDescription => ({
  id: i.id,
  title: i.title,
  category: i.category,
  color: i.color,
  brand: i.brand,
  foundOn: i.foundOn,
  foundLocation: i.foundLocation,
  description: i.publicDescription,
})

const inWindow = (lostOn: string, foundOn: string) => {
  const days = daysBetween(lostOn, foundOn)
  return days >= 0 && days <= MATCH_WINDOW_DAYS
}

/** Vorsortierung: gleiche Kategorie und Regel-Punkte zuerst, dann zeitlich am nächsten. */
const rank = (report: ReportLike, item: FoundItem) =>
  (item.category === report.category ? 100 : 0) + scoreMatch(report, item).score * 10 - daysBetween(report.lostOn, item.foundOn) / 100

export const itemCandidatesForReport = <T extends FoundItem>(report: ReportLike, items: readonly T[]): T[] =>
  items
    .filter((i) => i.status !== 'returned')
    .filter((i) => !report.organisationId || i.organisationId === report.organisationId)
    .filter((i) => inWindow(report.lostOn, i.foundOn))
    .sort((a, b) => rank(report, b) - rank(report, a))
    .slice(0, AI_MAX_CANDIDATES)

export const reportCandidatesForItem = (item: FoundItem, reports: readonly LossReport[]): LossReport[] =>
  item.status === 'returned'
    ? []
    : reports
        .filter((r) => r.status === 'open')
        .filter((r) => !r.organisationId || r.organisationId === item.organisationId)
        .filter((r) => inWindow(r.lostOn, item.foundOn))
        .sort((a, b) => rank(b, item) - rank(a, item))
        .slice(0, AI_MAX_CANDIDATES)

/** Ordnet die KI-Bewertungen den Einträgen zu, filtert schwache Treffer und sortiert nach Einschätzung. */
export const pickAiMatches = <T extends { id: string }>(
  entries: readonly T[],
  ranked: readonly { id: string; score: number; reason: string }[] | undefined,
): { entry: T; score: number; reason: string }[] => {
  if (!ranked) return []
  const byId = new Map(entries.map((e) => [e.id, e]))
  return ranked
    .filter((m) => m.score >= AI_MATCH_THRESHOLD && byId.has(m.id))
    .sort((a, b) => b.score - a.score)
    .map((m) => ({ entry: byId.get(m.id)!, score: m.score, reason: m.reason }))
}

/** Höchstens so viele Gegenstände prüft die KI-Suche zusätzlich. */
export const AI_SEARCH_MAX_CANDIDATES = 40

export interface SearchCandidate {
  id: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  foundOn: string
  foundLocation: string
  description: string
  organisation: string | null
}

/** Nur öffentliche Angaben plus Name der Fundstelle. */
export const toSearchCandidate = (i: FoundItem, organisation: string | null): SearchCandidate => ({
  id: i.id,
  title: i.title,
  category: i.category,
  color: i.color,
  brand: i.brand,
  foundOn: i.foundOn,
  foundLocation: i.foundLocation,
  description: i.publicDescription,
  organisation,
})
