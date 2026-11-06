import { existsSync, readFileSync } from 'node:fs'

/**
 * Ziel-Backend der E2E-Tests: E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY, sonst die Werte aus .env.local.
 * Achtung: Die Tests setzen die Demo-Daten dieses Projekts zurück (reset_demo).
 */
const fromDotenv = (): Record<string, string> => {
  if (!existsSync('.env.local')) return {}
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
}

const dotenv = fromDotenv()
export const SUPABASE_URL = (process.env.E2E_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY ?? ''

export const DEMO_PASSWORD = 'demo1234'
export const BSM_ADMIN = 'sandra.keller@bs-musterstadt.example'
