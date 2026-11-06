import { expect, hasHorizontalScroll, test } from './fixtures'

const PUBLIC_PAGES = ['/', '/suche', '/suche?q=jacke&farbe=blue', '/fund/BSM-2026-0006', '/fund/BSM-2026-0002', '/fundstellen', '/o/berufsschule-musterstadt', '/verlust-melden', '/gefunden', '/hilfe', '/meine-meldungen', '/verwaltung/login', '/gibt-es-nicht']

for (const path of PUBLIC_PAGES) {
  test(`kein horizontales Scrollen, Überschrift vorhanden: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    expect(await hasHorizontalScroll(page)).toBe(false)
  })
}
