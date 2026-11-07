/**
 * Request-Verarbeitung der Edge Function «ai» – ohne Deno.serve und ohne globale Zustände,
 * damit sie mit Deno-Tests geprüft werden kann (Datenbank und Anbieter werden übergeben).
 *
 * Aktionen (Body-Feld `action`):
 *   status          → { enabled, features }   welche KI-Einstiege das Frontend zeigen soll
 *   extract_fields  → { fields }              Ausfüllhilfe «In eigenen Worten beschreiben» (7.2)
 *   photo_suggest   → { fields }              Foto → Felder, nur angemeldete Fundstellen (C1)
 *   semantic_match  → { stored }              KI-Treffer berechnen und speichern (7.4)
 *                       { token }  suchende Person über ihren Link · { lossId } / { itemId } Fundstelle
 *   expand_query    → { terms, category }     Suchbegriffe erweitern, 7 Tage zwischengespeichert (7.3)
 */
import { type AiConfig, type Feature, KNOWN_FEATURES } from './config.ts'
import { buildExpandMessage, cleanExpansion, type Expansion, normalizeQuery, SYSTEM_EXPAND } from './expand.ts'
import { buildPhotoMessage, buildUserMessage, cleanExtraction, cleanPhoto, parseJsonObject, readExtractInput, readImage, SYSTEM_PHOTO, SYSTEM_PROMPT } from './extract.ts'
import { AiError, type CompleteRequest, type Provider } from './providers/types.ts'
import { buildSemanticMessage, cleanSemantic, type Context, SYSTEM_ITEM, SYSTEM_LOSS } from './semantic.ts'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Aufrufe pro Stunde: Suchende (Hash aus IP + Browser) bzw. angemeldete Fundstelle. */
export const PUBLIC_LIMIT_PER_HOUR = 20
export const STAFF_LIMIT_PER_HOUR = 120

/** Zeitlimit pro Aktion als Vielfaches von AI_TIMEOUT_MS. */
const TIMEOUT_FACTOR: Record<Feature, number> = { extract_fields: 1, photo_suggest: 2, semantic_match: 2.5, expand_query: 1 }

export interface MatchPair {
  lossId: string
  itemId: string
  score: number
  reason: string
}

export interface Db {
  /** 'ok' | 'rate' | 'daily' */
  allow(key: string, limitPerHour: number, dailyLimit: number): Promise<string>
  log(entry: { action: string; durationMs: number; ok: boolean; tokensIn: number; tokensOut: number; organisationId: string | null }): Promise<void>
  /** Fundstelle der angemeldeten Person (aus dem JWT), sonst null. */
  organisationOf(authorization: string | null): Promise<string | null>
  lossContext(args: { token?: string; lossId?: string; organisationId?: string }): Promise<{ loss: Context['reference']; candidates: Context['candidates'] } | null>
  itemContext(itemId: string, organisationId: string): Promise<{ item: Context['reference']; candidates: Context['candidates'] } | null>
  storeMatches(pairs: MatchPair[]): Promise<number>
  getExpansion(term: string): Promise<Expansion | null>
  putExpansion(term: string, expansion: Expansion): Promise<void>
}

export interface Deps {
  config: AiConfig
  provider: Provider | null
  /** Anbieter mit Bildmodell für photo_suggest */
  visionProvider: Provider | null
  today: () => string
  db: Db
  now?: () => number
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export const sha256 = async (text: string): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/** Client-Schlüssel wie request_client_key() in der Datenbank: IP + User-Agent, nur gehasht. */
export const clientKey = (req: Request): Promise<string> => {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean)
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || forwarded?.at(-1) || 'unbekannt'
  return sha256(`lostandfound-ai|${ip}|${req.headers.get('user-agent') ?? ''}`)
}

const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/** Ruft den Anbieter mit Zeitlimit auf, protokolliert (ohne Inhalte) und liefert das JSON-Objekt. */
const runModel = async (
  deps: Deps,
  provider: Provider,
  request: CompleteRequest,
  action: Feature,
  organisationId: string | null,
): Promise<unknown> => {
  const now = deps.now ?? Date.now
  const started = now()
  let usage = { input: 0, output: 0 }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.config.timeoutMs * TIMEOUT_FACTOR[action])
  try {
    const timeout = new Promise<never>((_, reject) =>
      controller.signal.addEventListener('abort', () => reject(new AiError('Die KI hat zu lange gebraucht.', 504))),
    )
    const result = await Promise.race([provider.complete(request, controller.signal), timeout])
    usage = result.usage
    const parsed = parseJsonObject(result.text)
    await deps.db.log({ action, durationMs: now() - started, ok: true, tokensIn: usage.input, tokensOut: usage.output, organisationId }).catch(() => {})
    return parsed
  } catch (e) {
    await deps.db.log({ action, durationMs: now() - started, ok: false, tokensIn: usage.input, tokensOut: usage.output, organisationId }).catch(() => {})
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export const handle = async (req: Request, deps: Deps): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Nur POST' })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const action = typeof body?.action === 'string' ? body.action : ''
  const { config, db } = deps

  if (action === 'status') {
    return json(200, { enabled: config.enabled && deps.provider !== null, features: deps.provider ? config.features : [] })
  }
  if (!body || !(KNOWN_FEATURES as readonly string[]).includes(action)) {
    return json(400, { error: 'Unbekannte Aktion.' })
  }
  const feature = action as Feature
  if (!config.enabled || !deps.provider || !config.features.includes(feature)) return json(503, { error: 'Die KI ist ausgeschaltet.' })

  const organisationId = await db.organisationOf(req.headers.get('Authorization')).catch(() => null)
  const today = deps.today()

  /** Ratenbegrenzung pro Client bzw. Fundstelle und Tageslimit gesamt. Liefert eine Fehlerantwort oder null. */
  const limit = async (): Promise<Response | null> => {
    const key = organisationId ? await sha256(`lostandfound-ai|org|${organisationId}`) : await clientKey(req)
    const verdict = await db.allow(key, organisationId ? STAFF_LIMIT_PER_HOUR : PUBLIC_LIMIT_PER_HOUR, config.dailyLimit).catch(() => 'ok')
    if (verdict === 'rate') return json(429, { error: 'Zu viele Anfragen. Bitte fülle die Felder selbst aus.' })
    if (verdict === 'daily') return json(429, { error: 'Die KI-Hilfe ist für heute aufgebraucht. Bitte fülle die Felder selbst aus.' })
    return null
  }

  try {
    switch (feature) {
      case 'extract_fields': {
        const input = readExtractInput(body)
        if (typeof input === 'string') return json(400, { error: input })
        const blocked = await limit()
        if (blocked) return blocked
        const raw = await runModel(deps, deps.provider, { action, system: SYSTEM_PROMPT, user: buildUserMessage(input.text, input.context, today), json: true, maxTokens: 400 }, feature, organisationId)
        return json(200, { fields: cleanExtraction(raw, today) })
      }

      case 'photo_suggest': {
        if (!organisationId) return json(401, { error: 'Nur für angemeldete Fundstellen.' })
        if (!deps.visionProvider) return json(503, { error: 'Der Foto-Vorschlag ist ausgeschaltet.' })
        const image = readImage(body)
        if (typeof image !== 'string') return json(400, { error: image.error })
        const blocked = await limit()
        if (blocked) return blocked
        const raw = await runModel(deps, deps.visionProvider, { action, system: SYSTEM_PHOTO, user: buildPhotoMessage(), image, json: true, maxTokens: 400 }, feature, organisationId)
        return json(200, { fields: cleanPhoto(raw, today) })
      }

      case 'semantic_match': {
        let direction: 'loss' | 'item'
        let context: Context | null = null
        if (typeof body.token === 'string' && body.token.length >= 20 && body.token.length <= 100) {
          direction = 'loss'
          const found = await db.lossContext({ token: body.token })
          context = found && { reference: found.loss, candidates: found.candidates }
        } else if (isUuid(body.lossId) || isUuid(body.itemId)) {
          if (!organisationId) return json(401, { error: 'Nur für angemeldete Fundstellen.' })
          if (isUuid(body.lossId)) {
            direction = 'loss'
            const found = await db.lossContext({ lossId: body.lossId, organisationId })
            context = found && { reference: found.loss, candidates: found.candidates }
          } else {
            direction = 'item'
            const found = await db.itemContext(body.itemId as string, organisationId)
            context = found && { reference: found.item, candidates: found.candidates }
          }
        } else {
          return json(400, { error: 'Link oder ID fehlt.' })
        }
        if (!context) return json(404, { error: 'Nicht gefunden.' })
        if (context.candidates.length === 0) return json(200, { stored: 0 })
        const blocked = await limit()
        if (blocked) return blocked

        const { user, ids } = buildSemanticMessage(context)
        const raw = await runModel(deps, deps.provider, { action, system: direction === 'loss' ? SYSTEM_LOSS : SYSTEM_ITEM, user, json: true, maxTokens: 900 }, feature, organisationId)
        const scored = cleanSemantic(raw, ids)
        const referenceId = context.reference.id
        const pairs = scored.map((s) =>
          direction === 'loss' ? { lossId: referenceId, itemId: s.id, score: s.score, reason: s.reason } : { lossId: s.id, itemId: referenceId, score: s.score, reason: s.reason },
        )
        const stored = pairs.length > 0 ? await db.storeMatches(pairs) : 0
        return json(200, { stored })
      }

      case 'expand_query': {
        const query = normalizeQuery(body.query)
        if (!query) return json(400, { error: 'Suchbegriff fehlt.' })
        const cached = await db.getExpansion(query).catch(() => null)
        if (cached) return json(200, { ...cached, cached: true })
        const blocked = await limit()
        if (blocked) return blocked
        const raw = await runModel(deps, deps.provider, { action, system: SYSTEM_EXPAND, user: buildExpandMessage(query), json: true, maxTokens: 200 }, feature, organisationId)
        const expansion = cleanExpansion(raw, query)
        await db.putExpansion(query, expansion).catch(() => {})
        return json(200, { ...expansion, cached: false })
      }
    }
    return json(400, { error: 'Unbekannte Aktion.' })
  } catch (e) {
    if (e instanceof AiError) return json(e.status, { error: e.message })
    console.error('ai', action, e instanceof Error ? e.message : e)
    return json(502, { error: 'Die KI-Antwort war unbrauchbar.' })
  }
}
