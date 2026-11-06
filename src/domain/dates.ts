/** Datumshilfen für ISO-Daten (YYYY-MM-DD), immer in Schweizer Zeit gerechnet. */
const MS_PER_DAY = 86_400_000

const toUtcDay = (isoDate: string): number => {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

const fromUtcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** Heute in der Schweiz als YYYY-MM-DD (unabhängig von der Zeitzone des Geräts). */
export const todayIso = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(now)

export const addDays = (isoDate: string, days: number): string => fromUtcDay(toUtcDay(isoDate) + days * MS_PER_DAY)

/** Tage von `from` bis `to` (positiv, wenn `to` später liegt). */
export const daysBetween = (from: string, to: string): number => Math.round((toUtcDay(to) - toUtcDay(from)) / MS_PER_DAY)

/** Montag der Woche, in der `isoDate` liegt. */
export const startOfWeek = (isoDate: string): string => {
  const weekday = (new Date(toUtcDay(isoDate)).getUTCDay() + 6) % 7
  return addDays(isoDate, -weekday)
}

export const formatDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(toUtcDay(isoDate)))

export const formatShortDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(toUtcDay(isoDate)))

export const formatDateTime = (isoDateTime: string): string =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Zurich' }).format(new Date(isoDateTime))
