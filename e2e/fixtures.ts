import { expect, type Page } from '@playwright/test'
import { BSM_ADMIN, DEMO_PASSWORD, SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export { expect, test } from '@playwright/test'

const headers = (token = SUPABASE_ANON_KEY) => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

/** Meldet eine Demo-Person über die Auth-API an und liefert das Zugriffstoken. */
export const signIn = async (email = BSM_ADMIN): Promise<string> => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Anmeldung ${email} fehlgeschlagen: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { access_token: string }).access_token
}

/** Stellt die Demo-Daten wieder her (wie der Knopf «Demo zurücksetzen»). */
export const resetDemo = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_demo`, { method: 'POST', headers: headers(await signIn()), body: '{}' })
  if (!res.ok) throw new Error(`reset_demo fehlgeschlagen: ${res.status} ${await res.text()}`)
}

/** Liest öffentliche Daten (wie ein anonymer Browser). */
export const anonSelect = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return (await res.json()) as T
}

/** Ist die KI-Ausfüllhilfe auf dem Backend eingeschaltet? */
export const aiEnabled = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai`, { method: 'POST', headers: headers(), body: JSON.stringify({ action: 'status' }) })
    const data = (await res.json()) as { enabled?: boolean; features?: string[] }
    return Boolean(data.enabled && data.features?.includes('extract_fields'))
  } catch {
    return false
  }
}

/** Anmeldung in der Verwaltung über das Formular. */
export const loginAs = async (page: Page, email = BSM_ADMIN) => {
  await page.goto('/verwaltung/login')
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click()
  await expect(page).toHaveURL(/\/verwaltung$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Übersicht' })).toBeVisible()
}

/** true, wenn die Seite breiter als das Fenster ist (horizontales Scrollen). */
export const hasHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

export const isMobile = (projectName: string) => projectName === 'mobile-360'
