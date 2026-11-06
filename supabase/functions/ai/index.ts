/**
 * Edge Function «ai» – einzige Stelle, die mit dem KI-Anbieter spricht (KONZEPT 7).
 * Der API-Schlüssel bleibt als Supabase-Secret auf dem Server und gelangt nie in den Browser.
 * Secrets und Standardwerte: siehe config.ts. Automatisch vorhanden: SUPABASE_URL,
 * SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import { handle } from './app.ts'
import { readConfig } from './config.ts'
import { todayInZurich } from './domain.ts'
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

/** Aufruf einer Datenbankfunktion über die REST-Schnittstelle. */
const rpc = async (name: string, args: Record<string, unknown>, authorization: string, apikey: string): Promise<unknown> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey, Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(3000),
  })
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : await res.json()
}

const service = `Bearer ${serviceKey}`

Deno.serve((req) =>
  handle(req, {
    config,
    provider,
    today: () => todayInZurich(),
    allow: async (key, limit, daily) => {
      try {
        return String(await rpc('ai_allow', { p_key: key, p_limit: limit, p_window_seconds: 3600, p_daily_limit: daily }, service, serviceKey))
      } catch (e) {
        console.warn('ai: Ratenbegrenzung nicht verfügbar:', e instanceof Error ? e.message : e)
        return 'ok'
      }
    },
    log: async ({ action, durationMs, ok, tokensIn, tokensOut, organisationId }) => {
      await rpc('ai_log', { p_action: action, p_duration_ms: durationMs, p_ok: ok, p_tokens_in: tokensIn, p_tokens_out: tokensOut, p_organisation_id: organisationId }, service, serviceKey)
    },
    organisationOf: async (authorization) => {
      // Nur echte Benutzer-JWTs (nicht der öffentliche anon-Schlüssel) haben eine Fundstelle.
      if (!authorization?.startsWith('Bearer ') || authorization.slice(7) === anonKey) return null
      const id = await rpc('current_organisation_id', {}, authorization, anonKey)
      return typeof id === 'string' ? id : null
    },
  }),
)
