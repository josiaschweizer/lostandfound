/**
 * Konfiguration nur über Supabase-Secrets (KONZEPT 7.1), nie über VITE_-Variablen.
 *
 *   AI_ENABLED          Hauptschalter (Standard: an, sobald ein Anbieter nutzbar ist)
 *   AI_PROVIDER         deepseek | openai | mock  (Standard: deepseek)
 *   AI_API_KEY          Schlüssel des Anbieters (nicht nötig für mock)
 *   AI_BASE_URL         OpenAI-kompatible Basis-URL (Standard https://api.deepseek.com)
 *   AI_MODEL            Modellname (Standard deepseek-flash)
 *   AI_TIMEOUT_MS       Abbruch nach … ms für die Ausfüllhilfe (Standard 8000; Foto ×2, Treffer ×2.5)
 *   AI_DAILY_LIMIT      max. Aufrufe pro Tag gesamt (Standard 500)
 *   AI_FEATURES         einzeln aktivierte Aktionen (Standard: alle)
 *
 * Foto-Vorschlag (photo_suggest): Standard ist derselbe Anbieter und dasselbe Modell (deepseek-flash versteht Bilder).
 * Nur wenn ein anderes Modell gewünscht ist (alle optional):
 *   AI_VISION_MODEL     Standard: AI_MODEL
 *   AI_VISION_API_KEY   Standard: AI_API_KEY
 *   AI_VISION_BASE_URL  Standard: AI_BASE_URL
 */
export const KNOWN_FEATURES = ['extract_fields', 'photo_suggest', 'semantic_match', 'expand_query'] as const
export type Feature = (typeof KNOWN_FEATURES)[number]

export interface AiConfig {
  enabled: boolean
  provider: 'openai-compatible' | 'mock'
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs: number
  dailyLimit: number
  features: Feature[]
  vision: { apiKey: string; baseUrl: string; model: string } | null
}

const int = (value: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

export const readConfig = (env: (key: string) => string | undefined): AiConfig => {
  const providerName = (env('AI_PROVIDER') || 'deepseek').trim().toLowerCase()
  const provider = providerName === 'mock' ? 'mock' : 'openai-compatible'
  const apiKey = env('AI_API_KEY')?.trim() ?? ''
  const switchedOff = /^(false|0|off|nein|no)$/i.test(env('AI_ENABLED')?.trim() ?? '')
  const baseUrl = (env('AI_BASE_URL') || (providerName === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com')).replace(/\/+$/, '')
  const enabled = !switchedOff && (provider === 'mock' || apiKey !== '')

  const model = env('AI_MODEL') || (providerName === 'openai' ? 'gpt-4o-mini' : 'deepseek-flash')
  const visionKey = env('AI_VISION_API_KEY')?.trim() || apiKey
  const vision =
    provider === 'mock'
      ? { apiKey: '', baseUrl: '', model: 'mock' }
      : visionKey
        ? { apiKey: visionKey, baseUrl: (env('AI_VISION_BASE_URL') || baseUrl).replace(/\/+$/, ''), model: env('AI_VISION_MODEL')?.trim() || model }
        : null

  const features = (env('AI_FEATURES') || KNOWN_FEATURES.join(','))
    .split(',')
    .map((f) => f.trim())
    .filter((f): f is Feature => (KNOWN_FEATURES as readonly string[]).includes(f))
    .filter((f) => f !== 'photo_suggest' || vision !== null)

  return {
    enabled,
    provider,
    apiKey,
    baseUrl,
    model,
    timeoutMs: int(env('AI_TIMEOUT_MS'), 8000, 1000, 30_000),
    dailyLimit: int(env('AI_DAILY_LIMIT'), 500, 0, 100_000),
    features: enabled ? features : [],
    vision: enabled ? vision : null,
  }
}
