/**
 * Edge Function «ai» – einzige Stelle, die mit dem KI-Anbieter spricht (KONZEPT 7).
 * Der API-Schlüssel bleibt als Supabase-Secret auf dem Server und gelangt nie in den Browser.
 * Secrets und Standardwerte: siehe config.ts. Automatisch vorhanden: SUPABASE_URL,
 * SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import { type Db, handle } from './app.ts'
import { readConfig } from './config.ts'
import { todayInZurich } from './domain.ts'
import type { Expansion } from './expand.ts'
import { createMockProvider } from './providers/mock.ts'
import { createOpenAiProvider } from './providers/openai.ts'

const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const config = readConfig((key) => Deno.env.get(key))
const provider = !config.enabled
  ? null
  : config.provider === 'mock'
    ? createMockProvider()
    : createOpenAiProvider({ apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model })
const visionProvider = !config.vision
  ? null
  : config.provider === 'mock'
    ? createMockProvider()
    : createOpenAiProvider(config.vision)

/** Aufruf einer Datenbankfunktion über die REST-Schnittstelle. */
const rpc = async (name: string, args: Record<string, unknown>, authorization = `Bearer ${serviceKey}`, apikey = serviceKey): Promise<unknown> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey, Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const db: Db = {
  allow: async (key, limit, daily) => {
    try {
      return String(await rpc('ai_allow', { p_key: key, p_limit: limit, p_window_seconds: 3600, p_daily_limit: daily }))
    } catch (e) {
      console.warn('ai: Ratenbegrenzung nicht verfügbar:', e instanceof Error ? e.message : e)
      return 'ok'
    }
  },
  log: async ({ action, durationMs, ok, tokensIn, tokensOut, organisationId }) => {
    await rpc('ai_log', { p_action: action, p_duration_ms: durationMs, p_ok: ok, p_tokens_in: tokensIn, p_tokens_out: tokensOut, p_organisation_id: organisationId })
  },
  organisationOf: async (authorization) => {
    // Nur echte Benutzer-JWTs (nicht der öffentliche anon-Schlüssel) haben eine Fundstelle.
    if (!authorization?.startsWith('Bearer ') || authorization.slice(7) === anonKey) return null
    const id = await rpc('current_organisation_id', {}, authorization, anonKey)
    return typeof id === 'string' ? id : null
  },
  lossContext: async ({ token, lossId, organisationId }) =>
    (await rpc('ai_loss_context', { p_token: token ?? null, p_loss_id: lossId ?? null, p_organisation_id: organisationId ?? null })) as Awaited<ReturnType<Db['lossContext']>>,
  itemContext: async (itemId, organisationId) =>
    (await rpc('ai_item_context', { p_item_id: itemId, p_organisation_id: organisationId })) as Awaited<ReturnType<Db['itemContext']>>,
  storeMatches: async (pairs) => Number(await rpc('ai_store_matches', { p_pairs: pairs })),
  getExpansion: async (term) => (await rpc('ai_get_expansion', { p_term: term })) as Expansion | null,
  putExpansion: async (term, { terms, category }) => {
    await rpc('ai_put_expansion', { p_term: term, p_terms: terms, p_category: category })
  },
}

Deno.serve((req) => handle(req, { config, provider, visionProvider, today: () => todayInZurich(), db }))
