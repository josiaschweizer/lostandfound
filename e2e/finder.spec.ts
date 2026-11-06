import { expect, isMobile, test } from './fixtures'

test('Finder: in zwei Klicks zum Abgabeort, ohne Anmeldung', async ({ page }, testInfo) => {
  await page.goto('/')
  const nav = isMobile(testInfo.project.name) ? page.locator('[data-bottom-nav]') : page.locator('header')
  await nav.getByRole('link', { name: 'Gefunden?' }).click() // Klick 1
  await expect(page.getByRole('heading', { level: 1, name: 'Ich habe etwas gefunden' })).toBeVisible()
  await page.getByRole('button', { name: /Tierpark Sonnenberg/ }).click() // Klick 2
  await expect(page.getByText('Kasse beim Haupteingang')).toBeVisible()
  await expect(page.getByText('Täglich 09:00–18:00')).toBeVisible()
  await expect(page.getByLabel('Passwort')).toHaveCount(0)
})

test('Finder: anderer Ort verweist auf Gemeinde und Transportunternehmen', async ({ page }) => {
  await page.goto('/gefunden')
  await page.getByRole('button', { name: /anderen Ort/ }).click()
  await expect(page.getByText(/Fundbüro deiner Gemeinde/)).toBeVisible()
})
