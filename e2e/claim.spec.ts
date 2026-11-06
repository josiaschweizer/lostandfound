import { expect, loginAs, resetDemo, test } from './fixtures'

test.beforeEach(async () => {
  await resetDemo()
})

test('Suchen → Detail → «Das gehört mir» → Verwaltung bestätigt → Übergabe → nicht mehr öffentlich', async ({ page }) => {
  // Suchende Person: Suche mit Filter
  await page.goto('/suche')
  await page.getByLabel('Suchbegriff').fill('Regenjacke')
  await page.getByRole('button', { name: 'Blau', exact: true }).click()
  await expect(page).toHaveURL(/q=Regenjacke.*farbe=blue|farbe=blue.*q=Regenjacke/)
  await expect(page.getByText('1 Gegenstand gefunden')).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: /Regenjacke/ }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Regenjacke' })).toBeVisible()
  const itemUrl = page.url()

  // Anfrage ohne Konto
  await page.getByRole('button', { name: 'Das gehört mir' }).click()
  await page.getByLabel(/Woran erkennst du/).fill('In der Innentasche steckt ein Busbillett.')
  await page.getByLabel(/^E-Mail/).fill('e2e.person@example.com')
  await page.getByLabel(/^Name/).fill('E2E Person')
  await page.getByRole('button', { name: 'Anfrage senden' }).click()
  await expect(page.getByRole('link', { name: 'Deine Anfrage verfolgen' })).toBeVisible()
  const claimLink = await page.getByRole('link', { name: 'Deine Anfrage verfolgen' }).getAttribute('href')
  expect(claimLink).toMatch(/^\/anfrage\/[\w-]{20,}$/)

  // Fundstelle: in höchstens drei Klicks von der Übersicht zur Bestätigung
  await loginAs(page)
  await page.getByRole('link', { name: /Offene Anfragen/ }).click()
  await page.getByRole('link', { name: /E2E Person/ }).click()
  await expect(page.getByText('In der Innentasche steckt ein Busbillett.')).toBeVisible()
  await expect(page.getByText('Busbillett in der Innentasche')).toBeVisible() // internes Merkmal zum Vergleich
  await page.getByRole('button', { name: 'Bestätigen', exact: true }).click()
  await page.getByRole('button', { name: 'Bestätigen und E-Mail senden' }).click()
  await expect(page.getByText('Anfrage bestätigt – E-Mail erstellt.')).toBeVisible()

  // Suchende Person sieht die Bestätigung über ihren Link
  await page.goto(claimLink!)
  await expect(page.getByText('Bestätigt – du kannst den Gegenstand abholen.')).toBeVisible()

  // Übergabe abschliessen → Fund ist erledigt und nicht mehr öffentlich
  await page.goBack()
  await page.getByRole('button', { name: 'Übergabe abschliessen' }).click()
  await expect(page.getByText('Übergabe abgeschlossen – Fund ist erledigt.')).toBeVisible()
  await page.goto(itemUrl)
  await expect(page.getByText('Dieser Gegenstand ist nicht (mehr) verfügbar.')).toBeVisible()
})

test('Anfrage braucht ein Erkennungsmerkmal und eine gültige E-Mail', async ({ page }) => {
  await page.goto('/fund/BSM-2026-0004')
  await page.getByRole('button', { name: 'Das gehört mir' }).click()
  await page.getByLabel(/Woran erkennst du/).fill('kurz')
  await page.getByLabel(/^E-Mail/).fill('keine-adresse')
  await page.getByRole('button', { name: 'Anfrage senden' }).click()
  await expect(page.getByText('Bitte beschreibe genauer, woran du ihn erkennst (mind. 10 Zeichen).').first()).toBeVisible()
  await expect(page.getByText('Bitte gib eine gültige E-Mail-Adresse an.').first()).toBeVisible()
})
