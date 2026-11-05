import { expect, hasHorizontalScroll, test } from './fixtures'

const ENTRIES = ['Suchen', 'Verlust melden', 'Gefunden?']

test.describe('Grundlayout (Etappe 1)', () => {
  test('Startseite lädt und zeigt die drei Einstiege', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verloren? Vielleicht schon gefunden.')

    const mobile = testInfo.project.name === 'mobile-360'
    const bottomNav = page.locator('[data-bottom-nav]')
    if (mobile) {
      await expect(bottomNav).toBeVisible()
      for (const label of ENTRIES) await expect(bottomNav.getByRole('link', { name: label })).toBeVisible()
    } else {
      await expect(bottomNav).toBeHidden()
      const header = page.locator('header')
      for (const label of ENTRIES) await expect(header.getByRole('link', { name: label })).toBeVisible()
    }
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('kein Hamburger-Menü, «Hilfe» in der Kopfzeile', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /menü/i })).toHaveCount(0)
    await expect(page.locator('header').getByRole('link', { name: 'Hilfe' })).toBeVisible()
  })

  test('kein sichtbarer Link mit «Login» oder «Anmelden»; Verwaltung nur über «Für Fundstellen» im Footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /login|anmelden/i })).toHaveCount(0)
    const footerLink = page.locator('footer').getByRole('link', { name: 'Für Fundstellen' })
    await expect(footerLink).toHaveAttribute('href', '/verwaltung')
  })

  test('untere Leiste verdeckt den Footer nicht', async ({ page }) => {
    await page.goto('/')
    const link = page.locator('footer').getByRole('link', { name: 'Für Fundstellen' })
    await link.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const linkBox = await link.boundingBox()
    const navBox = await page.locator('[data-bottom-nav]').boundingBox()
    expect(linkBox).not.toBeNull()
    if (navBox && navBox.height > 0) expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(navBox.y)
  })

  test('Navigation führt zu den Seiten', async ({ page }, testInfo) => {
    await page.goto('/')
    const nav = testInfo.project.name === 'mobile-360' ? page.locator('[data-bottom-nav]') : page.locator('header')
    await nav.getByRole('link', { name: 'Verlust melden' }).click()
    await expect(page).toHaveURL(/\/verlust-melden$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verlust melden')
    await nav.getByRole('link', { name: 'Gefunden?' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ich habe etwas gefunden')
  })

  test('Datenbankverbindung wird angezeigt (Entwicklung)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('db-status')).toContainText('verbunden · 4 Fundstellen')
  })
})
