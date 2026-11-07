# lostandfound

Lost-&-Found-Plattform für Schulen, Freizeitbetriebe und Firmen (Schulprojekt M245).
Suchende finden ihren Gegenstand **ohne Konto**, melden einen Verlust in drei Schritten und
bekommen passende Funde sofort angezeigt. Fundstellen erfassen Funde in unter einer Minute,
prüfen Anfragen und schliessen Übergaben ab.

- Anforderungen: [`docs/KONZEPT_M245.md`](docs/KONZEPT_M245.md) · Bauanleitung: [`docs/concept.md`](docs/concept.md)
- Bestandsaufnahme und Entscheide: [`docs/ANALYSE.md`](docs/ANALYSE.md), [`docs/SCHEMA_MAPPING.md`](docs/SCHEMA_MAPPING.md)
- Präsentation, Demo-Zugänge, bekannte Grenzen: [`docs/UEBERGABE.md`](docs/UEBERGABE.md)

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query ·
react-hook-form + zod · Supabase (Postgres, Auth, Storage, Edge Functions) · DeepSeek (optional) ·
Vitest · Playwright + axe · Deno-Tests · pnpm

## Was drin ist

| Bereich | Umfang |
| --- | --- |
| Öffentlich, ohne Konto | Startseite mit drei Einstiegen, Live-Suche mit Filterleiste (Kategorie, Farbe, Zeitraum, Fundstelle), Synonyme («auch gesucht nach …»), Fund-Detail mit Abholort, «Das gehört mir», Verlust melden in 3 Schritten mit Live-Treffern, persönliche Links für Meldung und Anfrage, Finder-Seite, Fundstellen-Seiten, Hilfe mit Datenschutz |
| Verwaltung (Login) | Übersicht mit Kennzahlen, Fundliste (Offen / Reserviert / Erledigt) mit Status per Klick und «Rückgängig», Fund erfassen (6 Pflichtfelder, Foto, Vorschläge), Fund-Detail mit Verlauf, Verlustmeldungen mit Treffern und Benachrichtigung, Anfragen mit Vergleichsansicht, Postausgang, Fundstellen-Profil, Demo zurücksetzen |
| Matching | Regelbasiert in SQL (Datumsfenster −3/+30 Tage, Farbgruppen, Punkte und Begründungen), für Suchende ab Score 2, für Fundstellen ab 1 |
| KI (optional) | Edge Function `ai` mit DeepSeek (`deepseek-flash` für Text und Fotos; Mock für Tests), jede Funktion mit Fallback ohne KI: **Ausfüllhilfe** «In eigenen Worten beschreiben» (Verlustmeldung, Fund-Erfassung) · **Foto → Felder** beim Erfassen · **KI-Treffer** «Vorschlag mit KI», die die Regeln verpassen (andere Kategorie, andere Wörter), automatisch nach jeder Meldung und jedem neuen Fund · **KI-Suche** bei wenig Treffern («Ding für Musik» → Kopfhörer) · Kennzahl «KI-Unterstützung» in der Übersicht |
| Sicherheit | Row Level Security pro Fundstelle, öffentliche Daten nur über die View `public_items`, Token-Links (nur Hash gespeichert), Ratenbegrenzung, Registrierung gesperrt, keine Schlüssel im Frontend |

## Einrichten

Voraussetzungen: Node.js 22, pnpm, [Supabase CLI](https://supabase.com/docs/guides/cli) (auch als Dev-Abhängigkeit: `pnpm exec supabase`).

```bash
pnpm install
cp .env.example .env.local      # VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (Dashboard → Project Settings → API)
pnpm dev                        # http://localhost:5173
```

### Supabase (gehostetes Projekt)

```bash
pnpm exec supabase link --project-ref hfwykjvplojbetwzpyvu   # einmalig, fragt nach dem DB-Passwort
pnpm exec supabase db reset --linked                         # ACHTUNG: löscht alle Daten, spielt Migrationen + Demo-Daten ein
pnpm fn:deploy                                               # Edge Functions «ai» und «send-email»
```

Für spätere Schema-Änderungen reicht `pnpm db:push` (nur neue Migrationen, Daten bleiben).

Im Dashboard unter **Authentication → Sign In / Providers** «Allow new users to sign up» **ausschalten**
(Konten für Fundstellen legt nur das Team an).

### KI-Ausfüllhilfe (optional)

Der Schlüssel liegt nur als Supabase-Secret auf dem Server, nie im Frontend:

```bash
pnpm exec supabase secrets set AI_PROVIDER=deepseek AI_API_KEY=<deepseek-schlüssel>
# optional: AI_MODEL=… AI_BASE_URL=… AI_TIMEOUT_MS=8000 AI_DAILY_LIMIT=500
#           AI_FEATURES=extract_fields,photo_suggest,semantic_match,expand_query  (Standard: alle)
# ohne Schlüssel vorführen:      supabase secrets set AI_PROVIDER=mock   (einfache Regeln, nur für Tests gedacht)
# ganz ausschalten:              supabase secrets set AI_ENABLED=false
```

Alles läuft über DeepSeek: `deepseek-flash` versteht auch Fotos (als Bild im Request, verkleinert auf 768 px).
Nur falls Fotos über ein anderes Modell laufen sollen: `AI_VISION_MODEL`, `AI_VISION_API_KEY`, `AI_VISION_BASE_URL`.

Ist die KI aus oder nicht erreichbar, verschwindet das Feld «In eigenen Worten beschreiben» bzw. es erscheint
«Das hat nicht geklappt. Bitte fülle die Felder selbst aus.» – alle Formulare funktionieren weiter.

### E-Mail-Versand (optional)

Alle Nachrichten landen immer im **Postausgang** der Verwaltung und auf den Seiten «Deine Meldung» /
«Deine Anfrage». Für echten Versand über [Resend](https://resend.com):

```bash
pnpm exec supabase secrets set RESEND_API_KEY=<key> EMAIL_FROM="lostandfound <noreply@eure-domain.ch>" \
  EMAIL_WEBHOOK_SECRET=<zufälliger-wert> APP_URL=https://<eure-app-url>
```

Danach einmalig im SQL-Editor (gleicher Secret-Wert):

```sql
select vault.create_secret('https://hfwykjvplojbetwzpyvu.supabase.co/functions/v1/send-email', 'email_function_url');
select vault.create_secret('<zufälliger-wert>', 'email_webhook_secret');
```

Adressen auf `.example` und `.invalid` (alle Demo-Daten) werden nie angeschrieben.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `pnpm dev` | Dev-Server auf Port 5173 |
| `pnpm build` | Typecheck + Produktions-Build nach `dist/` |
| `pnpm lint` / `pnpm typecheck` | oxlint / TypeScript |
| `pnpm test` | Unit-Tests (Vitest): Suche, Normalisierung, Datumslogik, Texte |
| `pnpm db:check` | 117 SQL-Checks (RLS, Token, Matching-Testfälle, Ratenbegrenzung, Reset) gegen ein lokales Postgres |
| `pnpm fn:test` | Deno-Tests der Edge Functions (Mock-Anbieter, Timeout, Entfernen von Kontaktdaten, Validierung, erfundene IDs, Cache) |
| `pnpm test:e2e` | Playwright: Kernabläufe, 360 px und 1280 px, axe-Barrierefreiheit (siehe unten) |
| `pnpm db:push` | Neue Migrationen ins verknüpfte Projekt |
| `pnpm fn:deploy` | Edge Functions deployen |

**E2E-Tests** laufen gegen das Backend aus `.env.local` (oder `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY`)
und **setzen dabei die Demo-Daten zurück**. Einmalig: `pnpm exec playwright install chromium`.

**SQL-Checks** brauchen ein lokales Postgres 16/17, z. B. `brew install postgresql@17`, dann
`PGHOST=localhost PGUSER=$USER pnpm db:check`. Die Edge-Function-Tests brauchen [Deno](https://deno.com) (`brew install deno`).

Alles auf einmal:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm fn:test && pnpm db:check && pnpm test:e2e
```

## Ordner

```text
src/
  app/          Router, Anmeldung, Fehlerseiten
  components/   UI-Bausteine (ui/), Fund-Darstellung (items/), Rahmen (layout/)
  domain/       Typen, Suche, Datumslogik, Begründungen (ohne React, getestet)
  features/     public/ (ohne Konto), admin/ (Verwaltung), ai/ (Ausfüllhilfe)
  i18n/de-CH.ts alle Texte (Schweizer Schreibweise, «du» öffentlich)
  services/     Zugriffe auf Supabase (RPCs, Tabellen, Storage, Edge Function)
supabase/
  migrations/   Schema, RLS, Matching, RPCs, Storage, E-Mail, KI-Limits, Referenzdaten, Demo-Daten
  functions/    ai (Ausfüllhilfe), send-email (Resend)
db-tests/       SQL-Checks · e2e/ Playwright · public/demo-photos/ gezeichnete Demo-Bilder
```
