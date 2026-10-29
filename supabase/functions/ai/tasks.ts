/**
 * Einzelaufgaben der KI: jeweils Prompt bauen und Antwort streng prüfen.
 * Reine Funktionen – ohne Netzwerk testbar (tasks.test.ts).
 *
 * Grundregel: Interne Angaben (Erkennungsmerkmal, Lagerort, interne Notiz) werden nie
 * an die KI geschickt. Die Eingaben unten enthalten diese Felder bewusst nicht.
 */
import { CATEGORIES, COLORS, cleanDate, cleanText, describeEnum, isCategory, isColor, type Category, type Color } from './domain.ts'
import type { ChatMessage, ContentPart } from './llm.ts'

const STYLE = 'Schreibe auf Deutsch in Schweizer Rechtschreibung (ss statt ß), sachlich und freundlich.'

const block = (label: string, value: string | null | undefined) => (value ? `${label}: ${value}` : null)
const lines = (...parts: (string | null)[]) => parts.filter(Boolean).join('\n')

// -----------------------------------------------------------------------------
// Öffentliche Beschreibung für einen Fundgegenstand (nur Mitarbeitende)
// -----------------------------------------------------------------------------
export interface DescribeItemInput {
  title: string
  category: string | null
  color: string | null
  brand: string | null
  foundLocation: string | null
  /** Bisheriger Text oder Stichworte der Mitarbeitenden. */
  notes: string | null
}

export const readDescribeItemInput = (body: Record<string, unknown>): DescribeItemInput | string => {
  const title = cleanText(body.title, 120)
  if (!title) return 'Bitte zuerst einen Titel eingeben.'
  return {
    title,
    category: isCategory(body.category) ? CATEGORIES[body.category] : null,
    color: isColor(body.color) ? COLORS[body.color] : null,
    brand: cleanText(body.brand, 80),
    foundLocation: cleanText(body.foundLocation, 200),
    notes: cleanText(body.notes, 1000),
  }
}

export const describeItemMessages = (input: DescribeItemInput): ChatMessage[] => [
  {
    role: 'system',
    content: lines(
      'Du schreibst öffentliche Beschreibungen für einen Online-Fundkatalog.',
      STYLE,
      'Regeln:',
      '- 1 bis 2 kurze Sätze, höchstens 300 Zeichen, kein Titel, keine Aufzählung, keine Anführungszeichen.',
      '- Beschreibe nur allgemein sichtbare Eigenschaften (Art, Farbe, Material, Grösse, Zustand).',
      '- Nenne NIE Merkmale, mit denen jemand das Eigentum beweisen könnte: keine Namen, Gravuren, Aufkleber, Inhalte, Seriennummern, Codes, Hintergrundbilder oder Beschädigungen an bestimmten Stellen. Kommen solche in den Stichworten vor, lass sie weg.',
      '- Erfinde keine Details, die nicht in den Angaben stehen.',
      '- Antworte nur mit dem Beschreibungstext.',
    ),
  },
  {
    role: 'user',
    content: lines(
      block('Titel', input.title),
      block('Kategorie', input.category),
      block('Farbe', input.color),
      block('Marke', input.brand),
      block('Fundort', input.foundLocation),
      block('Stichworte / bisheriger Text', input.notes),
    ),
  },
]

// -----------------------------------------------------------------------------
// Text für Abholhinweise oder Ablehnung einer Rückgabeanfrage (nur Mitarbeitende)
// -----------------------------------------------------------------------------
export interface DraftMessageInput {
  kind: 'confirm' | 'reject'
  itemTitle: string
  itemNumber: string | null
  officeName: string | null
  officeLocation: string | null
  openingHours: string | null
  pickupNotes: string | null
  /** Stichworte der Mitarbeitenden, z. B. «Ausweis mitbringen» oder Ablehnungsgrund. */
  notes: string | null
}

export const readDraftMessageInput = (body: Record<string, unknown>): DraftMessageInput | string => {
  const kind = body.kind === 'confirm' || body.kind === 'reject' ? body.kind : null
  const itemTitle = cleanText(body.itemTitle, 120)
  if (!kind || !itemTitle) return 'Angaben zur Anfrage fehlen.'
  // Bewusst ohne Namen und Kontakt der anfragenden Person – die KI braucht sie nicht.
  return {
    kind,
    itemTitle,
    itemNumber: cleanText(body.itemNumber, 40),
    officeName: cleanText(body.officeName, 120),
    officeLocation: cleanText(body.officeLocation, 200),
    openingHours: cleanText(body.openingHours, 200),
    pickupNotes: cleanText(body.pickupNotes, 500),
    notes: cleanText(body.notes, 1000),
  }
}

export const draftMessageMessages = (input: DraftMessageInput): ChatMessage[] => [
  {
    role: 'system',
    content: lines(
      'Du formulierst kurze Mitteilungen einer Fundstelle an eine Person, die einen Gegenstand zurückhaben möchte.',
      STYLE,
      'Sprich die Person mit «Sie» an. Keine Anrede-Zeile und keine Grussformel – der Text wird in eine bestehende E-Mail eingefügt.',
      input.kind === 'confirm'
        ? 'Aufgabe: Abholhinweise. Bestätige, dass der Gegenstand reserviert ist, und erkläre klar, wo und wann er abgeholt werden kann und was mitzubringen ist. Höchstens 4 Sätze.'
        : 'Aufgabe: Begründung einer Ablehnung. Erkläre höflich, dass die Angaben nicht ausreichen bzw. nicht passen, ohne Details zum Gegenstand oder zu seinen Merkmalen zu verraten. Biete an, sich bei weiteren Hinweisen erneut zu melden. Höchstens 3 Sätze.',
      'Verwende nur Angaben, die unten stehen. Erfinde keine Öffnungszeiten, Orte oder Bedingungen.',
      'Antworte nur mit dem Text.',
    ),
  },
  {
    role: 'user',
    content: lines(
      block('Gegenstand', input.itemNumber ? `${input.itemTitle} (${input.itemNumber})` : input.itemTitle),
      block('Fundstelle', input.officeName),
      block('Ort', input.officeLocation),
      block('Öffnungszeiten', input.openingHours),
      block('Allgemeine Abholhinweise der Fundstelle', input.pickupNotes),
      block('Stichworte der Mitarbeitenden', input.notes),
    ),
  },
]

// -----------------------------------------------------------------------------
// Verlustmeldung aus Freitext vorausfüllen (öffentlich)
// -----------------------------------------------------------------------------
export interface LossReportDraft {
  title: string | null
  category: Category | null
  color: Color | null
  brand: string | null
  lostOn: string | null
  lostLocation: string | null
  description: string | null
}

export const lossReportMessages = (text: string, today: string): ChatMessage[] => [
  {
    role: 'system',
    content: lines(
      'Du hilfst, ein Formular für eine Verlustmeldung auszufüllen. Lies die Beschreibung der Person und gib ein JSON-Objekt zurück.',
      `Heute ist ${today}. Rechne relative Angaben («gestern», «letzten Dienstag») in ein Datum YYYY-MM-DD um. Das Datum darf nicht nach heute liegen.`,
      'Felder (unbekannt → null, nichts erfinden):',
      '- title: kurze allgemeine Bezeichnung auf Deutsch, z. B. «Blaue Regenjacke» (max. 80 Zeichen)',
      `- category: genau einer dieser Werte: ${describeEnum(CATEGORIES)}`,
      `- color: genau einer dieser Werte: ${describeEnum(COLORS)}`,
      '- brand: Marke oder null',
      '- lostOn: Datum YYYY-MM-DD oder null',
      '- lostLocation: Ort des Verlusts oder null',
      '- description: allgemeine Beschreibung in 1–2 Sätzen. Lass ganz persönliche Merkmale (Namen, Gravuren, Inhalte, Codes) weg – diese gibt die Person erst bei einer Rückgabeanfrage an.',
      'Antworte ausschliesslich mit dem JSON-Objekt.',
    ),
  },
  { role: 'user', content: text },
]

export const cleanLossReport = (raw: Record<string, unknown>, today: string): LossReportDraft => ({
  title: cleanText(raw.title, 120),
  category: isCategory(raw.category) ? raw.category : null,
  color: isColor(raw.color) ? raw.color : null,
  brand: cleanText(raw.brand, 80),
  lostOn: cleanDate(raw.lostOn, today),
  lostLocation: cleanText(raw.lostLocation, 200),
  description: cleanText(raw.description, 1000),
})

// -----------------------------------------------------------------------------
// Suche in natürlicher Sprache → Katalogfilter (öffentlich)
// -----------------------------------------------------------------------------
export interface OrganisationRef {
  id: string
  name: string
  address?: string
}

export interface SearchFilters {
  query: string
  category: Category | ''
  color: Color | ''
  organisationId: string
  foundFrom: string
  foundTo: string
}

export const searchMessages = (text: string, today: string, organisations: OrganisationRef[]): ChatMessage[] => [
  {
    role: 'system',
    content: lines(
      'Du übersetzt eine Suchanfrage für einen Fundkatalog in Filter. Gib ein JSON-Objekt zurück.',
      `Heute ist ${today}.`,
      'Felder (nicht erkennbar → leerer String ""):',
      '- query: höchstens EIN Suchwort, das wahrscheinlich im Titel steht (z. B. «Rucksack», «AirPods»). Leer lassen, wenn die Kategorie schon reicht oder das Wort ein Oberbegriff ist (z. B. «Handy» → category electronics, query "").',
      `- category: ${describeEnum(CATEGORIES)}`,
      `- color: ${describeEnum(COLORS)}`,
      '- organisationId: id der passenden Organisation aus der Liste, nur wenn der Ort eindeutig dazu passt',
      '- foundFrom: YYYY-MM-DD. Wenn die Person sagt, wann sie es verloren hat, nimm dieses Datum (Funde liegen danach).',
      '- foundTo: YYYY-MM-DD, meist leer',
      'Organisationen:',
      ...organisations.map((o) => `- id ${o.id}: ${o.name}${o.address ? `, ${o.address}` : ''}`),
      'Antworte ausschliesslich mit dem JSON-Objekt.',
    ),
  },
  { role: 'user', content: text },
]

export const cleanSearch = (raw: Record<string, unknown>, today: string, organisations: OrganisationRef[]): SearchFilters => {
  const query = (cleanText(raw.query, 40) ?? '').split(' ')[0] ?? ''
  const foundFrom = cleanDate(raw.foundFrom, today) ?? ''
  const foundTo = cleanDate(raw.foundTo, today) ?? ''
  return {
    query,
    category: isCategory(raw.category) ? raw.category : '',
    color: isColor(raw.color) ? raw.color : '',
    organisationId: organisations.some((o) => o.id === raw.organisationId) ? String(raw.organisationId) : '',
    foundFrom,
    foundTo: foundTo && foundFrom && foundTo < foundFrom ? '' : foundTo,
  }
}

// -----------------------------------------------------------------------------
// KI-Abgleich Verlustmeldung ↔ Fundgegenstand (öffentlich und Mitarbeitende)
// Eine Seite enthält genau einen Eintrag (Anker), die andere bis zu 20 Kandidaten.
// Personendaten (Name, Kontakt) und interne Merkmale werden nie übergeben.
// -----------------------------------------------------------------------------
export const MAX_MATCH_CANDIDATES = 20

export interface MatchDescription {
  id: string
  title: string
  category: Category
  color: Color
  brand: string | null
  /** Verlust- bzw. Funddatum */
  date: string
  location: string | null
  description: string | null
}

export interface MatchInput {
  anchor: 'lost' | 'found'
  lost: MatchDescription[]
  found: MatchDescription[]
}

export interface RankedMatch {
  id: string
  score: number
  reason: string
}

const readDescription = (raw: unknown, dateKey: 'lostOn' | 'foundOn', locationKey: 'lostLocation' | 'foundLocation'): MatchDescription | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = cleanText(r.id, 64)
  const title = cleanText(r.title, 120)
  const date = cleanDate(r[dateKey])
  if (!id || !title || !date || !isCategory(r.category) || !isColor(r.color)) return null
  return {
    id,
    title,
    category: r.category,
    color: r.color,
    brand: cleanText(r.brand, 80),
    date,
    location: cleanText(r[locationKey], 200),
    description: cleanText(r.description, 500),
  }
}

export const readMatchInput = (body: Record<string, unknown>): MatchInput | string => {
  const lostRaw = Array.isArray(body.lost) ? body.lost : []
  const foundRaw = Array.isArray(body.found) ? body.found : []
  const lost = lostRaw.slice(0, MAX_MATCH_CANDIDATES).map((r) => readDescription(r, 'lostOn', 'lostLocation'))
  const found = foundRaw.slice(0, MAX_MATCH_CANDIDATES).map((r) => readDescription(r, 'foundOn', 'foundLocation'))
  if (lost.some((x) => !x) || found.some((x) => !x)) return 'Ungültige Angaben für den Abgleich.'
  if (lost.length === 1 && found.length >= 1) return { anchor: 'lost', lost: lost as MatchDescription[], found: found as MatchDescription[] }
  if (found.length === 1 && lost.length >= 1) return { anchor: 'found', lost: lost as MatchDescription[], found: found as MatchDescription[] }
  return 'Für den Abgleich braucht es einen Eintrag und mindestens einen Kandidaten.'
}

const describeEntry = (d: MatchDescription, kind: 'lost' | 'found') =>
  [
    d.title,
    `Kategorie ${CATEGORIES[d.category]}`,
    `Farbe ${COLORS[d.color]}`,
    d.brand ? `Marke ${d.brand}` : null,
    `${kind === 'lost' ? 'verloren am' : 'gefunden am'} ${d.date}`,
    d.location ? `${kind === 'lost' ? 'Verlustort' : 'Fundort'} ${d.location}` : null,
    d.description ? `Beschreibung: ${d.description}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

/** Kandidaten erhalten kurze Schlüssel (K1, K2 …) – so kann die KI keine IDs erfinden. */
export const matchKeys = (input: MatchInput) => (input.anchor === 'lost' ? input.found : input.lost).map((d, i) => ({ key: `K${i + 1}`, id: d.id }))

export const matchMessages = (input: MatchInput): ChatMessage[] => {
  const anchorKind = input.anchor
  const candidateKind = anchorKind === 'lost' ? 'found' : 'lost'
  const anchor = anchorKind === 'lost' ? input.lost[0]! : input.found[0]!
  const candidates = anchorKind === 'lost' ? input.found : input.lost
  return [
    {
      role: 'system',
      content: lines(
        'Du vergleichst Verlustmeldungen mit Fundgegenständen für eine Fundbüro-Plattform.',
        'Schätze für jeden Kandidaten ein, wie wahrscheinlich es sich um DENSELBEN Gegenstand handelt.',
        'Berücksichtige:',
        '- Bedeutung statt Wortgleichheit (Handy = Smartphone = iPhone, Rucksack ≈ Tasche, Portemonnaie = Geldbeutel).',
        '- Marke und Modell sind starke Hinweise; widersprüchliche Marken sprechen klar dagegen.',
        '- Farben können ungenau angegeben sein (dunkelblau ≈ blau, grau ≈ silber, schwarz ≈ dunkelgrau).',
        '- Kategorie kann falsch gewählt sein – entscheidend ist, was der Gegenstand ist.',
        '- Ort: gleiche oder benachbarte Orte erhöhen die Wahrscheinlichkeit.',
        '- Zeit: Der Fund muss am oder nach dem Verlusttag liegen; je näher, desto besser.',
        'Skala score 0–100: 85+ sehr wahrscheinlich, 60–84 gut möglich, 30–59 eher unwahrscheinlich, unter 30 passt nicht.',
        'reason: ein kurzer deutscher Satz (max. 100 Zeichen, Schweizer Rechtschreibung), der die wichtigsten Gründe nennt.',
        'Antworte ausschliesslich mit JSON im Format {"matches":[{"key":"K1","score":72,"reason":"…"}]} und bewerte jeden Kandidaten genau einmal.',
      ),
    },
    {
      role: 'user',
      content: lines(
        anchorKind === 'lost' ? 'VERLUSTMELDUNG:' : 'FUNDGEGENSTAND:',
        describeEntry(anchor, anchorKind),
        '',
        candidateKind === 'found' ? 'KANDIDATEN (Fundgegenstände):' : 'KANDIDATEN (Verlustmeldungen):',
        ...candidates.map((c, i) => `K${i + 1}: ${describeEntry(c, candidateKind)}`),
      ),
    },
  ]
}

export const cleanMatches = (raw: Record<string, unknown>, input: MatchInput): RankedMatch[] => {
  const keys = new Map(matchKeys(input).map((k) => [k.key, k.id]))
  const list = Array.isArray(raw.matches) ? raw.matches : []
  const seen = new Set<string>()
  const result: RankedMatch[] = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    const id = keys.get(String(e.key ?? '').trim().toUpperCase())
    const score = Number(e.score)
    if (!id || seen.has(id) || !Number.isFinite(score)) continue
    seen.add(id)
    result.push({ id, score: Math.max(0, Math.min(100, Math.round(score))), reason: cleanText(e.reason, 160) ?? '' })
  }
  return result.sort((a, b) => b.score - a.score)
}

// -----------------------------------------------------------------------------
// Foto eines Fundgegenstands auswerten (nur Mitarbeitende)
// -----------------------------------------------------------------------------
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/
const MAX_IMAGE_CHARS = 3_000_000

export const readPhoto = (body: Record<string, unknown>): string | { error: string } => {
  const image = body.image
  if (typeof image !== 'string' || !DATA_URL.test(image)) return { error: 'Bitte ein Foto (JPEG, PNG oder WebP) wählen.' }
  if (image.length > MAX_IMAGE_CHARS) return { error: 'Das Foto ist zu gross.' }
  return image
}

export interface PhotoAnalysis {
  title: string | null
  category: Category | null
  color: Color | null
  brand: string | null
  description: string | null
  /** Hinweise auf sichtbare persönliche Angaben (Namen, Adressen, Ausweise …). */
  warnings: string[]
}

export const photoMessages = (image: string): ChatMessage[] => {
  const parts: ContentPart[] = [
    { type: 'text', text: 'Werte dieses Foto eines Fundgegenstands aus.' },
    { type: 'image_url', image_url: { url: image, detail: 'low' } },
  ]
  return [
    {
      role: 'system',
      content: lines(
        'Du hilfst einer Fundstelle, einen gefundenen Gegenstand anhand eines Fotos zu erfassen. Gib ein JSON-Objekt zurück.',
        'Felder (nicht erkennbar → null):',
        '- title: kurze allgemeine Bezeichnung auf Deutsch, z. B. «Schwarzer Rucksack» (max. 60 Zeichen)',
        `- category: genau einer dieser Werte: ${describeEnum(CATEGORIES)}`,
        `- color: Hauptfarbe, genau einer dieser Werte: ${describeEnum(COLORS)}`,
        '- brand: Marke, nur wenn eindeutig erkennbar (Logo/Schriftzug)',
        '- description: 1–2 Sätze mit allgemein sichtbaren Eigenschaften (Art, Material, Grösse, Zustand). Schweizer Rechtschreibung (ss statt ß).',
        '- warnings: Liste kurzer deutscher Hinweise, falls auf dem Foto persönliche oder eigentumsbeweisende Details sichtbar sind (Namen, Adressen, Ausweise, Karten, Gesichter, Bildschirminhalte, Gravuren, Seriennummern). Sonst leere Liste.',
        'Nenne solche Details NIE in title oder description.',
        'Antworte ausschliesslich mit dem JSON-Objekt.',
      ),
    },
    { role: 'user', content: parts },
  ]
}

export const cleanPhotoAnalysis = (raw: Record<string, unknown>): PhotoAnalysis => ({
  title: cleanText(raw.title, 120),
  category: isCategory(raw.category) ? raw.category : null,
  color: isColor(raw.color) ? raw.color : null,
  brand: cleanText(raw.brand, 80),
  description: cleanText(raw.description, 500),
  warnings: (Array.isArray(raw.warnings) ? raw.warnings : [])
    .map((w) => cleanText(w, 160))
    .filter((w): w is string => Boolean(w))
    .slice(0, 3),
})
