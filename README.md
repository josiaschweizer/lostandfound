# lostandfound – Prototyp einer Lost-&-Found-Plattform

Schulprojekt M241. Organisationen (Schulen, Fundbüros, Unternehmen) registrieren sich, verwalten ihre eigene Fundstelle und erfassen Fundgegenstände. Suchende finden Gegenstände ohne Konto, fragen eine Rückgabe an oder melden einen Verlust.

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query · react-hook-form + zod · Supabase (Postgres, Auth, Storage, RLS) · Vitest

---

## 1. Starten

### Voraussetzungen
- Node.js 20 oder neuer
- pnpm 9 oder neuer (z. B. `brew install pnpm`)
- Supabase CLI (`pnpm install` installiert sie lokal als Dev-Abhängigkeit)
- Zugriff auf das Supabase-Projekt `hfwykjvplojbetwzpyvu`

### Einmalig: Datenbank einrichten

```bash
pnpm install
pnpm exec supabase login                # Browser-Login bei Supabase
pnpm db:link                   # verknüpft mit hfwykjvplojbetwzpyvu (fragt nach dem DB-Passwort)
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

Unten rechts auf jeder Seite gibt es den Knopf **«Demo-Hilfe»**. Damit:

- **Rolle wechseln:** «Öffentliche Ansicht» (Suchende) oder eine der drei Beispiel-Organisationen, mit einem Klick
- **Eigene Links öffnen:** Anfragen und Verlustmeldungen, die in diesem Browser gesendet wurden
- **Demo zurücksetzen:** stellt die Beispieldaten wieder her und löscht neu registrierte Organisationen und Konten

| Organisation | Art | Login | Passwort |
|---|---|---|---|
| Berufsbildungszentrum Seetal | Schule | `lea.brunner@bbz-seetal.example` | `demo1234` |
| Fundbüro Stadt Lindenau | Fundbüro | `marco.keller@lindenau.example` | `demo1234` |
| Nordwind Logistik AG | Unternehmen | `sara.huber@nordwind-logistik.example` | `demo1234` |

Alle Personen, Organisationen und Adressen sind erfunden.

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
- Verlustmeldungen mit Treffern aus dem eigenen Bestand. Die betroffene Person lässt sich benachrichtigen (simuliert).
- Postausgang (simulierte E-Mails)
- Angaben der Fundstelle bearbeiten

**Fachliche Regeln** (in der Datenbank erzwungen, nicht nur im Frontend)
- Eine Anfrage ändert den Status **nicht**. Erst eine Bestätigung reserviert den Gegenstand.
- Pro Gegenstand ist höchstens eine Anfrage gleichzeitig bestätigt.
- «Verfügbar» ist nicht möglich, solange eine bestätigte Anfrage besteht.
- «Zurückgegeben» schliesst die bestätigte Anfrage ab. Andere offene Anfragen bleiben offen und müssen bewusst abgelehnt werden.
- Abgleich Verlustmeldung ↔ Fund: gleiche Kategorie, Funddatum 0–30 Tage nach dem Verlust, Rangfolge nach Farbe (+2) und gemeinsamen Stichworten (+1). Das sind nur Vorschläge.
- Der öffentliche Katalog zeigt nur Gegenstände, die als «öffentlich» markiert und nicht zurückgegeben sind.

---

## 4. Simulierte Funktionen und Einschränkungen

- **E-Mails werden nie versendet.** Sie landen in der Tabelle `simulated_emails` und erscheinen als «Simulierte E-Mail» im Postausgang und auf den Statusseiten.
- **Demo-Hilfe** (Rollenwechsel, Reset) ist eine Präsentationshilfe und keine Funktion der echten Plattform. `reset_demo()` kann **jede Person** mit Zugriff auf die Seite aufrufen. Das ist für einen öffentlichen Betrieb ungeeignet.
- **Demo-Passwort** `demo1234` ist bewusst öffentlich. Die Anmeldung selbst läuft über Supabase Auth (Passwörter gehasht bei Supabase, nicht bei uns). Trotzdem ist dies **keine** geprüfte, sichere Benutzerverwaltung. Bitte keine echten Personendaten und kein privates Passwort verwenden.
- **Eine Fundstelle pro Organisation** und eine Organisation pro Konto. Mitarbeitende einladen oder mehrere Standorte gibt es nicht.
- **Statuslinks** (Anfrage/Meldung) funktionieren über einen geheimen Link (UUID). Wer den Link hat, sieht den Status. Konten für Suchende gibt es nicht.
- **Suche** filtert im Browser. Das genügt für Demo-Datenmengen, aber nicht für tausende Gegenstände.
- **Fotos** liegen in einem öffentlichen Storage-Bucket. Wer die URL kennt, kann das Bild ansehen, auch bei nicht öffentlichen Gegenständen. Beim Demo-Reset werden hochgeladene Fotos nicht gelöscht.
- **Keine** Aufbewahrungsfristen, keine Übergabe-Quittung, keine Ausweisprüfung im System.
- **Seed-Fotos:** Beispielgegenstände haben keine Fotos. Stattdessen erscheint eine Illustration der Kategorie.

---

## 5. Projektstruktur

```
supabase/
  migrations/      Schema, RLS, RPC-Funktionen, Storage, Demo-Daten/Reset
  seed.sql         ruft seed_demo_data() auf
db-tests/          SQL-Tests (RLS, Workflow) gegen lokales Postgres
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
