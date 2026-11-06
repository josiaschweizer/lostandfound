/**
 * Deterministischer Mock-Anbieter (AI_PROVIDER=mock): für Tests, E2E und als Notfall-Demo ohne
 * API-Schlüssel. Er «versteht» nur einfache Muster (Gegenstände, Farben, Orte, relative Daten),
 * antwortet aber im gleichen JSON-Format wie ein echtes Modell.
 */
import { addDays } from '../domain.ts'
import type { CompleteRequest, CompleteResult, Provider } from './types.ts'

const ITEMS: [RegExp, string, string][] = [
  [/\bair\s?pods?\b/, 'AirPods', 'electronics'],
  [/\b(ohrhörer|earbuds|in-ears?)\b/, 'Ohrhörer', 'electronics'],
  [/\b(kopfhörer|headset)\b/, 'Kopfhörer', 'electronics'],
  [/\biphone\b/, 'iPhone', 'electronics'],
  [/\b(handy|smartphone|telefon)\b/, 'Smartphone', 'electronics'],
  [/\b(laptop|notebook)\b/, 'Laptop', 'electronics'],
  [/\b(ladegerät|ladekabel|netzteil)\b/, 'Ladegerät', 'electronics'],
  [/\btaschenrechner\b/, 'Taschenrechner', 'electronics'],
  [/\bschlüssel(bund)?\b/, 'Schlüsselbund', 'keys'],
  [/\b(portemonnaie|portmonee|geldbeutel|brieftasche|börse)\b/, 'Portemonnaie', 'wallets'],
  [/\b(ausweis|identitätskarte|id|halbtax|ga|abo|studentenausweis|schülerausweis)\b/, 'Ausweis', 'id_cards'],
  [/\bturnbeutel\b/, 'Turnbeutel', 'bags'],
  [/\brucksack\b/, 'Rucksack', 'bags'],
  [/\b(tasche|handtasche|sporttasche)\b/, 'Tasche', 'bags'],
  [/\bwinterjacke\b/, 'Winterjacke', 'clothing'],
  [/\bregenjacke\b/, 'Regenjacke', 'clothing'],
  [/\b(jacke|mantel|windjacke)\b/, 'Jacke', 'clothing'],
  [/\b(pulli|pullover|hoodie|sweatshirt)\b/, 'Pullover', 'clothing'],
  [/\b(mütze|kappe|beanie|cap)\b/, 'Mütze', 'clothing'],
  [/\b(schal|halstuch)\b/, 'Schal', 'clothing'],
  [/\bhandschuhe?\b/, 'Handschuhe', 'clothing'],
  [/\b(armbanduhr|uhr|smartwatch)\b/, 'Uhr', 'jewellery'],
  [/\b(ring|halskette|kette|ohrringe?|armband)\b/, 'Schmuck', 'jewellery'],
  [/\b(velohelm|helm)\b/, 'Velohelm', 'sports'],
  [/\b(ball|fussball|skateboard|trottinett)\b/, 'Sportartikel', 'sports'],
  [/\b(sonnenbrille)\b/, 'Sonnenbrille', 'other'],
  [/\b(brille|lesebrille)\b/, 'Brille', 'other'],
  [/\b(trinkflasche|wasserflasche|flasche)\b/, 'Trinkflasche', 'other'],
  [/\b(regenschirm|schirm)\b/, 'Regenschirm', 'other'],
  [/\b(etui|federmäppchen|mäppchen)\b/, 'Etui', 'other'],
]

const COLOR_WORDS: [RegExp, string][] = [
  [/\bschwarz/, 'black'],
  [/\bgrau/, 'grey'],
  [/\bwei(ss|ß)/, 'white'],
  [/\bbeige/, 'beige'],
  [/\bbraun/, 'brown'],
  [/\brot(e[nmrs]?)?\b/, 'red'],
  [/\b(rosa|pink)/, 'pink'],
  [/\borange/, 'orange'],
  [/\bgelb/, 'yellow'],
  [/\bgr(ü|ue)n/, 'green'],
  [/\btürkis/, 'turquoise'],
  [/\b(dunkel|hell)?blau/, 'blue'],
  [/\b(violett|lila)/, 'violet'],
  [/\bsilber/, 'silver'],
  [/\bgold/, 'gold'],
  [/\b(bunt|mehrfarbig)/, 'multicolor'],
]

const BRANDS = [
  'Apple', 'Samsung', 'Sony', 'Bose', 'JBL', 'Nike', 'Adidas', 'Puma', 'Deuter', 'Fjällräven', 'Herschel', 'Eastpak',
  'The North Face', 'Jack Wolfskin', 'Mammut', 'Lenovo', 'HP', 'Dell', 'Garmin', 'Swatch', 'Casio', 'Ray-Ban', 'Victorinox', 'Freitag',
]

const PLACE_STOP = new Set(['verloren', 'liegen', 'gelassen', 'vergessen', 'gefunden', 'abgegeben', 'gestern', 'heute', 'vorgestern', 'wochenende'])
const WEEKDAYS = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag']

const capitalize = (s: string) => s.replace(/(^|\s)(\p{L})/gu, (_, sp: string, c: string) => sp + c.toUpperCase())

const resolveDates = (text: string, today: string): { from: string | null; to: string | null } => {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  if (/\bvorgestern\b/.test(text)) return { from: addDays(today, -2), to: addDays(today, -2) }
  if (/\bgestern\b/.test(text)) return { from: addDays(today, -1), to: addDays(today, -1) }
  if (/\bheute\b/.test(text)) return { from: today, to: today }
  const ago = text.match(/\bvor (\d{1,2}|zwei|drei|vier|fünf) tagen\b/)
  if (ago?.[1]) {
    const n = Number(ago[1]) || { zwei: 2, drei: 3, vier: 4, fünf: 5 }[ago[1]] || 1
    return { from: addDays(today, -n), to: addDays(today, -n) }
  }
  if (/\bletzte[nm]? woche\b/.test(text)) {
    const monday = addDays(today, -((weekday + 6) % 7) - 7)
    return { from: monday, to: addDays(monday, 6) }
  }
  if (/\bwochenende\b/.test(text)) {
    const sunday = addDays(today, weekday === 0 ? -7 : -weekday)
    return { from: addDays(sunday, -1), to: sunday }
  }
  for (const [index, name] of WEEKDAYS.entries()) {
    if (new RegExp(`\\b(am |letzten )?${name}\\b`).test(text)) {
      const back = (weekday - index + 7) % 7 || 7
      return { from: addDays(today, -back), to: addDays(today, -back) }
    }
  }
  return { from: null, to: null }
}

/** Liest den abgegrenzten Personen-Text und das heutige Datum aus dem User-Teil. */
export const parseUserBlock = (user: string): { text: string; today: string } => ({
  text: user.match(/<<<\n?([\s\S]*?)\n?>>>/)?.[1] ?? '',
  today: user.match(/Heute: (\d{4}-\d{2}-\d{2})/)?.[1] ?? new Date().toISOString().slice(0, 10),
})

export const mockExtract = (raw: string, today: string): Record<string, unknown> => {
  const text = raw.toLowerCase()
  const item = ITEMS.find(([re]) => re.test(text))
  const colors = COLOR_WORDS.filter(([re]) => re.test(text)).map(([, c]) => c).slice(0, 3)
  let brand = BRANDS.find((b) => new RegExp(`\\b${b.toLowerCase().replace(/[-]/g, '\\-')}\\b`).test(text)) ?? null
  if (!brand && item?.[1] && /airpods|iphone/i.test(item[1])) brand = 'Apple'

  const place = [...text.matchAll(/\b(?:im|in der|in dem|beim|bei der|am|an der|auf dem|auf der|in)\s+([\p{L}][\p{L}-]*)(?:\s+(?:linie\s+)?(\d{1,3}))?/gu)].find(
    (m) => !PLACE_STOP.has(m[1] ?? '') && !WEEKDAYS.includes(m[1] ?? ''),
  )
  const placeText = place ? capitalize([place[1], place[2]].filter(Boolean).join(' ')) : null

  const feature = raw.match(/\bmit ([^.,;!?]{3,80})/i)?.[1]?.trim() ?? null
  const { from, to } = resolveDates(text, today)
  const unsure = /\b(glaube|vielleicht|ungefähr|irgendwo|weiss nicht|nicht sicher)\b/.test(text)

  return {
    titel: item?.[1] ?? null,
    kategorie: item?.[2] ?? null,
    farben: colors,
    marke: brand,
    beschreibung: feature ? `Mit ${feature}` : null,
    ort: placeText,
    datum_von: from,
    datum_bis: to,
    unsicher: unsure ? ['ort', ...(from ? ['datum_von'] : [])] : [],
  }
}

export const createMockProvider = (): Provider => ({
  name: 'mock',
  complete(req: CompleteRequest): Promise<CompleteResult> {
    const { text, today } = parseUserBlock(req.user)
    const body = req.action === 'extract_fields' ? mockExtract(text, today) : {}
    return Promise.resolve({ text: JSON.stringify(body), usage: { input: 0, output: 0 } })
  },
})
