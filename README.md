# lostandfound rm/v1 – Prototyp einer Lost-&-Found-Plattform

Schulprojekt M241. Organisationen (Schulen, Fundbüros, Unternehmen) registrieren sich, verwalten ihre eigene Fundstelle und erfassen Fundgegenstände. Suchende finden Gegenstände ohne Konto, fragen eine Rückgabe an oder melden einen Verlust.

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query · react-hook-form + zod · Supabase (Postgres, Auth, Storage, RLS) · Vitest

---

## 1. Starten

### Voraussetzungen
- Node.js 20 oder neuer
- pnpm 9 oder neuer (z. B. `brew install pnpm`)
- Supabase CLI (`pnpm install` installiert sie lokal als Dev-Abhängigkeit)
- Zugriff auf das Supabase-Projekt `vkgfyfqxyhnokdwyqotl`

### Einmalig: Datenbank einrichten

```bash
pnpm install
pnpm exec supabase login                # Browser-Login bei Supabase
pnpm db:link                   # verknüpft mit vkgfyfqxyhnokdwyqotl (fragt nach dem DB-Passwort)
pnpm db:push                   # spielt alle Migrationen + Beispieldaten ein
```

Danach im Supabase-Dashboard:

1. **Authentication → Sign In / Providers → Email:** «Confirm email» **ausschalten**. Sonst verschickt Supabase echte Bestätigungs-Mails, und die Registrierung bleibt hängen.
2. **Authentication → URL Configuration:** als Site URL `http://localhost:5173` eintragen.

### App starten

```bash
cp .env.example .env.local        # dann den anon / publishable Key eintragen (Project Settings → API)
pnpm dev                       # http://localhost:5173
```

> In `.env.local` gehört nur der **anon/publishable** Key. Den `service_role` Key nie ins Frontend oder ins Repo legen.

### Weitere Befehle

| Befehl | Zweck |
|---|---|
| `pnpm test` | Unit-Tests der Fachlogik (Vitest) |
| `pnpm typecheck` | TypeScript-Prüfung |
| `pnpm lint` | Linting (oxlint) |
| `pnpm build` | Produktions-Build nach `dist/` |
| `pnpm db:types` | Datenbanktypen aus dem verknüpften Projekt neu generieren |
| `./db-tests/run.sh` | RLS-/Workflow-Tests gegen ein lokales Postgres 16 (siehe Datei) |

---

## 2. Demo-Zugänge und Rollenwechsel

Unten rechts gibt es den Knopf **«Demo-Hilfe»** – lokal (`pnpm dev`) immer, auf der Online-Version erst nach einmaligem Aufruf mit `?demo=1` (z. B. `https://…/?demo=1`; `?demo=0` blendet sie wieder aus). Damit:

- **Rolle wechseln:** «Öffentliche Ansicht» (Suchende) oder eine der vier Beispiel-Organisationen, mit einem Klick
- **Eigene Links öffnen:** Anfragen und Verlustmeldungen, die in diesem Browser gesendet wurden
- **Demo zurücksetzen:** stellt die Beispieldaten wieder her und löscht neu registrierte Organisationen und Konten

| Organisation | Art | Login | Passwort |
|---|---|---|---|
| Berufsbildungszentrum Seetal | Schule | `lea.brunner@bbz-seetal.example` | `demo1234` |
| Fundbüro Stadt Lindenau | Fundbüro | `marco.keller@lindenau.example` | `demo1234` |
| Nordwind Logistik AG | Unternehmen | `sara.huber@nordwind-logistik.example` | `demo1234` |
| Regionalverkehr Seetal | Unternehmen (ÖV) | `luca.ammann@regionalverkehr-seetal.example` | `demo1234` |

Alle Personen, Organisationen und Adressen sind erfunden. Was in den Beispieldaten steckt (31 Gegenstände, alle Status, Anfragen, Verlustmeldungen) und welche Daten welche Nutzertest-Aufgabe abdecken, steht in [`docs/TESTDATEN.md`](docs/TESTDATEN.md).

---

## 3. Funktionen

**Suchende (ohne Konto)**
- Startseite mit Suche und Einstieg für Organisationen
- Globale Suche über alle Fundstellen mit Suchbegriff, Kategorie, Farbe, Organisation und Zeitraum. Die Filter stehen in der URL und lassen sich zurücksetzen. Ohne Treffer erscheint ein hilfreicher Hinweis.
- Öffentliche Seite pro Organisation (`/o/<slug>`) mit eigenem Fundkatalog
- Öffentliche Detailansicht **ohne** interne Merkmale und ohne Aufbewahrungsort
- Rückgabe anfragen (Name, Kontakt, Nachricht, Eigentumsnachweis). Danach gibt es eine Bestätigung und eine Statusseite über einen geheimen Link.
- Verlust melden, an eine Organisation oder mit «Weiss nicht» an alle. Danach erscheint sofort eine Liste möglicher Treffer.

**Organisationen**
- Registrierung in 4 Schritten: Konto → Organisation → Fundstelle → Fertig, mit Link zur öffentlichen Seite
- Verwaltungsübersicht mit Zahlen, Statusfilter, Kategorie und Suche (auch in internen Angaben)
- Gegenstand erfassen und bearbeiten. Öffentliche und interne Angaben sind getrennt. Optional mit Foto (wird verkleinert). Die Fundnummer `KÜRZEL-JAHR-0001` vergibt die Datenbank automatisch.
- Interne Detailansicht mit Statuswechsel (Verfügbar / Reserviert / Zurückgegeben)
- Anfragen prüfen: Der Eigentumsnachweis steht direkt neben dem internen Merkmal. Anfragen lassen sich bestätigen (mit Abholhinweisen) oder ablehnen. Nach der Übergabe wird der Gegenstand als zurückgegeben markiert.
- Verlustmeldungen mit Treffern aus dem eigenen Bestand. Die betroffene Person lässt sich per E-Mail benachrichtigen.
- Postausgang mit allen Nachrichten und ihrem Versandstatus
- E-Mail-Versand über Resend (optional, siehe Abschnitt «E-Mail-Versand einrichten»)
- Angaben der Fundstelle bearbeiten

**Fachliche Regeln** (in der Datenbank erzwungen, nicht nur im Frontend)
- Eine Anfrage ändert den Status **nicht**. Erst eine Bestätigung reserviert den Gegenstand.
- Pro Gegenstand ist höchstens eine Anfrage gleichzeitig bestätigt.
- «Verfügbar» ist nicht möglich, solange eine bestätigte Anfrage besteht.
- «Zurückgegeben» schliesst die bestätigte Anfrage ab. Andere offene Anfragen bleiben offen und müssen bewusst abgelehnt werden.
- Abgleich Verlustmeldung ↔ Fund: gleiche Kategorie, Funddatum 0–30 Tage nach dem Verlust, Rangfolge nach Farbe (+2) und gemeinsamen Stichworten (+1). Das sind nur Vorschläge.
- Der öffentliche Katalog zeigt nur Gegenstände, die als «öffentlich» markiert und nicht zurückgegeben sind.

---

## 4. E-Mail-Versand einrichten (optional)

Ohne diese Schritte funktioniert alles wie bisher, Nachrichten erscheinen dann nur im Postausgang.

**Ablauf:** Neue Nachricht in `simulated_emails` → Datenbank-Trigger (pg_net) → Edge Function `send-email` → Resend → Status `versendet` oder `fehlgeschlagen` im Postausgang.

1. Konto bei [resend.com](https://resend.com) anlegen und einen **API-Key** erstellen.
   - Ohne eigene Domain gehen Mails nur an die Adresse deines Resend-Kontos. Absender ist dann `onboarding@resend.dev`.
   - Für beliebige Empfänger unter *Domains* eine eigene Domain verifizieren (DNS-Einträge). Absender ist dann z. B. `noreply@eure-domain.ch`.
2. Ein zufälliges Webhook-Secret erzeugen: `openssl rand -hex 32`
3. Secrets für die Function setzen und sie deployen:
   ```bash
   pnpm exec supabase secrets set \
     RESEND_API_KEY=re_xxx \
     EMAIL_FROM="lostandfound <onboarding@resend.dev>" \
     EMAIL_WEBHOOK_SECRET=<secret aus Schritt 2> \
     APP_URL=http://localhost:5173
   pnpm fn:deploy
   ```
4. Im Supabase-Dashboard unter *SQL Editor* einmal ausführen (gleiches Secret wie oben):
   ```sql
   select vault.create_secret('https://vkgfyfqxyhnokdwyqotl.supabase.co/functions/v1/send-email', 'email_function_url');
   select vault.create_secret('<secret aus Schritt 2>', 'email_webhook_secret');
   ```
5. Testen: öffentlich eine Rückgabe anfragen und als Kontakt die eigene E-Mail-Adresse angeben. Im Postausgang der Organisation steht danach «E-Mail versendet». Bei «Versand fehlgeschlagen» steht der Grund direkt unter der Nachricht. Logs gibt es unter *Edge Functions → send-email → Logs*.

Versand wieder ausschalten: `select vault.delete_secret(id) from vault.secrets where name = 'email_function_url';` (oder im Dashboard unter *Vault*).

## 4b. KI-Funktionen einrichten (optional)

Ohne Key funktioniert alles wie bisher, die KI-Knöpfe melden dann «Die KI ist nicht eingerichtet».

**Ablauf:** Browser → Edge Function `ai` → KI-Anbieter (OpenAI-kompatible API). Der API-Key liegt nur als Supabase-Secret auf dem Server, nie im Frontend.

| Funktion | Wo | Wer |
|---|---|---|
| Fund-Assistent (Chat, findet echte Funde per Tool Calling) | Schaltfläche «Fragen?» unten rechts | alle |
| KI-Schalter im Suchfeld: ergänzt die normalen Treffer um anders beschriebene Gegenstände (mit Einschätzung und Begründung) | Suche, Seite einer Fundstelle | alle |
| «Formular ausfüllen»: Freitext → Felder | Verlust melden | alle |
| «Beschreibung vorschlagen» | Fundgegenstand erfassen/bearbeiten | Mitarbeitende |
| «Text formulieren»: Abholhinweise / Ablehnung | Anfrage bestätigen/ablehnen | Mitarbeitende |
| «KI-Abgleich»: Verlustmeldung ↔ Funde mit Einschätzung und Begründung | Statusseite der Verlustmeldung, Verlustmeldungen, Gegenstand-Detail | alle / Mitarbeitende |
| «Angaben aus Foto erkennen» inkl. Warnung bei sichtbaren persönlichen Angaben | Fundgegenstand erfassen/bearbeiten | Mitarbeitende |

**Datenschutz:** Interne Angaben (Erkennungsmerkmal, Lagerort, interne Notiz) sowie Namen und Kontaktdaten von Suchenden werden nie an die KI geschickt. Der Chat liest nur den öffentlichen Katalog und kann nichts verändern. Ergebnisse der KI sind immer Vorschläge, die ein Mensch prüft.

**KI-Abgleich:** Ergänzt die feste Regel (`matching.ts`). Kandidaten sind alle Funde im selben Zeitfenster (0–30 Tage nach dem Verlust, gleiche Organisation bzw. «Weiss nicht»), auch mit anderer Kategorie – höchstens 20 pro Abgleich. Die KI bewertet jeden Kandidaten mit 0–100 und einer kurzen Begründung; angezeigt wird ab 50.

**Rate-Limit:** 20 KI-Anfragen pro 5 Minuten und IP (Mitarbeitende: 40 pro Konto), gezählt in der Tabelle `ai_requests` (IP nur als Hash). Die harte Kostengrenze bleibt das Guthaben beim Anbieter.

1. API-Key beim Anbieter erstellen und Guthaben bzw. ein Ausgabenlimit setzen.
2. Secrets setzen (Beispiel DeepSeek; `AI_BASE_URL` und `AI_MODEL` sind optional, Standard ist DeepSeek):
   ```bash
   pnpm exec supabase secrets set \
     AI_API_KEY=sk-xxx \
     AI_BASE_URL=https://api.deepseek.com \
     AI_MODEL=deepseek-flash
   pnpm exec supabase db push    # Migration für das Rate-Limit (ohne Beispieldaten neu einzuspielen)
   pnpm fn:deploy:ai
   ```
   Optional `AI_VISION_MODEL`, falls für Fotos ein anderes Modell nötig ist (Standard: wie `AI_MODEL`). Unterstützt das Modell keine Bilder, meldet «Angaben aus Foto erkennen» das direkt.
   Andere Anbieter, nur `AI_BASE_URL` und `AI_MODEL` ändern: OpenAI `https://api.openai.com/v1`, Google Gemini `https://generativelanguage.googleapis.com/v1beta/openai`, Groq `https://api.groq.com/openai/v1`.
3. Lokal testen (optional): Werte in `supabase/functions/.env` eintragen (wird nicht committet) und `pnpm exec supabase functions serve ai` starten.
4. Logs: Supabase-Dashboard → *Edge Functions → ai → Logs*.

## 5. Einschränkungen

- **E-Mails:** Alle Nachrichten landen in der Tabelle `simulated_emails` (Postausgang und Statusseiten). Echt versendet werden sie nur, wenn der Versand eingerichtet ist. Erfundene Test-Adressen (`@example.com`, `*.example`) und Telefonnummern werden nie angeschrieben, deshalb verschicken auch die Beispieldaten keine Mails.
- **Resend ohne eigene Domain** stellt nur an die E-Mail-Adresse des Resend-Kontos zu. Andere Empfänger brauchen eine bei Resend verifizierte Domain.
- **Demo-Hilfe** (Rollenwechsel, Reset) ist eine Präsentationshilfe und keine Funktion der echten Plattform. `reset_demo()` kann **jede Person** mit Zugriff auf die Seite aufrufen. Das ist für einen öffentlichen Betrieb ungeeignet.
- **Demo-Passwort** `demo1234` ist bewusst öffentlich. Die Anmeldung selbst läuft über Supabase Auth (Passwörter gehasht bei Supabase, nicht bei uns). Trotzdem ist dies **keine** geprüfte, sichere Benutzerverwaltung. Bitte keine echten Personendaten und kein privates Passwort verwenden.
- **Eine Fundstelle pro Organisation** und eine Organisation pro Konto. Mitarbeitende einladen oder mehrere Standorte gibt es nicht.
- **Statuslinks** (Anfrage/Meldung) funktionieren über einen geheimen Link (UUID). Wer den Link hat, sieht den Status. Konten für Suchende gibt es nicht.
- **Suche** filtert im Browser. Das genügt für Demo-Datenmengen, aber nicht für tausende Gegenstände.
- **Fotos** liegen in einem öffentlichen Storage-Bucket. Wer die URL kennt, kann das Bild ansehen, auch bei nicht öffentlichen Gegenständen. Beim Demo-Reset werden hochgeladene Fotos nicht gelöscht.
- **Keine** Aufbewahrungsfristen, keine Übergabe-Quittung, keine Ausweisprüfung im System.
- **Bilder der Beispieldaten** sind gezeichnete Studiobilder (keine echten Fotos), erzeugt mit `scripts/demo-photos/generate.py` und als statische Dateien in `public/demo-photos/` abgelegt (`photo_path = demo/<datei>`). Fünf Beispielgegenstände haben bewusst kein Bild – dort erscheint die Illustration der Kategorie.

---

## 6. Projektstruktur

```
supabase/
  migrations/      Schema, RLS, RPC-Funktionen, Storage, Demo-Daten/Reset
  functions/       Edge Function send-email (Resend)
  seed.sql         ruft seed_demo_data() auf
db-tests/          SQL-Tests (RLS, Workflow) gegen lokales Postgres
scripts/
  demo-photos/     Generator für die Bilder der Beispieldaten (einmalig, nicht Teil des Builds)
public/
  demo-photos/     Bilder der Beispieldaten
src/
  domain/          reine Fachlogik + Typen (Abgleich, Filter, Statusregeln) – mit Vitest-Tests
  services/        Datenzugriff auf Supabase (einzige Stelle mit supabase-Aufrufen)
  features/
    public/        Startseite, Suche, Org-Seite, Details, Anfrage, Verlustmeldung, Statusseiten
    auth/          Anmeldung, Registrierung
    admin/         Verwaltung (Gegenstände, Anfragen, Meldungen, Postausgang, Fundstelle)
    demo/          Demo-Hilfe (Rollenwechsel, Reset)
  components/      UI-Bausteine (ui/), Gegenstands-Komponenten (items/), Layouts
  app/             Router, Auth-Kontext, Schutz der Verwaltung
  lib/             Supabase-Client, Env, Query-Keys, DB-Typen
```

**Datenmodell:** `organisations` 1–1 `found_offices` · `memberships` (Konto → Organisation) · `found_items` (öffentlich) 1–1 `found_item_internal` (intern) · `return_requests` · `loss_reports` · `simulated_emails`

**Trennung der Organisationen:** Row Level Security. Jede Abfrage der Verwaltung ist auf `current_organisation_id()` beschränkt. Interne Angaben liegen in einer eigenen Tabelle, die anonyme Personen gar nicht lesen dürfen. Für `found_items` haben sie zusätzlich nur Rechte auf die öffentlichen Spalten.

---

Hinweise zur Präsentation, zu Nutzertests und zum KI-Einsatz: siehe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
