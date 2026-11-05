import { test as base, type Page } from '@playwright/test'

/** Wie bei Supabase: Browser dürfen die Antwort und den Zähler (content-range) lesen. */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range',
}

/** Nachbildung der Supabase-REST-API für E2E-Tests (siehe playwright.config.ts). */
export const mockSupabase = async (page: Page, { organisations = 4 }: { organisations?: number } = {}) => {
  await page.route('http://supabase.e2e.test/**', (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const url = new URL(request.url())
    if (url.pathname === '/rest/v1/organisations') {
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `*/${organisations}` }, body: '' })
    }
    return route.fulfill({
      status: 404,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', message: 'not mocked' }),
    })
  })
}

export const test = base.extend<{ mocked: void }>({
  mocked: [
    async ({ page }, use) => {
      await mockSupabase(page)
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'

/** true, wenn die Seite breiter als das Fenster ist (horizontales Scrollen). */
export const hasHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
