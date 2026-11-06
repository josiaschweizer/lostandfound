import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

/** Barrierefreiheit (KONZEPT 10): keine «serious»/«critical» Befunde auf den öffentlichen Seiten. */
const PAGES = ['/', '/suche?q=jacke', '/fund/BSM-2026-0006', '/fundstellen', '/o/berufsschule-musterstadt', '/verlust-melden', '/gefunden', '/hilfe', '/verwaltung/login']

for (const path of PAGES) {
  test(`axe ohne schwere Befunde: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const severe = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(severe.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([])
  })
}
