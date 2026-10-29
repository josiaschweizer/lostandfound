/**
 * Edge Function «ai» – einzige Stelle, die mit dem KI-Anbieter spricht.
 * Der API-Key bleibt als Secret auf dem Server und gelangt nie in den Browser.
 *
 * Aufruf aus dem Frontend: supabase.functions.invoke('ai', { body: { task, ... } })
 *   chat               öffentlich     Assistent mit Zugriff auf den öffentlichen Fundkatalog
 *   search-items       öffentlich     KI-Suche: ergänzt Katalogtreffer um anders formulierte
 *   parse-loss-report  öffentlich     Freitext → Felder der Verlustmeldung
 *   rank-matches       öffentlich     KI-Abgleich Verlustmeldung ↔ Fundgegenstände
 *   describe-item      Mitarbeitende  Vorschlag für die öffentliche Beschreibung
 *   draft-message      Mitarbeitende  Vorschlag für Abholhinweise / Ablehnungsbegründung
 *   analyze-photo      Mitarbeitende  Foto → Titel, Kategorie, Farbe, Marke, Beschreibung
 *
 * Secrets (supabase secrets set …):
 *   AI_API_KEY       API-Key des Anbieters (Pflicht)
 *   AI_BASE_URL      OpenAI-kompatible Basis-URL, Standard https://api.deepseek.com
 *   AI_MODEL         Modellname, Standard deepseek-flash
 *   AI_VISION_MODEL  Modell für Fotos, Standard wie AI_MODEL
 * Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { readMessages, runChat, type CatalogSource, type PublicItem, type PublicOrganisation } from './chat.ts'
import { cleanText } from './domain.ts'
import { complete, LlmError, parseJsonObject, readConfig } from './llm.ts'
import { createRateLimiter } from './ratelimit.ts'
import {
  cleanLossReport,
  cleanMatches,
  cleanPhotoAnalysis,
  cleanSearchHits,
  describeItemMessages,
  draftMessageMessages,
  lossReportMessages,
  matchMessages,
  photoMessages,
  readDescribeItemInput,
  readDraftMessageInput,
  readMatchInput,
  readPhoto,
  readSearchInput,
  searchItemsMessages,
} from './tasks.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const PUBLIC_TASKS = new Set(['chat', 'search-items', 'parse-loss-report', 'rank-matches'])
const STAFF_TASKS = new Set(['describe-item', 'draft-message', 'analyze-photo'])

/** Anfragen pro 5 Minuten: Suchende (pro IP) bzw. angemeldete Mitarbeitende. */
const RATE_WINDOW_SECONDS = 5 * 60
const PUBLIC_LIMIT = 20
const STAFF_LIMIT = 40

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
if (!anonKey) console.error('ai: SUPABASE_ANON_KEY fehlt – Katalog und Anmeldung können nicht gelesen werden.')

/** Client ohne Benutzerkonto: sieht wegen RLS nur öffentliche Daten. */
const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
/** Nur für das Rate-Limit (Tabelle ai_requests ist für alle anderen gesperrt). */
const serviceClient = serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null

const PUBLIC_ITEM_COLUMNS =
  'id, organisation_id, item_number, title, category, color, brand, found_on, found_location, public_description, photo_path, status'

const catalog: CatalogSource = {
  listItems: async () => {
    const { data, error } = await publicClient
      .from('found_items')
      .select(PUBLIC_ITEM_COLUMNS)
      .eq('is_public', true)
      .neq('status', 'returned')
      .order('found_on', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return (data ?? []) as PublicItem[]
  },
  listOrganisations: async () => {
    const { data, error } = await publicClient
      .from('organisations')
      .select('id, slug, name, address, found_offices(location, opening_hours, contact_email, pickup_notes)')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => {
      const offices = row.found_offices as unknown
      const office = (Array.isArray(offices) ? offices[0] : offices) ?? null
      return { id: row.id, slug: row.slug, name: row.name, address: row.address, office } as PublicOrganisation
    })
  },
}

/** Liefert die Benutzer-ID, wenn der Aufruf von Mitarbeitenden einer Organisation kommt. */
const staffUserId = async (req: Request): Promise<string | null> => {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data: user } = await userClient.auth.getUser(authorization.slice(7))
  if (!user?.user) return null
  const { data: organisationId } = await userClient.rpc('current_organisation_id')
  return organisationId ? user.user.id : null
}

// Ersatz, falls die Migration für das Rate-Limit noch nicht eingespielt ist.
const memoryLimiter = createRateLimiter(PUBLIC_LIMIT, RATE_WINDOW_SECONDS * 1000)

const sha256 = async (text: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/** Rate-Limit in der Datenbank (über alle Function-Instanzen). IP-Adressen werden nur gehasht gespeichert. */
const allowRequest = async (rawKey: string, limit: number): Promise<boolean> => {
  const key = await sha256(`lostandfound-ai:${rawKey}`)
  if (serviceClient) {
    const { data, error } = await serviceClient.rpc('ai_rate_check', { p_key: key, p_limit: limit, p_window_seconds: RATE_WINDOW_SECONDS })
    if (!error) return data === true
    console.warn('ai: Rate-Limit in der Datenbank nicht verfügbar, nutze Speicher:', error.message)
  }
  return memoryLimiter(key)
}

const todayInZurich = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())

const clientIp = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unbekannt'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Nur POST' })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const task = typeof body?.task === 'string' ? body.task : ''
  if (!body || (!PUBLIC_TASKS.has(task) && !STAFF_TASKS.has(task))) return json(400, { error: 'Unbekannte Aufgabe.' })

  const config = readConfig((key) => Deno.env.get(key))
  if (!config) return json(503, { error: 'Die KI ist nicht eingerichtet (Secret AI_API_KEY fehlt).' })

  let rateKey = `ip:${clientIp(req)}`
  let limit = PUBLIC_LIMIT
  if (STAFF_TASKS.has(task)) {
    const userId = await staffUserId(req)
    if (!userId) return json(401, { error: 'Nur für angemeldete Mitarbeitende.' })
    rateKey = `user:${userId}`
    limit = STAFF_LIMIT
  }
  if (!(await allowRequest(rateKey, limit))) return json(429, { error: 'Zu viele KI-Anfragen. Bitte einige Minuten warten.' })

  const today = todayInZurich()
  try {
    switch (task) {
      case 'chat': {
        const messages = readMessages(body.messages)
        if (typeof messages === 'string') return json(400, { error: messages })
        return json(200, await runChat(config, catalog, messages, today))
      }
      case 'search-items': {
        const input = readSearchInput(body)
        if (typeof input === 'string') return json(400, { error: input })
        const result = await complete(config, { messages: searchItemsMessages(input, today), json: true, maxTokens: 1200, timeoutMs: 40_000 })
        return json(200, { matches: cleanSearchHits(parseJsonObject(result.content), input) })
      }
      case 'parse-loss-report': {
        const text = cleanText(body.text, 2000)
        if (!text || text.length < 10) return json(400, { error: 'Bitte etwas ausführlicher beschreiben, was Sie verloren haben.' })
        const result = await complete(config, { messages: lossReportMessages(text, today), json: true, maxTokens: 500 })
        return json(200, { draft: cleanLossReport(parseJsonObject(result.content), today) })
      }
      case 'rank-matches': {
        const input = readMatchInput(body)
        if (typeof input === 'string') return json(400, { error: input })
        const result = await complete(config, { messages: matchMessages(input), json: true, maxTokens: 1500, timeoutMs: 45_000 })
        return json(200, { matches: cleanMatches(parseJsonObject(result.content), input) })
      }
      case 'describe-item': {
        const input = readDescribeItemInput(body)
        if (typeof input === 'string') return json(400, { error: input })
        const result = await complete(config, { messages: describeItemMessages(input), maxTokens: 300 })
        return json(200, { text: cleanText(result.content, 1000) ?? '' })
      }
      case 'draft-message': {
        const input = readDraftMessageInput(body)
        if (typeof input === 'string') return json(400, { error: input })
        const result = await complete(config, { messages: draftMessageMessages(input), maxTokens: 400 })
        return json(200, { text: result.content?.trim().slice(0, 1500) ?? '' })
      }
      case 'analyze-photo': {
        const image = readPhoto(body)
        if (typeof image !== 'string') return json(400, { error: image.error })
        try {
          const result = await complete(config, { model: config.visionModel, messages: photoMessages(image), json: true, maxTokens: 500, timeoutMs: 45_000 })
          return json(200, { analysis: cleanPhotoAnalysis(parseJsonObject(result.content)) })
        } catch (e) {
          if (e instanceof LlmError && (e.providerStatus === 400 || e.providerStatus === 422)) {
            return json(422, { error: 'Das KI-Modell kann dieses Foto nicht auswerten. Evtl. unterstützt es keine Bilder (Secret AI_VISION_MODEL prüfen).' })
          }
          throw e
        }
      }
    }
    return json(400, { error: 'Unbekannte Aufgabe.' })
  } catch (e) {
    if (e instanceof LlmError) return json(e.status, { error: e.message })
    console.error('ai', task, e)
    return json(500, { error: 'Die KI-Anfrage ist fehlgeschlagen. Bitte erneut versuchen.' })
  }
})
