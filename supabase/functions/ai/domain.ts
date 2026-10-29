/** Feste Werte aus dem Datenbankschema (item_category, item_color) mit deutschen Bezeichnungen. */
export const CATEGORIES = {
  electronics: 'Elektronik',
  clothing: 'Kleidung',
  keys: 'Schlüssel',
  bags: 'Taschen & Rucksäcke',
  wallets: 'Portemonnaies & Ausweise',
  jewellery: 'Schmuck & Uhren',
  sports: 'Sport & Freizeit',
  other: 'Sonstiges',
} as const

export const COLORS = {
  black: 'Schwarz',
  white: 'Weiss',
  grey: 'Grau',
  blue: 'Blau',
  red: 'Rot',
  green: 'Grün',
  yellow: 'Gelb',
  brown: 'Braun',
  pink: 'Rosa',
  gold: 'Gold',
  silver: 'Silber',
  multicolor: 'Mehrfarbig',
  other: 'Andere Farbe',
} as const

export type Category = keyof typeof CATEGORIES
export type Color = keyof typeof COLORS

export const isCategory = (v: unknown): v is Category => typeof v === 'string' && v in CATEGORIES
export const isColor = (v: unknown): v is Color => typeof v === 'string' && v in COLORS

export const describeEnum = (labels: Record<string, string>): string =>
  Object.entries(labels)
    .map(([key, label]) => `${key} (${label})`)
    .join(', ')

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Gültiges Datum YYYY-MM-DD, nicht nach `maxDate`. Sonst null. */
export const cleanDate = (v: unknown, maxDate?: string): string | null => {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return null
  if (Number.isNaN(Date.parse(`${v}T00:00:00Z`))) return null
  if (maxDate && v > maxDate) return null
  return v
}

export const cleanText = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, max) : null
}
