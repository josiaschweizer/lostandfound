# lostandfound – Workspace for App C (simplified solution)

This folder contains two existing prototypes and the build plan for a third app.
**App C** takes the simplicity of the Tenant app (A), uses the backend of the Central app (B)
and implements every finding from the prototype tests.

This file is the binding work instruction for the local coding agent (Claude Code).
The functional requirements are in `KONZEPT_M245.md` (German). This README describes **how** to build.

> Language note: The app's user interface is **German (Switzerland)**. All UI texts, labels and
> e-mail templates stay in German (Swiss spelling: "ss" instead of "ß", quotation marks « »).
> German strings quoted in this README are exact UI texts and must not be translated.

---

## 0 Summary for the agent

1. `tenant-app/` and `zentral-app/` are **reference only**. Never change anything there.
2. Build exclusively in `app/`.
3. Technology and backend come from `zentral-app/` (stack, Supabase client, types, migrations, Edge Functions).
4. Usability and simplicity come from `tenant-app/` (short forms, one match hint, status change with one click).
5. What to build is defined in `KONZEPT_M245.md` (Must + AI fill-in assistant; everything else only on request).
6. The hosted database is **shared** with the Central app. Schema changes are additive only; development runs against a **local** Supabase (section 4).
7. One stage per task (section 8). Always run stage 0 before any code change.

---

## 1 Folder structure

```text
lostandfound-workspace/
├── README.md              ← this file
├── KONZEPT_M245.md        ← implementation concept (exported from Claude Docs as Markdown)
├── tenant-app/            ← Variant A, git clone, READ ONLY
├── zentral-app/           ← Variant B, git clone, READ ONLY
└── app/                   ← App C, new git repo, build here
```

### Setting up the folder

```bash
mkdir lostandfound-workspace && cd lostandfound-workspace

git clone <url-tenant-app>  tenant-app
git clone <url-zentral-app> zentral-app

# Put README.md (this file) and KONZEPT_M245.md here
# KONZEPT_M245.md = Claude Doc «lostandfound – Umsetzungskonzept M245» → export as Markdown

mkdir app && cd app && git init && cd ..
```

Then start Claude Code **in the workspace folder** (not in `app/`) so it can see all three folders:

```bash
cd lostandfound-workspace
claude
```

Optional, to make sure the reference repos stay unchanged:

```bash
chmod -R a-w tenant-app zentral-app
```

---

## 2 Role of each folder

| Folder | Role | What the agent does there | What it never does |
| --- | --- | --- | --- |
| `tenant-app/` | UX reference | Study flows, forms, match hint, status changes, tenant view | Modify; copy code 1:1 if it uses a different framework |
| `zentral-app/` | Technical and backend reference | Read and **copy** stack, Supabase client, generated types, migrations, RLS, RPCs, Edge Functions, seed, tests | Modify; push migrations from there; start the dev server there |
| `app/` | App C | Build everything | Import code from the reference folders by path (always copy) |
| `KONZEPT_M245.md` | Requirements | Source for behaviour, texts, acceptance criteria | – |

**Important:** `app/` must not contain imports like `../zentral-app/src/...`. Anything needed is copied
and then maintained in `app/`. This keeps App C self-contained, runnable and deployable on its own.

---

## 3 Technical decisions for App C

### 3.1 Stack (same as the Central app)

App C uses the same stack as the Central app so the Supabase client, types and hooks can be reused directly:

- Vite + React + TypeScript (strict)
- Tailwind CSS v4
- React Router
- TanStack Query
- react-hook-form + zod
- Supabase JS client
- Vitest (unit), Playwright (E2E)
- Package manager: **pnpm** (never npm or yarn)

Versions: same as in `zentral-app/package.json`, so copied code runs without changes.

The Tenant app is **not** used as the code base if it is built with a different framework
(e.g. Angular). In that case only flows, texts and design ideas are taken over.

### 3.2 What is copied from the Central app

| What | From (in `zentral-app/`, determine exactly in stage 0) | To in `app/` |
| --- | --- | --- |
| `.env.local` (or `.env`) | project root | `app/.env.local` |
| `.env.example` | project root | `app/.env.example` |
| Supabase client | e.g. `src/lib/supabase.ts` | `app/src/lib/supabase.ts` |
| Generated DB types | e.g. `src/types/database.ts` | `app/src/types/database.ts` |
| Entire `supabase/` folder (config, migrations, functions, seed) | `supabase/` | `app/supabase/` |
| Tailwind / design tokens (colours) | CSS / Tailwind config | `app/src/styles/` |
| Useful hooks/utilities (query hooks, date formatting, item number) | `src/hooks`, `src/lib` | only what is needed |
| Test setup (Vitest, Playwright, SQL checks) | config files, `tests/` | `app/` |

**Not** copied: pages and components of the Central app 1:1. The UI of App C is built new and simpler.

### 3.3 Environment variables

```bash
cp zentral-app/.env.local app/.env.local
```

Expected content (verify names in stage 0):

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Rules:

- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend. **Never** put the `service_role` key or an AI key in a `VITE_` variable.
- `.env.local` is listed in `app/.gitignore`. Only `.env.example` without values is committed.
- AI and e-mail keys only as Supabase secrets (`supabase secrets set ...`).
- For local development (section 4) additionally create `app/.env.development.local` with the values of the local Supabase.

---

## 4 Database strategy (important)

App C and the Central app share the **hosted** Supabase project. The Central app must keep working unchanged up to and including the Design Expo (11.11.2026).

### 4.1 Rules

1. **Develop against a local Supabase** (`supabase start` in `app/`), not against the hosted project.
2. **Migrations are pushed only from `app/`.** `app/supabase/migrations/` starts as a copy of `zentral-app/supabase/migrations/` so the migration history matches the hosted project. From then on, never push from `zentral-app/`.
3. **Additive changes only:** new tables, new columns with a default or `null`, new views, new RPCs, new policies. **Never** rename or drop columns, never change types, never overwrite existing RPCs with a different signature, never loosen existing policies.
4. If an existing RPC must behave differently (e.g. matching), create a **new** function with a new name (e.g. `match_for_loss_v2`). The old one stays for the Central app.
5. Columns the concept marks as `not null` (e.g. `storage_location`) stay nullable in the database and are enforced by form validation in App C. This keeps the Central app working.
6. `reset_demo()` is not changed. App C gets its own `reset_demo_v2()` that only adds demo data.
7. **Push to the hosted project** (`supabase db push`) only after team agreement and not before the Expo, unless the team explicitly decides otherwise.

### 4.2 Setting up local Supabase

```bash
cd app
supabase start                 # starts local DB, prints URL and anon key
supabase db reset              # applies all migrations + seed locally
# put the values from «supabase start» into .env.development.local:
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=<local anon key>
```

### 4.3 Alternative (if the team prefers)

A **separate** Supabase project for App C. Advantage: zero risk for the Central app. Disadvantage: new keys, data not shared.
In that case rules 3–6 do not apply; everything else stays the same. Record the decision in `app/docs/ENTSCHEIDE.md`.

---

## 5 What App C does differently (summary of test findings)

The full requirements are in `KONZEPT_M245.md`, sections 1–9. Short version as guard rails:

| Finding from the tests | Implementation in App C |
| --- | --- |
| Finders without an account ended up on the login page (4 of 6 failed) | Home page with three entry points: «Gegenstand suchen», «Verlust melden», «Ich habe etwas gefunden». No public link leads to the login |
| Four AI features confuse users | Exactly **one** visible AI entry point per form: «In eigenen Worten beschreiben». No AI-matching button, no AI-search toggle |
| Technical terms not understood | Wording table (concept 9.1), e.g. «Woran erkennst du deinen Gegenstand?» instead of «Eigentumsnachweis» |
| Form with 12 fields | Short form with 7 required fields, rest collapsed |
| Filters hidden, active filters overlooked | Filter bar directly visible, active filters as chips |
| Pickup location only visible when expanded | Pickup info always visible |
| Items found before the loss date are missing | Date window −3 / +30 days |
| Unsuitable suggestions | Colour exclusion, minimum score, reason per match |
| Small font, truncated titles | Body text at least 16 px, titles max. 2 lines |
| A: new item not on top, completed items stay in list | Newest first, tabs «Offen / Reserviert / Erledigt» |
| A: simple and fast | Adopt patterns: short forms, one match hint, status with one click |

### 5.1 Taken from the Tenant app (look up concretely in the code during stage 0)

- Flow and length of the loss form (few fields, immediate confirmation)
- Hint «Mögliche Treffer: …» directly on the loss report in the admin area
- Buttons «Abgeholt» / «Erledigt» with one click
- Compact item list with category icons
- Tenant feeling: the page of a lost-and-found office (`/o/:slug`) should feel like the Tenant app — simple, only this office, straight to the form. Global search exists in addition.

### 5.2 Taken from the Central app

- Data model, RLS, item number `KÜRZEL-JJJJ-NNNN`, return flow with reservation
- Supabase login for staff, demo logins (`demo1234`)
- Outbox `simulated_emails`
- AI fill-in assistant (review existing logic and move it into the Edge Function `ai`)
- Detail pages with office and opening hours
- Colour scheme (green/turquoise, orange only for internal data)

---

## 6 Scope of App C

| Priority | Content (IDs from `KONZEPT_M245.md`, section 3) | When |
| --- | --- | --- |
| Must | M1–M10: search, office page, report loss, finder page, short form, item list with tabs, matching v2, return, wording, mobile | Stages 1–7 |
| Should | S1 AI fill-in assistant | Stage 8 |
| Should (optional) | S2 AI matches in the background, S3 AI synonyms, S4 e-mail on match, S5 finder pre-report | only on explicit request |
| Could / Won't | as in the concept | not without request |

---

## 7 Page structure of App C

| Route | Page | Login |
| --- | --- | --- |
| `/` | Home: large search field, three entry points, «Zuletzt gefunden» | no |
| `/suche` | Search with visible filters, filters in the URL | no |
| `/fund/:fundnummer` | Item detail, pickup info visible, button «Das gehört mir» | no |
| `/o/:slug` | Office page (tenant feeling): info, search only there, report loss | no |
| `/verlust-melden` | 3 steps, matches right after submitting | no |
| `/verlust/:token` | My loss report | no (token link) |
| `/gefunden` | «Ich habe etwas gefunden»: where to drop it off | no |
| `/anfrage/:token` | My return request | no (token link) |
| `/hilfe` | Process, FAQ, privacy | no |
| `/verwaltung/login` | Staff login | – |
| `/verwaltung` | Overview with numbers, button «Fund erfassen» | yes |
| `/verwaltung/funde` | Item list with tabs | yes |
| `/verwaltung/funde/neu` | Short form | yes |
| `/verwaltung/funde/:id` | Detail, edit, matches | yes |
| `/verwaltung/meldungen` | Loss reports with «Mögliche Treffer» | yes |
| `/verwaltung/anfragen` | Return requests | yes |
| `/verwaltung/postausgang` | Outbox | yes |

Public navigation: three entries; on mobile as a bottom bar with icon and label, **no hamburger menu**.
The link to the admin area appears only in the footer («Für Fundstellen»).

---

## 8 Stages

Each stage is a separate task for the agent. After each stage: standard check (section 9), check in the browser, commit.

### Stage 0 – Analyse both repos (no code changes)

Output: `app/docs/ANALYSE.md` containing

1. **Tenant app:** framework, folder structure, pages, flows (report loss, record item, match hint, status change, tenant switch `?mandant=`), texts and design elements to adopt.
2. **Central app:** versions from `package.json`, folder structure, Supabase client, types file, list of all tables, columns, views, RPCs, policies, Edge Functions, environment variables, seed and `reset_demo()`, existing tests and scripts.
3. **All AI features of the Central app:** file, call, provider, model, variables, prompts.
4. **Mapping** concept names ↔ existing names (concept section 8) in `app/docs/SCHEMA_MAPPING.md`.
5. **List of required additive DB changes** for App C, noting whether they could affect the Central app.
6. **Open questions** for the team.

Acceptance: documents exist; the team has answered the questions.

### Stage 1 – Project setup

1. Create Vite + React + TS in `app/` with pnpm, same versions as the Central app.
2. Set up Tailwind, Router, TanStack Query, react-hook-form, zod, Supabase client.
3. Copy Supabase client, DB types and design tokens from the Central app.
4. Copy `.env.local`, create `.env.example`, check `.gitignore`.
5. Copy the `supabase/` folder from the Central app, start local Supabase (section 4.2).
6. Base layout: header, mobile bottom navigation, footer, central text file `src/i18n/de-CH.ts`.
7. Scripts in `package.json`: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:check`.
8. Dev server on port **5173** (`vite.config.ts`: `server: { port: 5173, strictPort: true }`). If the Central app is still running there, stop it first.

Acceptance: `pnpm dev` shows the empty layout on `localhost:5173`; data from the local DB loads as a test (e.g. number of offices).

### Stage 2 – Additive DB changes

According to the list from stage 0 and concept section 8, following section 4.1:
new nullable columns, new tables (`item_history`, `color_relations`, `search_synonyms`, `match_suggestions`, `ai_calls`, `rate_limits`), view `public_items_v2`, token RPCs, public insert RPCs, `reset_demo_v2()` with the test cases from concept 8.4.

Acceptance: `supabase db reset` works locally; all existing SQL checks of the Central app still pass (proof that B does not break); new SQL checks pass.

### Stage 3 – Matching v2

`match_for_loss_v2` and `match_for_item_v2` according to concept section 6 (date window −3/+30, colour exclusion, points, reasons). Test cases from concept 6.6 as SQL checks.

Acceptance: test cases pass; the case "earbuds found one day before the loss date" is matched.

### Stage 4 – Public pages

Home, search with visible filters and local synonyms, item card, item detail, office page in tenant style, wording according to concept 9.1.

Acceptance: concept 5.1 and 5.2; Playwright at 360 px without overlaps.

### Stage 5 – Report a loss

3-step form (without AI button for now), date quick picks including «Weiss nicht genau», confirmation with matches, `/verlust/:token`.

Acceptance: concept 5.3 and 5.8; E2E report → matches → token link → close.

### Stage 6 – Finder page

`/gefunden` according to concept 5.6 (without pre-report unless requested).

Acceptance: from `/` to the drop-off location in ≤ 2 clicks, without login.

### Stage 7 – Admin area

Login, overview, short form, item list with tabs, edit with history, loss reports with «Mögliche Treffer», requests with feature comparison, complete return, outbox.

Acceptance: concept 5.5 and 5.7; a new item appears on top; a request can be confirmed in ≤ 3 clicks.

### Stage 8 – AI fill-in assistant

1. Edge Function **`ai`** in `app/supabase/functions/ai/` (new name; existing functions of the Central app stay unchanged).
2. Adapters `anthropic` and `mock`, configuration via secrets, zod validation, 8 s timeout, logging without content (concept 7.1).
3. Action `extract_fields` with the prompt and schema from concept 7.2.
4. Button «Felder ausfüllen lassen» in the loss form and the short form; fills only empty fields and marks them «automatisch ausgefüllt – bitte prüfen».
5. Privacy paragraph under `/hilfe` (concept 7.6).

Acceptance: the input «hab gestern meine schwarzen airpods im bus 5 verloren» fills title, category, colour, place and date. With `AI_ENABLED=false` everything works without the AI button.

### Stage 9 – Polish

Accessibility, mobile, performance (concept 10), README and `docs/UEBERGABE.md` for App C.

---

## 9 Standard check after every stage

```bash
cd app
pnpm lint
pnpm typecheck
pnpm test
pnpm db:check
pnpm test:e2e
```

Additionally check in the browser at `http://localhost:5173`: desktop and 360 px width (DevTools).

All commands must pass. Otherwise the stage is not finished.

---

## 10 Working rules for the agent

1. **One stage per task.** At the end: summary, changed files, check results, open points.
2. **Never write to `tenant-app/` or `zentral-app/`.** No `pnpm install`, no dev server, no `supabase db push` there.
3. **Copy, don't import.** No relative paths from `app/` into the reference folders.
4. **Read first, then change.** If the concept, this README and existing code contradict each other, stop and ask.
5. Use **pnpm**.
6. **Develop against the local Supabase.** No push to the hosted project without explicit approval.
7. **Additive migrations only**, new files, never modify existing migrations (section 4.1).
8. **No secrets** in code, commits or `VITE_` variables.
9. **UI texts only via `src/i18n/de-CH.ts`**, in German with Swiss spelling (ss), wording according to concept 9.1.
10. **Simplicity over features.** When in doubt, one field, one button or one step less.
11. **Small commits** with the finding ID from the concept, e.g. `feat(gefunden): finder page without login (T1)`.
12. **Take acceptance criteria literally** and prove them with a test or a documented manual check.

---

## 11 Prompts to copy

**Start (stage 0):**

```text
Read README.md and KONZEPT_M245.md in this folder completely.
Run stage 0 from README.md section 8. Do not change any code.
Write app/docs/ANALYSE.md and app/docs/SCHEMA_MAPPING.md and list your open questions at the end.
```

**Every further stage:**

```text
Implement stage <N> from README.md section 8.
Follow the working rules in section 10 and the database rules in section 4.1.
At the end run the standard check from section 9, check in the browser at localhost:5173
and summarise: what changed, test results, open points.
```

**If something is unclear:**

```text
Stop. Explain the contradiction or ambiguity and propose two options. Do not implement anything yet.
```

---

## 12 Open questions (clarify before stage 1)

- [ ] Shared Supabase project with additive changes (section 4.1) or a separate project for App C (4.3)?
- [ ] Which framework is the Tenant app built with?
- [ ] Which AI provider and model, and who provides the key?
- [ ] Where will App C be hosted (e.g. a separate Vercel project)?
- [ ] Should App C be shown before the Expo? If yes: only as an outlook, not as a test basis (it has not been tested).

---

## 13 Note for school

App C continues the solution decision towards M245. For M241-P3, the tested prototypes A and B are what count.
If App C is shown, present it as the "next step", not as a tested variant.
The use of Claude (concept, README, code) must be listed in the AI declaration.
