import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Supabase-Client (nur URL und anon key aus .env.local).
 * Die Datenbanktypen folgen in Etappe 2 (src/lib/database.types.ts), dann wird der Client typisiert.
 * Ohne Konfiguration zeigt App.tsx eine Einrichtungsanleitung statt Fehlermeldungen.
 */
export const supabase = createClient(env.supabaseUrl ?? 'http://localhost:54321', env.supabaseAnonKey ?? 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})
