import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-Tests (pnpm test:e2e). Startet einen eigenen Vite-Server auf Port 5199, damit der laufende
 * Dev-Server auf 5173 nicht stört. Supabase wird in den Tests per page.route() nachgebildet
 * (siehe e2e/fixtures.ts) – die Tests brauchen weder Netz noch Datenbank.
 */
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, hasTouch: true } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'http://supabase.e2e.test',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
})
