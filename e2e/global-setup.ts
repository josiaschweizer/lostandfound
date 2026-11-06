import { resetDemo } from './fixtures'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export default async function globalSetup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('E2E: Supabase fehlt. .env.local anlegen oder E2E_SUPABASE_URL und E2E_SUPABASE_ANON_KEY setzen.')
  }
  await resetDemo()
}
