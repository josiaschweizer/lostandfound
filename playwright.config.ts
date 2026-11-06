import { defineConfig, devices } from '@playwright/test'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './e2e/env'

/**
 * E2E-Tests (pnpm test:e2e) gegen ein echtes Supabase-Backend: standardmässig das aus .env.local,
 * alternativ E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY. Vor dem Lauf und vor ändernden Tests werden
 * die Demo-Daten zurückgesetzt – also nie gegen ein Projekt mit echten Daten laufen lassen.
 * Eigener Vite-Server auf Port 5199, damit der Dev-Server auf 5173 weiterlaufen kann.
 * Die Tests teilen sich eine Datenbank und laufen deshalb nacheinander (workers: 1).
 */
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
  },
  projects: [
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, hasTouch: true } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY },
  },
})
