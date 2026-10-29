/**
 * Öffentlicher Chat-Assistent. Die KI greift über zwei Werkzeuge (Tool Calling) auf
 * echte, öffentliche Daten zu – sie kann nichts verändern und sieht keine internen Angaben.
 */
import { CATEGORIES, COLORS, cleanDate, cleanText, describeEnum, isCategory, isColor } from './domain.ts'
import { complete, type ChatMessage, type LlmConfig, type ToolCall, type ToolDefinition } from './llm.ts'

/** Öffentliche Angaben eines Fundgegenstands (gleiche Spalten wie PUBLIC_ITEM_COLUMNS im Frontend). */
export interface PublicItem {
  id: string
  organisation_id: string
  item_number: string
  title: string
  category: string
  color: string
  brand: string | null
  found_on: string
  found_location: string
  public_description: string
  photo_path: string | null
  status: string
}

export interface PublicOrganisation {
  id: string
  slug: string
  name: string
  address: string
  office: { location: string; opening_hours: string; contact_email: string; pickup_notes: string | null } | null
}

export interface CatalogSource {
  listItems: () => Promise<PublicItem[]>
  listOrganisations: () => Promise<PublicOrganisation[]>
}

export interface ChatItem {
  id: string
  itemNumber: string
  title: string
  category: string
  color: string
  foundOn: string
  foundLocation: string
  organisationName: string | null
  photoPath: string | null
  status: string
}

export interface ChatResult {
  reply: string
  items: ChatItem[]
}

export interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_HISTORY = 16
/** Höchstens 3 Werkzeugrunden + 1 Antwort, je max. 25 s – bleibt sicher unter dem Zeitlimit der Function. */
const MAX_TOOL_ROUNDS = 3
const CALL_TIMEOUT_MS = 25_000
const MAX_RESULTS = 6

export const readMessages = (value: unknown): IncomingMessage[] | string => {
  if (!Array.isArray(value) || value.length === 0) return 'Keine Nachricht erhalten.'
  const messages = value
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m?.content === 'string' ? m.content.trim().slice(0, 2000) : '',
    }))
    .filter((m) => m.content)
  if (messages.at(-1)?.role !== 'user') return 'Die letzte Nachricht muss von der Person stammen.'
  return messages
}

export const chatSystemPrompt = (today: string) =>
  [
    'Du bist der Assistent von «lostandfound», einer Plattform, auf der Schulen, Fundbüros und Firmen gefundene Gegenstände veröffentlichen.',
    'Du hilfst Personen, ihren verlorenen Gegenstand zu finden und erklärst die nächsten Schritte.',
    `Heute ist ${today}. Antworte auf Deutsch (Schweizer Rechtschreibung, ss statt ß), freundlich und kurz – meist 1 bis 4 Sätze. Kein Markdown, keine Links, keine Tabellen.`,
    '',
    'Vorgehen:',
    '- Sobald klar ist, was gesucht wird, rufe search_found_items auf. Frage höchstens einmal nach (z. B. Farbe oder Ort), wenn die Angaben sehr ungenau sind.',
    '- Findest du nichts, suche ein zweites Mal breiter (nur Kategorie, ohne Suchwort oder Farbe).',
    '- Treffer werden der Person automatisch als Karten unter deiner Antwort angezeigt. Nenne sie kurz mit Titel und Fundstelle, ohne alle Details zu wiederholen.',
    '- Für Öffnungszeiten, Adressen und Kontakt einer Fundstelle rufe list_organisations auf.',
    '',
    'Abläufe der Plattform:',
    '- Rückgabe: Auf der Detailseite des Gegenstands «Rückgabe anfragen» wählen und ein besonderes Merkmal als Eigentumsnachweis angeben. Die Fundstelle prüft und meldet sich.',
    '- Nichts gefunden: Unter «Verlust melden» eine Verlustmeldung erfassen. Die Fundstellen sehen sie und melden sich bei einem passenden Fund.',
    '- Den Status einer Anfrage oder Meldung findet man über den Link in der Bestätigung.',
    '',
    'Regeln:',
    '- Verwende nur Angaben aus den Werkzeugen. Erfinde keine Gegenstände, Orte, Öffnungszeiten oder Abläufe.',
    '- Sage nie, dass ein Gegenstand sicher der Person gehört – das entscheidet die Fundstelle.',
    '- Frage nicht nach Namen, Kontaktdaten oder Eigentumsmerkmalen. Sagt die Person ein solches Merkmal, rate ihr, es erst in der Rückgabeanfrage anzugeben.',
    '- Du kannst keine Anfragen senden, nichts reservieren und nichts ändern.',
    '- Bei Fragen ohne Bezug zu Fundsachen antworte kurz, dass du nur dabei hilfst.',
  ].join('\n')

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_found_items',
      description: 'Durchsucht den öffentlichen Fundkatalog aller Fundstellen. Liefert höchstens 6 Treffer, neueste zuerst.',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Ein bis drei Suchwörter, z. B. "Rucksack" oder "Kopfhörer Sony". Leer für alle.' },
          category: { type: 'string', enum: Object.keys(CATEGORIES), description: describeEnum(CATEGORIES) },
          color: { type: 'string', enum: Object.keys(COLORS), description: describeEnum(COLORS) },
          organisation_id: { type: 'string', description: 'Nur Funde dieser Organisation (id aus list_organisations).' },
          found_from: { type: 'string', description: 'Gefunden am oder nach diesem Datum, YYYY-MM-DD (z. B. Verlustdatum).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_organisations',
      description: 'Listet alle Organisationen mit ihrer Fundstelle: Ort, Öffnungszeiten, Kontakt, Abholhinweise.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const STOP = new Set(['und', 'oder', 'mit', 'der', 'die', 'das', 'ein', 'eine', 'mein', 'meine', 'von'])

/** Grosszügige Suche: jedes Suchwort zählt, mehr Treffer = weiter oben. */
export const searchItems = (items: PublicItem[], args: Record<string, unknown>, orgNames: Map<string, string>): PublicItem[] => {
  const terms = normalize(cleanText(args.keywords, 100) ?? '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOP.has(t))
  const category = isCategory(args.category) ? args.category : null
  const color = isColor(args.color) ? args.color : null
  const orgId = typeof args.organisation_id === 'string' ? args.organisation_id : null
  const from = cleanDate(args.found_from)

  return items
    .filter((i) => i.status !== 'returned')
    .filter((i) => !category || i.category === category)
    .filter((i) => !color || i.color === color)
    .filter((i) => !orgId || i.organisation_id === orgId)
    .filter((i) => !from || i.found_on >= from)
    .map((item) => {
      const haystack = normalize(
        [item.title, item.brand ?? '', item.public_description, item.found_location, orgNames.get(item.organisation_id) ?? ''].join(' '),
      )
      return { item, hits: terms.filter((t) => haystack.includes(t)).length }
    })
    .filter((r) => terms.length === 0 || r.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.item.found_on.localeCompare(a.item.found_on))
    .slice(0, MAX_RESULTS)
    .map((r) => r.item)
}

const toChatItem = (item: PublicItem, orgNames: Map<string, string>): ChatItem => ({
  id: item.id,
  itemNumber: item.item_number,
  title: item.title,
  category: item.category,
  color: item.color,
  foundOn: item.found_on,
  foundLocation: item.found_location,
  organisationName: orgNames.get(item.organisation_id) ?? null,
  photoPath: item.photo_path,
  status: item.status,
})

const parseArgs = (call: ToolCall): Record<string, unknown> => {
  try {
    const value = JSON.parse(call.function.arguments || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

export const runChat = async (
  config: LlmConfig,
  source: CatalogSource,
  history: IncomingMessage[],
  today: string,
  completeFn: typeof complete = complete,
): Promise<ChatResult> => {
  const messages: ChatMessage[] = [{ role: 'system', content: chatSystemPrompt(today) }, ...history]
  let organisations: PublicOrganisation[] | null = null
  let items: PublicItem[] | null = null
  const loadOrganisations = async () => (organisations ??= await source.listOrganisations())
  let shown: ChatItem[] = []

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS
    const result = await completeFn(config, { messages, tools: isLastRound ? undefined : CHAT_TOOLS, maxTokens: 600, timeoutMs: CALL_TIMEOUT_MS })
    if (result.toolCalls.length === 0) {
      return { reply: result.content?.trim() || 'Entschuldigung, dazu habe ich keine Antwort. Versuchen Sie es mit anderen Worten.', items: shown }
    }

    messages.push({ role: 'assistant', content: result.content ?? '', tool_calls: result.toolCalls })
    for (const call of result.toolCalls) {
      const args = parseArgs(call)
      let output: unknown
      if (call.function.name === 'search_found_items') {
        const orgs = await loadOrganisations()
        const orgNames = new Map(orgs.map((o) => [o.id, o.name]))
        items ??= await source.listItems()
        const found = searchItems(items, args, orgNames).map((i) => toChatItem(i, orgNames))
        shown = found
        output = found.length
          ? found.map((i) => ({
              id: i.id,
              fundnummer: i.itemNumber,
              titel: i.title,
              kategorie: CATEGORIES[i.category as keyof typeof CATEGORIES] ?? i.category,
              farbe: COLORS[i.color as keyof typeof COLORS] ?? i.color,
              gefunden_am: i.foundOn,
              fundort: i.foundLocation,
              fundstelle: i.organisationName,
              reserviert: i.status === 'reserved',
            }))
          : { treffer: 0 }
      } else if (call.function.name === 'list_organisations') {
        output = (await loadOrganisations()).map((o) => ({
          id: o.id,
          name: o.name,
          adresse: o.address,
          fundstelle_ort: o.office?.location,
          oeffnungszeiten: o.office?.opening_hours,
          kontakt: o.office?.contact_email,
          abholhinweise: o.office?.pickup_notes,
        }))
      } else {
        output = { fehler: `Unbekanntes Werkzeug ${call.function.name}` }
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) })
    }
  }
  return { reply: 'Entschuldigung, das hat zu lange gedauert. Bitte erneut versuchen.', items: shown }
}
