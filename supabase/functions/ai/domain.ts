/** Feste Werte aus dem Datenbankschema (item_category, item_color) – gleich wie src/domain/types.ts. */
export const CATEGORIES = {
  electronics: 'Elektronik',
  clothing: 'Kleidung',
  keys: 'Schlüssel',
  bags: 'Taschen & Rucksäcke',
  wallets: 'Portemonnaies',
  id_cards: 'Ausweise & Karten',
  jewellery: 'Schmuck & Uhren',
  sports: 'Sport & Freizeit',
  other: 'Sonstiges',
} as const

export const COLORS = {
  black: 'Schwarz',
  grey: 'Grau',
  white: 'Weiss',
  beige: 'Beige',
  brown: 'Braun',
  red: 'Rot',
  pink: 'Rosa',
  orange: 'Orange',
  yellow: 'Gelb',
  green: 'Grün',
  turquoise: 'Türkis',
  blue: 'Blau',
  violet: 'Violett',
  silver: 'Silber',
  gold: 'Gold',
  multicolor: 'Mehrfarbig',
} as const

export type Category = keyof typeof CATEGORIES
export type Color = keyof typeof COLORS

export const isCategory = (v: unknown): v is Category => typeof v === 'string' && Object.hasOwn(CATEGORIES, v)
export const isColor = (v: unknown): v is Color => typeof v === 'string' && Object.hasOwn(COLORS, v)

export const describeEnum = (labels: Record<string, string>): string =>
  Object.entries(labels)
    .map(([key, label]) => `${key} (${label})`)
    .join(', ')

/** Heutiges Datum in Zürich als YYYY-MM-DD. */
export const todayInZurich = (now = new Date()): string => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(now)

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Gültiges Datum YYYY-MM-DD, nicht nach `maxDate`. Sonst null. */
export const cleanDate = (v: unknown, maxDate?: string): string | null => {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  if (maxDate && v > maxDate) return null
  return v
}

/** Entfernt E-Mail-Adressen, Telefonnummern und IBAN-ähnliche Muster (KONZEPT 7.6). */
export const redact = (text: string): string =>
  text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[E-Mail entfernt]')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g, '[IBAN entfernt]')
    .replace(/(?:\+|00)\d{1,3}[\s./-]?\(?\d{1,4}\)?(?:[\s./-]?\d{2,4}){2,4}/g, '[Telefon entfernt]')
    .replace(/\b0\d{2}[\s./-]?\d{3}[\s./-]?\d{2}[\s./-]?\d{2}\b/g, '[Telefon entfernt]')

/** Kürzt, glättet Leerraum und ersetzt «ß» (Schweizer Schreibweise). */
export const cleanText = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = redact(v).replace(/ß/g, 'ss').trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, max) : null
}
