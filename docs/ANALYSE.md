# Stage 0 – Analysis of the reference apps

Status: 05.11.2026 · Stage 0 (no code changed) · Sources: `docs/concept.md` (build instructions), `docs/KONZEPT_M245.md` (requirements, export of the Claude Doc «lostandfound – Umsetzungskonzept M245», rev. 15), `LostAndFound-Tenant-Prototype/` (A), `lostandfound/` (B).

Folder names in this workspace differ from `concept.md`: `tenant-app/` = `LostAndFound-Tenant-Prototype/`, `zentral-app/` = `lostandfound/`. Both stay read-only.

---

## 0 Team decisions that change the build instructions (05.11.2026)

| Topic | `concept.md` said | Decided |
| --- | --- | --- |
| Supabase project | Shared with B, additive changes only (4.1), local Supabase for development | **Same hosted project, but B will be deleted.** Treat it as a new project: data may be wiped, tables may be changed or dropped. |
| AI provider | Adapters `anthropic` + `mock` | **DeepSeek** (OpenAI-compatible, already configured as Supabase secret) + `mock` for tests |
| App folder | `app/` | **`lostandfound-new/`** (empty git repo, branch `main`); `concept.md` and `KONZEPT_M245.md` live in its `docs/`. Wherever the concept says `app/`, read `lostandfound-new/`. |

Consequences:

- Rules 3–7 of `concept.md` 4.1 no longer apply (no `_v2` names, no nullable workarounds, no `reset_demo_v2`). The concept's own wording applies instead: `storage_location` is required, matching replaces the old rule, `reset_demo()` is rewritten.
- App C gets a **fresh migration set** (see 5). The hosted DB is reset once with `supabase db reset --linked` when the team is ready (after the Expo on 11.11. if B must still be shown there – see open question Q1).
- The Edge Function can keep the name **`ai`** (B's function is replaced, not run in parallel).

---

## 1 Variant A – Tenant app (`LostAndFound-Tenant-Prototype/`)

**Framework:** none. Plain HTML + CSS + JavaScript ES modules, ~600 lines, no build step, no backend. Deployed to GitHub Pages via `.github/workflows/pages.yml`. Fonts: Roboto, Material Symbols Rounded (Google Fonts).

**Consequence:** no code is copied. Only flows, texts and design ideas.

### Structure

| File | Role |
| --- | --- |
| `index.html` | Shell: app bar (brand + actions), `<main id="app">`, footer with «Demo-Daten zurücksetzen», snackbar |
| `js/data.js` | `DEFAULT_TENANT`, 6 categories with icons, demo login `admin`/`demo`, seed (3 tenants, 7 items, 2 reports) |
| `js/store.js` | In-memory DB mirrored to `localStorage` (`lost-and-found-db`), newest first by date, `setStatus`, `reset` |
| `js/auth.js` | Fake login, session = tenant id in `sessionStorage` |
| `js/views.js` | Pages as HTML strings, all values escaped (`esc`) |
| `js/app.js` | Tenant from `?mandant=`, hash router, delegated events via `data-form` / `data-action`, live search, toast |

### Flows

- **Tenant switch:** `?mandant=<id>` chosen once at start (meant for QR codes on site); the whole app then shows only this tenant. Brand shows tenant icon + «Fundbüro <Name>».
- **Report loss (`#/`):** one card, hero «Etwas verloren?» + one sentence; fields: «Was hast du verloren?», «Kategorie», «Wann?» (default today, max today), «Wo ungefähr?», «Beschreibung», then «Kontakt»: «Name», «E-Mail». Button «Meldung senden» → `#/danke`: «Danke für deine Meldung!» + «Weitere Meldung erfassen».
- **Admin (`#/admin`):** title «Verwaltung» + tenant name; 3 stat cards (Fundstücke offen, Verlustmeldungen offen, Zurückgegeben); tabs «Fundstücke n» / «Verlustmeldungen n»; live search; FAB «Fundstück erfassen».
- **Record item (`#/admin/neu`):** «Bezeichnung», «Kategorie», «Gefunden am», «Fundort», «Beschreibung» → «Speichern» / «Abbrechen», toast «Fundstück erfasst».
- **Match hint:** on every open loss report, badge «Mögliche Treffer: <titles>» = open items of the same category. Simple and well understood (T18).
- **Status change with one click:** «Abgeholt» on items, «Erledigt» on reports; done rows get a muted style + badge.

### To adopt in App C

- Tone «du» on public pages, short hero sentence, one card per form.
- Form length and order of the loss form; immediate thank-you page.
- Compact list rows: category icon in a round avatar, title, place · date, description, action button on the right.
- Badge «Mögliche Treffer: …» directly on the loss report (admin).
- One-click status buttons with toast.
- Tenant feeling for `/o/:slug`: only this office, straight to search and report.

### Weaknesses not to repeat (from tests and code)

- New item not on top (T13), done items stay in the list and counters mix states (T14), no edit (T15), required fields without asterisk and errors one at a time (T16), no clear button in search (T17).
- `today()` uses UTC → wrong default date between 00:00 and 01:00/02:00 in Switzerland.
- Matching is only "same category", no date window, no ranking.

---

## 2 Variant B – Central app (`lostandfound/`)

### 2.1 Stack and versions (`package.json`)

| Package | Version |
| --- | --- |
| react / react-dom | ^19.3.1 |
| react-router | ^8.5.0 |
| @tanstack/react-query | ^5.104.5 |
| react-hook-form / @hookform/resolvers | ^7.90.0 / ^5.9.2 |
| zod | ^4.6.7 |
| @supabase/supabase-js | ^2.118.0 |
| clsx / lucide-react | ^2.1.1 / ^1.61.0 |
| vite / @vitejs/plugin-react | ^8.3.4 / ^6.1.2 |
| tailwindcss / @tailwindcss/vite | ^4.3.3 |
| typescript | ~6.0.3 (strict, `noUncheckedIndexedAccess`) |
| vitest | ^5.0.5 |
| oxlint | ^1.88.0 (the concept says ESLint; B uses oxlint) |
| supabase (CLI) | ^2.121.0 |
| @types/node | ^24.19.2 |

Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `preview`, `db:link`, `db:push`, `db:types`, `fn:deploy`, `fn:deploy:ai`, `fn:test`. **Missing for App C:** `db:check`, `test:e2e`; Playwright is not a dependency.

Path alias `@/` → `src/`. Deploy: Vercel (`vercel.json`, SPA rewrite).

Checked on 05.11.: typecheck, `oxlint src`, build clean; Vitest 20/20; Deno 13/13. The SQL checks were not run (need Postgres).

### 2.2 Folder structure

```text
src/
  app/          router, AuthProvider, RequireStaff, RootLayout (dock for floating buttons), RouteError
  domain/       pure logic + tests: matching, aiMatching, catalog (filters, synonyms), workflow, dates, labels, types
  services/     only place with Supabase calls: catalog, staffItems, requests, lossReports, organisations, auth, emails, photos, ai, demo, errors, mappers
  features/     public/, auth/, admin/, demo/, assistant/
  components/   ui/ (Button, Form, Sheet, Layout, Feedback, Stepper, ActionBar…), items/, layout/, ai/
  lib/          supabase.ts, env.ts, database.types.ts, queryKeys.ts, localTokens.ts, demoMode.ts, image.ts, demoPhotos.ts
supabase/       config.toml, migrations/ (8), functions/ai, functions/send-email, seed.sql
db-tests/       run.sh, stub.sql, tests.sql (85 checks against plain Postgres 16 with a stubbed auth/storage/vault/net)
scripts/demo-photos/generate.py   SVG → WebP demo images (26 in public/demo-photos/)
```

- Supabase client: `src/lib/supabase.ts` (typed with `Database`, placeholder URL if env missing → `SetupNotice`).
- DB types: `src/lib/database.types.ts`, **hand-written**, not generated (concept expects `src/types/database.ts`).
- Design tokens: `src/index.css` (`@theme`: brand 50–900 green/turquoise `#17736b`, accent orange for internal data, font Inter).

### 2.3 Environment variables

- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (only `.env.example` exists in the folder; **there is no `.env.local`** to copy → see Q4).
- Edge `ai`: `AI_API_KEY`, `AI_BASE_URL` (default `https://api.deepseek.com`), `AI_MODEL` (default `deepseek-flash`), `AI_VISION_MODEL`; auto: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Edge `send-email`: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_WEBHOOK_SECRET`, `APP_URL`, optional `RESEND_API_URL`; DB side Vault secrets `email_function_url`, `email_webhook_secret`.
- Hosted project ref: `hfwykjvplojbetwzpyvu`.

### 2.4 Database

**Enums:** `organisation_type` (school, lost_property_office, company, other) · `item_category` (electronics, clothing, keys, bags, wallets, jewellery, sports, other) · `item_color` (black, white, grey, blue, red, green, yellow, brown, pink, gold, silver, multicolor, other) · `item_status` (available, reserved, returned) · `request_status` (open, confirmed, rejected, completed) · `loss_report_status` (open, closed) · `email_delivery_status` (pending, sent, failed, skipped).

**Tables:**

| Table | Columns (short) |
| --- | --- |
| `organisations` | id, slug (unique, kebab), name, type, short_code (2–5 capitals, unique), address, next_item_seq, created_at |
| `found_offices` | id, organisation_id (unique → 1:1), name, location, contact_email, contact_phone, opening_hours (text), pickup_notes |
| `memberships` | user_id (PK → auth.users), organisation_id, full_name – no role |
| `found_items` | id, organisation_id, item_number (unique), title, category, color (one), brand, found_on, found_location, public_description, photo_path, status, is_public, created_at, updated_at |
| `found_item_internal` | item_id (PK), organisation_id, identifying_feature, internal_note, storage_location (all `''` default) |
| `return_requests` | id, item_id, organisation_id, access_token (uuid, plain), claimant_name, claimant_contact, message, proof_description, status, pickup_instructions, decision_note, created_at, decided_at · partial unique index: max. 1 `confirmed` per item |
| `loss_reports` | id, organisation_id (null = «Weiss nicht»), access_token (uuid, plain), reporter_name, reporter_contact, title, category, color, brand, lost_on (one date), lost_location, description, status, created_at |
| `simulated_emails` | id, organisation_id, return_request_id, loss_report_id, recipient, link_path, subject, body, created_at, delivery_status, delivery_note, sent_at |
| `ai_requests` | id, client_key (hash), created_at – rate limit, service role only |

No views.

**Triggers:** `assign_item_number` (`CODE-YYYY-NNNN`, year from `found_on`, counter per organisation **not reset per year**) · `touch_updated_at` · `protect_item_identity` (number and organisation immutable) · `prepare_email_delivery` + `dispatch_email` (pg_net → `send-email`, skips `.example` and non-email contacts).

**RPCs:** `current_organisation_id`, `require_organisation`, `slugify`, `queue_email`, `register_organisation`, `submit_return_request`, `decide_return_request`, `change_item_status`, `submit_loss_report`, `notify_loss_report_match`, `close_loss_report`, `get_return_request_status`, `get_loss_report`, `email_setting`, `email_json`, `ai_rate_check`, `seed_demo_data`, `reset_demo`.

**RLS (all tables enabled):** organisations/offices readable by everyone, own editable · items: public catalog `is_public and status <> 'returned'` + all of the own organisation; anon only has column grants on public columns · internal table only own organisation · requests, reports, outbox read-only for own organisation; writes only via RPCs · loss reports: own + all `organisation_id is null`.

**Storage:** bucket `item-photos` (public, 5 MB, jpeg/png/webp), upload/update/delete only in folder `<own organisation id>/`. Demo photos are static files (`photo_path = demo/<file>`).

**Seed / reset:** `seed.sql` calls `seed_demo_data()` (v2: 4 organisations BZS/FBL/NWL/RVS, 4 demo accounts `demo1234`, 31 items with fixed UUIDs, 9 requests, 7 loss reports, 10 outbox mails). `reset_demo()` deletes all data and all non-demo users and reseeds; **executable by `anon`**.

### 2.5 Business rules worth keeping

- A request alone changes nothing; confirming reserves the item; max. one confirmed request per item.
- Rejecting a confirmed request makes the item available again; «returned» completes the confirmed request; other open requests stay open and are rejected deliberately (with a prepared text).
- Internal data lives in its own table that anon can never read.
- Everything with rules runs in `security definer` RPCs with `search_path = ''` and German error messages that the frontend shows as they are.

### 2.6 Known weaknesses to fix in App C (from the code review on 05.11.)

1. Any self-registered account could read name and contact of all «Weiss nicht» reports → solved by the concept (no self-registration, staff created by seed/SQL), keep RLS tight anyway.
2. Public RPCs send mails to any address with user-controlled text, no rate limit → rate limit per client in the insert RPCs (concept 8.3: max. 10 per hour).
3. AI rate limit keyed on the first `x-forwarded-for` entry (client-controllable) → hash of the last proxy-added IP + user agent.
4. Server checks dates with `current_date` (UTC), client with local time → use `(now() at time zone 'Europe/Zurich')::date` everywhere.
5. Item number year does not restart the counter → counter per organisation **and year**.
6. Item + internal data + photo saved in separate calls → one RPC `save_item` (transaction); delete replaced photos.
7. `reset_demo()` callable by anyone → only for logged-in admins (see Q3).
8. Status could be set directly on insert → status only via RPC.

### 2.7 Edge Functions

- **`send-email`:** called by the DB trigger with `{ id }` and an `x-webhook-secret` (constant-time check); sends text + HTML via Resend; writes `sent`/`failed` back. Reusable as is (wording of templates changes).
- **`ai`:** see section 3.

### 2.8 Tests and scripts

- Vitest (`src/**/*.test.ts`): 20 tests in 5 files (matching, catalog, workflow, dates, demoPhotos).
- Deno (`supabase/functions/**`): 10 AI tests + 3 email tests.
- SQL: `db-tests/run.sh` creates `lf_test` on a local Postgres 16, loads `stub.sql` (roles anon/authenticated/service_role, auth, storage, vault, net), all migrations, seed, then 85 checks (`pg_temp.check` / `pg_temp.fails`) in 7 blocks: anon, staff school, staff city office, registration, storage, reset, e-mail.
- No Playwright tests in the repo.

---

## 3 AI features of B (all in `supabase/functions/ai/`)

Frontend calls `supabase.functions.invoke('ai', { body: { task, … } })` from `src/services/ai.ts`. Provider: any OpenAI-compatible `/chat/completions` (`llm.ts`), default DeepSeek (`deepseek-flash`, thinking disabled). JSON output via `response_format: json_object`, parsed with `parseJsonObject`, then strictly cleaned (`tasks.ts`). Candidates get keys K1…Kn so the model cannot invent IDs. Rate limit: DB function `ai_rate_check` (public 20 / staff 40 per 5 min), in-memory fallback.

| Task | Who | UI place | Prompt essence | Fate in App C |
| --- | --- | --- | --- | --- |
| `chat` | public | floating «Fragen?» button, `AssistantWidget` | Assistant with tools `search_found_items`, `list_organisations`, max. 3 rounds | **removed** (C2 «Hilfe» later, only on request) |
| `search-items` | public | AI toggle in search field | score candidates 0–100, reason | **removed** (S3 synonyms, only on request; local synonyms are Must) |
| `parse-loss-report` | public | «In eigenen Worten beschreiben» → «Formular ausfüllen» | free text → title, category, color, brand, lostOn, lostLocation, description | **becomes `extract_fields`** (S1) – the only visible AI entry |
| `rank-matches` | public/staff | «KI-Abgleich» buttons | compare report ↔ items 0–100 | **removed** (S2 later only on request) |
| `describe-item` | staff | «Beschreibung vorschlagen» | public description without proof features | **removed** (`extract_fields` with context `fund` covers it) |
| `draft-message` | staff | «Text formulieren» | pickup / rejection text | **removed** (templates 9.3; `draft_reply` only on request) |
| `analyze-photo` | staff | «Angaben aus Foto erkennen» | photo → fields + privacy warnings | **removed** (C1 only on request) |

Reusable code: `llm.ts` (OpenAI-compatible client, error mapping 401/402/429, timeout), `parseJsonObject`, `cleanText`/`cleanDate`, the K-key pattern, `ai_rate_check`. New per concept 7.1: config `AI_ENABLED`, `AI_PROVIDER` (`deepseek` | `mock`), `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `AI_TIMEOUT_MS` (8000), `AI_DAILY_LIMIT`, `AI_FEATURES`; table `ai_calls` (no content); zod validation; redaction of e-mail/phone/IBAN before each call.

---

## 4 Concept vs. existing app – what exists, what is missing, what goes

| Concept item | B today | App C |
| --- | --- | --- |
| M1 search with filters | yes, filters partly in a bottom sheet, one colour, synonyms in code | visible filter bar, colour multi-select, chips, X button, date presets, synonyms from DB table |
| M2 office page | yes (`/o/:slug`), contact collapsed | pickup info always open, tenant feeling |
| M3 loss report | 3 steps, one date, AI fill-in visible | date range + «Weiss nicht genau», email required, name optional, private feature, confirmation page with ≤ 5 matches + reasons |
| M4 finder page | missing («Etwas gefunden?» → login) | `/gefunden` |
| M5 short form | 12 fields, storage optional | 6 visible required fields + collapsed extras, sticky save, «Nächsten Fund erfassen» |
| M6 item list | status tabs, newest found date | tabs Offen/Reserviert/Erledigt, newest **created** first, match badge, one-click status with undo |
| M7 matching | client-side, 0–30 days, colour +2, keyword +1 | SQL RPCs, −3/+30, colour exclusion with groups, new points, reasons, thresholds |
| M8 return | yes | «Das gehört mir», recognition text, pickup by someone else, 3-step page |
| M9 wording | «Sie», technical terms | «du» public, wording table 9.1, texts in `src/i18n/de-CH.ts` |
| M10 mobile | partly, floating buttons overlap | bottom bar without hamburger, no floating elements |
| S1 AI fill-in | `parse-loss-report` | `extract_fields` in loss form and item form |
| Item history (T15) | missing | `item_history` |
| Admin role | missing | `memberships.role` staff/admin |
| Hashed tokens | plain uuid | 32-byte token, only SHA-256 stored |
| Self-registration | yes | **removed** (Won't) |
| Demo panel / role switch | yes | not in the concept → see Q5 |

To remove: AI chat + «Fragen?» button, AI search toggle, AI matching buttons, describe/draft/photo buttons, public «Organisation registrieren», registration pages.

---

## 5 Database plan for App C

Because the project is treated as new, App C starts with its **own clean migration set**, written from scratch but reusing B's proven SQL (RLS pattern, security-definer RPCs, item number trigger, email pipeline). Table names stay B's English names where they exist (concept 8: existing names win); the full mapping is in `SCHEMA_MAPPING.md`.

Planned migrations (one per stage, descriptive names):

1. `…_schema.sql` – enums, tables, triggers (incl. `item_history`, `color_relations`, `search_synonyms`, `match_suggestions`, `ai_calls`, `rate_limits`)
2. `…_rls.sql` – policies, grants, view `public_items`
3. `…_rpcs.sql` – token RPCs, public insert RPCs with validation + rate limit, staff RPCs (save item, status, decide request, close report)
4. `…_storage.sql` – bucket + policies
5. `…_email.sql` – Resend pipeline (from B)
6. `…_matching.sql` – `match_for_loss`, `match_for_item` (stage 3)
7. `…_demo.sql` – `seed_demo_data()`, `reset_demo()` with the data from concept 8.4
8. `…_ai.sql` – `ai_calls`, daily limit (stage 8)

Going live on the hosted project: `supabase db reset --linked` once (drops B's schema and data), then `supabase db push` for later migrations. Only after team OK (Q1).

---

## 6 Working environment (important for the next stages)

| Task | Where it can run |
| --- | --- |
| Write code in `lostandfound-new/` | from this session, directly in the folder |
| `pnpm install`, typecheck, lint, Vitest, build, Deno tests | cloud workspace of this session (copy of `lostandfound-new/`) |
| SQL checks (`db:check`) | cloud workspace, plain Postgres 16 + stub (like B's `db-tests/`) |
| Playwright E2E | cloud workspace against a local mock backend, **or** on Josia's Mac |
| `supabase start` (local Supabase, needs Docker) | only on Josia's Mac |
| `supabase db reset --linked`, `db push`, `functions deploy`, secrets | only on Josia's Mac (this session cannot reach `*.supabase.co` or `api.deepseek.com`) |
| Browser check on `localhost:5173` | only on Josia's Mac (`pnpm dev` in `lostandfound-new/`; stop B's dev server first) |

---

## 7 Open questions for the team

**Q1 – When may the hosted DB be reset?** B will be deleted, but is it still shown at the Design Expo on 11.11.? If yes, App C develops locally (Mac with Docker) until 11.11. and resets the hosted DB afterwards. If no, it can be reset right away.

**Q2 – Non-public items (concept contradiction).** 5.5 says «öffentlich sichtbar» off → «dann nur Kategorie sichtbar» (item appears anonymised). 5.2 and 8.3 say only `is_public = true` items are in the catalog. Proposal: off = **not in the catalog at all** (simpler, safer). Or show a placeholder card «Portemonnaie – bei der Fundstelle melden»?

**Q3 – Demo reset.** Keep a reset for user tests? Proposal: `reset_demo()` only for logged-in admins, button in the admin area («Demo zurücksetzen»), no public role switcher.

**Q4 – Keys.** There is no `.env.local` in `lostandfound/`. Please put `lostandfound-new/.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the Mac yourself (I never handle secrets). DeepSeek key stays the existing Supabase secret `AI_API_KEY`.

**Q5 – Demo photos.** The concept wants new demo organisations (Berufsschule Musterstadt, Tierpark Sonnenberg, Hotel Bergblick, Kulturhaus am Platz) and ~40 items. May I reuse B's 26 generated photos (`public/demo-photos/`) and the generator script, renamed to the new items?

**Q6 – Opening hours.** Concept 8.1: `jsonb` per weekday. Proposal: keep **one text field** (as in B) – easier to edit, displays the same. OK?

**Q7 – Required fields in the item form.** The table in 5.5 lists 6 required fields (title, category, colour, place, storage location, date); M5 says «max. 6», AK and `concept.md` say «7». Proposal: 6.

**Q8 – Notification checkbox.** 5.3 has «Benachrichtige mich bei neuen passenden Funden» (S4). S4 is out of scope. Proposal: store the flag (`notify`) but hide the checkbox until S4 is ordered.

**Q9 – Category list.** Concept 13.1 asks which categories are binding; 7.4 mentions a category «Schule». Proposal: keep B's 8 categories, add **«Ausweise & Karten»** (needed for C1 and the wallet test case) – or keep exactly B's list?

**Q10 – New colours.** Concept 6.3 adds beige, orange, violet, turquoise and drops «andere Farbe». OK to use exactly the 16 values from 6.3 (including «mehrfarbig»), multiple colours per item?

**Q11 – Route for item detail.** Concept: `/fund/:fundnummer` (e.g. `/fund/BZS-2026-0042`). OK (readable, but numbers are guessable – only public items are shown there anyway)?

**Q12 – Hosting.** Same Vercel project as B (re-pointed to `lostandfound-new/`) or a new one?

### Answers (05.11.2026, implemented)

| Q | Decision |
| --- | --- |
| Q1 | Hosted DB reset right away (`supabase db reset --linked`); B is no longer needed. |
| Q2 | Non-public items are **not in the catalog at all**; only staff see them. |
| Q3 | `reset_demo()` only for admins, button «Demo zurücksetzen» in the overview. E2E tests use the same function. |
| Q4 | `.env.local` is created by Josia on the Mac. DeepSeek key only as Supabase secret `AI_API_KEY`. |
| Q5 | B's 26 generated demo photos are reused (`public/demo-photos/`, `photo_path = 'demo/<file>'`), 20 items have a photo. |
| Q6 | Opening hours: one text field. |
| Q7 | 6 required fields in the item form. |
| Q8 | `notify` is stored, checkbox hidden (S4 out of scope). |
| Q9 | B's 8 categories plus «Ausweise & Karten» (`id_cards`). |
| Q10 | Exactly the 16 colours from 6.3, up to 3 per item. |
| Q11 | Route `/fund/:fundnummer`. |
| Q12 | Same repo as B (`josiaschweizer/lostandfound`), `vercel.json` kept. |

Implemented scope: Must M1–M10 and S1 (AI fill-in, edge function `ai` with providers `deepseek`/`openai`/`mock`).
Presentation flow and known limits: [`UEBERGABE.md`](UEBERGABE.md).
