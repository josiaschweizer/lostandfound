/**
 * Request-Verarbeitung der Edge Function «ai» – ohne Deno.serve und ohne globale Zustände,
 * damit sie mit Deno-Tests geprüft werden kann (Abhängigkeiten werden übergeben).
 *
 * Aktionen (Body-Feld `action`):
 *   status          → { enabled, features }   ob das Frontend KI-Einstiege zeigen soll
 *   extract_fields  → { fields }              Ausfüllhilfe «In eigenen Worten beschreiben» (KONZEPT 7.2)
 */
import type { AiConfig } from './config.ts'
import { buildUserMessage, cleanExtraction, parseJsonObject, readExtractInput, SYSTEM_PROMPT } from './extract.ts'
import { AiError, type Provider } from './providers/types.ts'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Aufrufe pro Stunde: Suchende (Hash aus IP + Browser) bzw. angemeldete Mitarbeitende. */
export const PUBLIC_LIMIT_PER_HOUR = 20
export const STAFF_LIMIT_PER_HOUR = 60

export interface Deps {
  config: AiConfig
  provider: Provider | null
  today: () => string
  /** 'ok' | 'rate' | 'daily'. Bei Datenbankfehler: 'ok' (die harte Grenze ist das Guthaben beim Anbieter). */
  allow: (key: string, limitPerHour: number, dailyLimit: number) => Promise<string>
  log: (entry: { action: string; durationMs: number; ok: boolean; tokensIn: number; tokensOut: number; organisationId: string | null }) => Promise<void>
  /** Fundstelle der angemeldeten Person (aus dem JWT), sonst null. */
  organisationOf: (authorization: string | null) => Promise<string | null>
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

export const handle = async (req: Request, deps: Deps): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Nur POST' })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const action = typeof body?.action === 'string' ? body.action : ''
  const { config } = deps

  if (action === 'status') {
    return json(200, { enabled: config.enabled && deps.provider !== null, features: config.enabled ? config.features : [] })
  }
  if (action !== 'extract_fields' || !body) return json(400, { error: 'Unbekannte Aktion.' })
  if (!config.enabled || !deps.provider || !config.features.includes('extract_fields')) {
    return json(503, { error: 'Die KI ist ausgeschaltet.' })
  }

  const input = readExtractInput(body)
  if (typeof input === 'string') return json(400, { error: input })

  const organisationId = await deps.organisationOf(req.headers.get('Authorization')).catch(() => null)
  const key = organisationId ? await sha256(`lostandfound-ai|org|${organisationId}`) : await clientKey(req)
  const verdict = await deps.allow(key, organisationId ? STAFF_LIMIT_PER_HOUR : PUBLIC_LIMIT_PER_HOUR, config.dailyLimit).catch(() => 'ok')
  if (verdict === 'rate') return json(429, { error: 'Zu viele Anfragen. Bitte fülle die Felder selbst aus.' })
  if (verdict === 'daily') return json(429, { error: 'Die KI-Hilfe ist für heute aufgebraucht. Bitte fülle die Felder selbst aus.' })

  const now = deps.now ?? Date.now
  const started = now()
  const today = deps.today()
  let usage = { input: 0, output: 0 }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs)
    let text: string
    try {
      const timeout = new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () => reject(new AiError('Die KI hat zu lange gebraucht.', 504))),
      )
      const result = await Promise.race([
        deps.provider.complete({ action, system: SYSTEM_PROMPT, user: buildUserMessage(input.text, input.context, today), json: true, maxTokens: 400 }, controller.signal),
        timeout,
      ])
      text = result.text
      usage = result.usage
    } finally {
      clearTimeout(timer)
    }
    const fields = cleanExtraction(parseJsonObject(text), today)
    await deps.log({ action, durationMs: now() - started, ok: true, tokensIn: usage.input, tokensOut: usage.output, organisationId }).catch(() => {})
    return json(200, { fields })
  } catch (e) {
    await deps.log({ action, durationMs: now() - started, ok: false, tokensIn: usage.input, tokensOut: usage.output, organisationId }).catch(() => {})
    if (e instanceof AiError) return json(e.status, { error: e.message })
    console.error('ai', action, e instanceof Error ? e.message : e)
    return json(502, { error: 'Die KI-Antwort war unbrauchbar.' })
  }
}
