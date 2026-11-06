import { anonSelect, expect, loginAs, resetDemo, test } from './fixtures'

test.beforeEach(async () => {
  await resetDemo()
})

test('Fund erfassen → steht zuoberst → passende Verlustmeldung → Benachrichtigung im Postausgang', async ({ page }) => {
  await loginAs(page)
  await page.getByRole('link', { name: 'Fund erfassen' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fund erfassen' })).toBeVisible()
  await page.getByLabel(/^Was ist es/).fill('AirPods im Etui')
  await page.getByLabel(/^Kategorie/).selectOption({ label: 'Elektronik' })
  await page.getByRole('button', { name: 'Weiss', exact: true }).click()
  await page.getByLabel(/^Fundort/).fill('Bus Linie 5')
  await page.getByLabel(/^Aufbewahrungsort/).fill('Schrank A, Fach 1')
  await page.getByRole('button', { name: 'Speichern' }).first().click()

  const saved = page.getByTestId('item-saved')
  await expect(saved).toContainText(/Fund BSM-\d{4}-\d{4} gespeichert/)
  await expect(saved.getByRole('link', { name: /passende Verlustmeldung/ })).toBeVisible()

  // Neuester Fund steht zuoberst in der Liste, mit Treffer-Badge
  await page.goto('/verwaltung/funde')
  const first = page.getByTestId('staff-item-row').first()
  await expect(first).toContainText('AirPods im Etui')
  await expect(first).toContainText('Treffer')

  // Detail → Person benachrichtigen → Nachricht im Postausgang
  await first.getByRole('link').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'AirPods im Etui' })).toBeVisible()
  await page.getByRole('button', { name: 'Suchende Person benachrichtigen' }).first().click()
  await expect(page.getByText('Benachrichtigt').first()).toBeVisible()
  await page.goto('/verwaltung/postausgang')
  await expect(page.getByText('An: lina.kunz@example.com').first()).toBeVisible()
  await expect(page.getByText(/AirPods im Etui/).first()).toBeVisible()
})

test('Status mit einem Klick: «Abgeholt» verschiebt den Fund nach «Erledigt», Rückgängig holt ihn zurück', async ({ page }) => {
  await loginAs(page)
  await page.goto('/verwaltung/funde')
  const row = page.getByTestId('staff-item-row').filter({ hasText: 'Stockschirm' })
  await row.getByRole('button', { name: 'Abgeholt' }).click()
  await expect(page.getByText('«Stockschirm» als abgeholt markiert')).toBeVisible()
  await expect(page.getByTestId('staff-item-row').filter({ hasText: 'Stockschirm' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByTestId('staff-item-row').filter({ hasText: 'Stockschirm' })).toHaveCount(1)
})

test('Datentrennung: Fundstelle A sieht keine Funde von Fundstelle B', async ({ page }) => {
  const [zooItem] = await anonSelect<{ id: string; item_number: string }[]>('public_items?select=id,item_number&item_number=like.TPS-*&limit=1')
  expect(zooItem).toBeTruthy()
  await loginAs(page)
  await page.goto('/verwaltung/funde')
  await expect(page.getByTestId('staff-item-row').first()).toBeVisible()
  await expect(page.getByText(/TPS-\d{4}/)).toHaveCount(0)
  await page.goto(`/verwaltung/funde/${zooItem!.id}`)
  await expect(page.getByText('Fund nicht gefunden.')).toBeVisible()
})

test('Verwaltung ist ohne Anmeldung gesperrt', async ({ page }) => {
  await page.goto('/verwaltung/funde')
  await expect(page).toHaveURL(/\/verwaltung\/login/)
})
