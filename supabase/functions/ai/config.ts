/**
 * Konfiguration nur über Supabase-Secrets (KONZEPT 7.1), nie über VITE_-Variablen.
 *
 *   AI_ENABLED      Hauptschalter (Standard: an, sobald ein Anbieter nutzbar ist)
 *   AI_PROVIDER     deepseek | openai | mock  (Standard: deepseek)
 *   AI_API_KEY      Schlüssel des Anbieters (nicht nötig für mock)
 *   AI_BASE_URL     OpenAI-kompatible Basis-URL (Standard https://api.deepseek.com)
 *   AI_MODEL        Modellname (Standard deepseek-flash)
 *   AI_TIMEOUT_MS   Abbruch nach … ms (Standard 8000)
 *   AI_DAILY_LIMIT  max. Aufrufe pro Tag gesamt (Standard 500)
 *   AI_FEATURES     einzeln aktivierte Aktionen (Standard extract_fields)
 */
export const KNOWN_FEATURES = ['extract_fields'] as const
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
  const features = (env('AI_FEATURES') || 'extract_fields')
    .split(',')
    .map((f) => f.trim())
    .filter((f): f is Feature => (KNOWN_FEATURES as readonly string[]).includes(f))
  return {
    enabled: !switchedOff && (provider === 'mock' || apiKey !== ''),
    provider,
    apiKey,
    baseUrl: (env('AI_BASE_URL') || (providerName === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com')).replace(/\/+$/, ''),
    model: env('AI_MODEL') || (providerName === 'openai' ? 'gpt-4o-mini' : 'deepseek-flash'),
    timeoutMs: int(env('AI_TIMEOUT_MS'), 8000, 1000, 30_000),
    dailyLimit: int(env('AI_DAILY_LIMIT'), 500, 0, 100_000),
    features,
  }
}
