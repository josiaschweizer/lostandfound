import { aiEnabled, expect, resetDemo, test } from './fixtures'

test.beforeEach(async () => {
  await resetDemo()
})

test('Verlust melden → passende Treffer → persönlicher Link → Meldung schliessen', async ({ page }) => {
  await page.goto('/verlust-melden')
  await page.getByLabel(/Was hast du verloren/).fill('Regenjacke')
  await page.getByLabel(/^Kategorie/).selectOption({ label: 'Kleidung' })
  await page.getByRole('button', { name: 'Blau', exact: true }).click()
  await page.getByRole('button', { name: 'Weiter' }).click()

  await page.getByLabel(/Wo hast du ihn verloren/).selectOption({ label: 'Berufsschule Musterstadt' })
  await page.getByRole('button', { name: 'Weiss nicht genau' }).click()
  await expect(page.getByText(/mögliche[rn]? Treffer/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Weiter' }).click()

  await page.getByLabel(/^E-Mail/).fill('e2e.verlust@example.com')
  await page.getByRole('button', { name: 'Verlust melden', exact: true }).click()

  await expect(page).toHaveURL(/\/verlust\/[\w-]{20,}/)
  await expect(page.getByText('Danke für deine Meldung!')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Könnte das deiner sein?' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Regenjacke/ }).first()).toBeVisible()

  // Der Link funktioniert auch später (ohne ?neu=1) und die Meldung lässt sich schliessen
  await page.goto(page.url().replace(/\?.*$/, ''))
  await page.getByRole('button', { name: /Meldung schliessen/ }).click()
  await expect(page.getByText('Diese Meldung ist erledigt.')).toBeVisible()
})

test('Pflichtfelder: ohne Angaben geht es nicht weiter', async ({ page }) => {
  await page.goto('/verlust-melden')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByText('Bitte gib an, was du verloren hast (2 bis 120 Zeichen).').first()).toBeVisible()
  await expect(page.getByText('Bitte wähle eine Kategorie.').first()).toBeVisible()
})

test('Ausfüllhilfe: Freitext füllt leere Felder (nur wenn die KI eingeschaltet ist)', async ({ page }) => {
  const enabled = await aiEnabled()
  await page.goto('/verlust-melden')
  await expect(page.getByLabel(/Was hast du verloren/)).toBeVisible()
  if (!enabled) {
    await expect(page.getByTestId('ai-box')).toHaveCount(0)
    return
  }
  await page.getByLabel('In eigenen Worten beschreiben').fill('hab gestern meine schwarzen airpods im bus 5 verloren')
  await page.getByRole('button', { name: 'Felder ausfüllen lassen' }).click()
  await expect(page.getByLabel(/Was hast du verloren/)).toHaveValue(/airpods/i)
  await expect(page.getByLabel(/^Kategorie/)).toHaveValue('electronics')
  await expect(page.getByRole('button', { name: 'Schwarz', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('automatisch ausgefüllt – bitte prüfen').first()).toBeVisible()
})
