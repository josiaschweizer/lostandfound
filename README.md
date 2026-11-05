# lostandfound-new (App C)

Vereinfachte Lost-&-Found-Plattform für M245: die Einfachheit der Tenant-App (A) mit dem Backend der Zentral-App (B),
umgesetzt nach den Befunden der Prototypentests.

- Anforderungen: [`docs/KONZEPT_M245.md`](docs/KONZEPT_M245.md)
- Bauanleitung und Etappen: [`docs/concept.md`](docs/concept.md)
- Bestandsaufnahme und Entscheide: [`docs/ANALYSE.md`](docs/ANALYSE.md), [`docs/SCHEMA_MAPPING.md`](docs/SCHEMA_MAPPING.md)

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query · react-hook-form + zod · Supabase · Vitest · Playwright · pnpm

## Starten

Voraussetzungen: Node.js 22, pnpm 9 oder neuer, Supabase CLI (wird als Dev-Abhängigkeit installiert).

```bash
pnpm install
cp .env.example .env.local      # VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
pnpm dev                        # http://localhost:5173 (fester Port)
```

Läuft noch der Dev-Server der Zentral-App auf 5173, diesen zuerst beenden.

Supabase-Projekt verknüpfen (einmalig, fragt nach dem DB-Passwort):

```bash
pnpm exec supabase link --project-ref hfwykjvplojbetwzpyvu
```

## Skripte

| Befehl | Zweck |
| --- | --- |
| `pnpm dev` | Dev-Server auf Port 5173 |
| `pnpm build` | Typecheck + Produktions-Build nach `dist/` |
| `pnpm lint` | oxlint für `src/` und `e2e/` |
| `pnpm typecheck` | TypeScript-Prüfung |
| `pnpm test` | Unit-Tests (Vitest) |
| `pnpm test:e2e` | E2E-Tests (Playwright, 360 px und 1280 px, eigener Server auf Port 5199, Supabase nachgebildet) |
| `pnpm db:check` | SQL-Checks: Migrationen + Seed + `db-tests/tests.sql` gegen ein lokales Postgres (siehe `db-tests/run.sh`) |
| `pnpm db:push` | Neue Migrationen ins verknüpfte Supabase-Projekt |
| `pnpm db:types` | Datenbanktypen aus dem verknüpften Projekt generieren |
| `pnpm fn:deploy` | Edge Functions deployen |

Einmalig für E2E: `pnpm exec playwright install chromium`.
Für `db:check` braucht es ein lokales Postgres 16/17, z. B. `brew install postgresql@17`, dann `PGHOST=localhost PGUSER=$USER pnpm db:check`.

## Standard-Prüfung nach jeder Etappe

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm db:check && pnpm test:e2e
```

Zusätzlich im Browser auf http://localhost:5173 prüfen: Desktop und 360 px Breite.
