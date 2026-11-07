import { fileURLToPath } from 'node:url'
import { aiEnabled, expect, loginAs, resetDemo, test } from './fixtures'

/**
 * KI-Funktionen (KONZEPT 7). Laufen nur, wenn die Edge Function «ai» eingeschaltet ist
 * (z. B. AI_PROVIDER=mock); sonst werden sie übersprungen – alle anderen Tests prüfen den Weg ohne KI.
 */
const PHOTO = fileURLToPath(new URL('../public/demo-photos/fbl-rucksack-schwarz.webp', import.meta.url))

test.beforeEach(async () => {
  test.skip(!(await aiEnabled()), 'KI ist auf diesem Backend ausgeschaltet')
  await resetDemo()
})

test('Suche: KI erweitert einen umschriebenen Begriff («Ding für Musik» → Kopfhörer)', async ({ page }) => {
  await page.goto('/suche?q=' + encodeURIComponent('Ding für Musik'))
  const similar = page.getByRole('region', { name: 'Ähnliche Gegenstände' })
  await expect(similar.getByText('Vorschlag mit KI')).toBeVisible()
  await expect(similar.getByRole('link', { name: /Kopfhörer|Ohrhörer/ }).first()).toBeVisible()
})

test('Verwaltung: KI findet den Turnbeutel zur Meldung «Blauer Turnsack», den die Regeln verpassen', async ({ page }) => {
  await loginAs(page)
  await page.goto('/verwaltung/meldungen')
  await page.getByRole('link', { name: /Blauer Turnsack/ }).first().click()
  const matches = page.getByTestId('report-matches')
  await expect(matches.getByRole('link', { name: /Turnbeutel/ })).toBeVisible({ timeout: 20_000 })
  await expect(matches.getByText(/Vorschlag mit KI/).first()).toBeVisible()
  await page.goto('/verwaltung')
  await expect(page.getByTestId('ai-stats')).toContainText('Treffer nur dank KI')
  await expect(page.getByTestId('ai-stats').getByText(/^[1-9]\d*$/).first()).toBeVisible()
})

test('Fund erfassen: Foto füllt Titel, Kategorie und Farbe vor', async ({ page }) => {
  await loginAs(page)
  await page.goto('/verwaltung/funde/neu')
  await page.locator('#item-photo').setInputFiles(PHOTO)
  await expect(page.getByText('Felder aus dem Foto vorgeschlagen – bitte prüfen.')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel(/^Was ist es/)).not.toHaveValue('')
  await expect(page.getByLabel(/^Kategorie/)).toHaveValue('bags')
  await expect(page.getByRole('button', { name: /Schwarz/ }).first()).toHaveAttribute('aria-pressed', 'true')
})
