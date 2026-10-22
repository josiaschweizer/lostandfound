/** Datumshilfen für ISO-Daten im Format YYYY-MM-DD (ohne Zeitzonenfehler). */

const MS_PER_DAY = 24 * 60 * 60 * 1000

const toUtcDay = (isoDate: string): number => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Anzahl Tage von `from` bis `to` (positiv, wenn `to` später liegt). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY)

export const todayIso = (now: Date = new Date()): string => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const formatDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(toUtcDay(isoDate)),
  )

export const formatDateTime = (isoDateTime: string): string =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoDateTime))

/** «Heute», «Gestern», «Vor 5 Tagen», ab 2 Wochen das Datum. */
export const formatRelativeDay = (isoDate: string, today: string = todayIso()): string => {
  const days = daysBetween(isoDate, today)
  if (days <= 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 14) return `Vor ${days} Tagen`
  return formatDate(isoDate)
}
