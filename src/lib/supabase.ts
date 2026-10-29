import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from './env'

/**
 * Supabase-Client. Ohne Konfiguration wird ein Platzhalter verwendet; die App zeigt
 * dann eine Einrichtungsanleitung statt Fehlermeldungen (siehe App.tsx).
 */
export const supabase = createClient<Database>(
  env.supabaseUrl ?? 'http://localhost:54321',
  env.supabaseAnonKey ?? 'missing-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
