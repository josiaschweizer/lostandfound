# Übergabe und Präsentation

Stand: 05.11.2026 · Umfang: Must M1–M10 und S1 (KI-Ausfüllhilfe) aus [`KONZEPT_M245.md`](KONZEPT_M245.md).

## Vor der Präsentation (Checkliste)

1. **Supabase aufwecken:** Gratis-Projekte pausieren nach einigen Tagen ohne Zugriff. Am Vortag im Dashboard prüfen und die App einmal öffnen.
2. `pnpm dev` starten → http://localhost:5173 (oder die gehostete URL).
3. Als Admin anmelden (unten) → **Übersicht → «Demo zurücksetzen»**. Danach sind alle Beispieldaten frisch.
4. KI prüfen: Auf «Verlust melden» erscheint das Feld «In eigenen Worten beschreiben». Fehlt es, ist die KI aus
   (kein `AI_API_KEY`). Notlösung ohne Schlüssel: `supabase secrets set AI_PROVIDER=mock` – der Mock versteht
   einfache Sätze wie im Ablauf unten.
5. Zwei Browserfenster vorbereiten: links **Handy-Ansicht** (DevTools → 360 px) für Suchende, rechts **Desktop** für die Fundstelle.

## Demo-Zugänge (Passwort für alle: `demo1234`)

Auf der Anmeldeseite gibt es dafür Knöpfe – Eintippen ist nicht nötig. Erreichbar über den Footer-Link «Für Fundstellen».

| Fundstelle | Kürzel | Admin | Mitarbeitende |
| --- | --- | --- | --- |
| Berufsschule Musterstadt | BSM | sandra.keller@bs-musterstadt.example | marco.huber@bs-musterstadt.example |
| Tierpark Sonnenberg | TPS | lea.frei@tierpark-sonnenberg.example | nico.baumann@tierpark-sonnenberg.example |
| Hotel Bergblick | HBB | claudia.roth@hotel-bergblick.example | jonas.weber@hotel-bergblick.example |
| Kulturhaus am Platz | KAP | elena.rossi@kulturhaus-am-platz.example | tim.meier@kulturhaus-am-platz.example |

Admins können zusätzlich das Fundstellen-Profil bearbeiten und die Demo zurücksetzen.

## Ablauf «Höhle der Löwen» (ca. 6 Minuten)

**1 · Das Problem (30 s).** «Jede Schule hat eine Fundkiste. Niemand schaut hinein, nach drei Monaten wird alles entsorgt.
Wer etwas sucht, muss vorbeigehen oder anrufen – und weiss nicht einmal, ob es abgegeben wurde.»

**2 · Suchen ohne Konto (60 s) – Handy-Ansicht.**
- Startseite: drei klare Einstiege, keine Anmeldung, kein Menü-Suchen.
- Suchfeld: `airpods` → unter «Ähnliche Gegenstände – auch gesucht nach: Kopfhörer, Ohrhörer …» erscheinen die «Kabellose Ohrhörer», obwohl das Wort nirgends steht (Synonyme).
- Filter zeigen: Farbe «Weiss», Zeitraum «Letzte 7 Tage». Alles bleibt in der URL, der Link ist teilbar.
- Fund öffnen: Foto, Fundort, **wo und wann abholen**. Interne Merkmale sind nicht sichtbar.

**3 · «Das gehört mir» (45 s).**
- Knopf drücken → «Woran erkennst du ihn?» `Auf dem Etui ist hinten L. K. eingraviert.` → E-Mail, Name → senden.
- Sofort ein persönlicher Link – kein Konto, kein Passwort.

**4 · Die Fundstelle entscheidet (60 s) – Desktop.**
- «Für Fundstellen» → Demo-Knopf **Berufsschule Musterstadt · Admin**.
- Übersicht: «Offene Anfragen» → Anfrage öffnen. Links die Angabe der Person, rechts das **interne Merkmal** «Gravur L. K.» – passt.
- «Bestätigen» → Vorlagetext → senden. Im **Postausgang** steht die E-Mail mit Abholort und Öffnungszeiten.
- Zurück im Handy-Fenster den Link neu laden: «Bestätigt – du kannst den Gegenstand abholen.»
- «Übergabe abschliessen» → der Fund verschwindet aus der öffentlichen Suche.

**5 · Verlust melden mit KI (60 s) – Handy.**
- «Verlust melden» → Feld «In eigenen Worten beschreiben»: `hab gestern meine schwarzen airpods im bus 5 verloren`
- «Felder ausfüllen lassen» → Titel, Kategorie, Farbe, Marke, Ort, Datum sind gesetzt und markiert («bitte prüfen»).
- Ab Schritt 2 erscheinen **mögliche Treffer** mit Begründung («Farbe stimmt», «Zeitlich nah»).
- Absenden → persönlicher Link mit Treffern; die Meldung lässt sich dort auch wieder schliessen.

**6 · Fund erfassen in 30 Sekunden (45 s) – Desktop.**
- «Fund erfassen»: `AirPods` · Elektronik · Weiss · Fundort `Bus Linie 5` · Aufbewahrungsort `Schrank A` → Speichern.
- Sofort: «1 passende Verlustmeldung» (Lina Kunz hatte weisse AirPods gemeldet) → «Suchende Person benachrichtigen» → Postausgang.
- In der Fundliste steht der neue Fund zuoberst; «Abgeholt» geht mit einem Klick, «Rückgängig» ebenso.

**7 · Abschluss (30 s).** Mandantenfähig (jede Fundstelle sieht nur ihre Daten), Datenschutz eingebaut
(Merkmale bleiben intern, Kontaktdaten werden 90 Tage nach Abschluss gelöscht, an die KI gehen nie Kontaktdaten),
funktioniert ohne KI und auf jedem Handy.

### Weitere Beispiele in den Demo-Daten

- **Zwei Anfragen auf denselben Rucksack** (Tierpark): eine passt (Fuchs-Anhänger, grünes Notizbuch), eine nicht.
- **Offene Anfrage** an der Berufsschule: grauer Deuter-Rucksack (Lea Brunner) – gut zum Bestätigen.
- **Verlustmeldung «Weiss nicht»** (Schwarzer Rucksack, Tierpark oder Bus): alle Fundstellen sehen sie.
- **Nicht öffentlich** erfasste Wertsachen (z. B. Portemonnaie im Hotel) erscheinen nur in der Verwaltung.
- Der Finder-Weg: «Gefunden?» → Fundstelle wählen → Abgabeort und Öffnungszeiten, ohne Anmeldung.

## Tests (Stand der Übergabe)

| Ebene | Anzahl | Befehl |
| --- | --- | --- |
| SQL-Checks (RLS, Token, Matching-Testfälle 6.6, Limits, Reset, E-Mail, KI-Limits) | 96 | `pnpm db:check` |
| Unit (Vitest) | 18 | `pnpm test` |
| Edge Functions (Deno) | 15 | `pnpm fn:test` |
| E2E (Playwright, je 360 px und 1280 px, inkl. axe) | 76 | `pnpm test:e2e` |

## Bekannte Grenzen

- **E-Mails:** Ohne Resend-Einrichtung werden keine echten E-Mails verschickt. Der Postausgang zeigt alles, was verschickt würde,
  inklusive der persönlichen Links – praktisch für die Demo, in einem echten Betrieb müsste das Team diese Links ausblenden.
- **Fotos** liegen in einem öffentlichen Storage-Bucket mit zufälligen Dateinamen. Keine Fotos von Personen oder Ausweisen hochladen.
- **KI (DeepSeek):** Server in China. Es geht nur der Freitext aus «In eigenen Worten beschreiben» hin; E-Mail-Adressen,
  Telefon- und Kontonummern werden vorher entfernt. Max. 20 Aufrufe pro Stunde und Gerät, Tageslimit gesamt (`AI_DAILY_LIMIT`).
- **Nicht umgesetzt (Should/Could):** automatische Benachrichtigung bei neuen Funden (S4), KI-Treffer `semantic_match` (S2),
  KI-Synonyme `expand_query` (S3, die lokale Synonymtabelle ist umgesetzt), Foto-Vorschlag (C1), Hilfe-Assistent (C2).
- **«Demo zurücksetzen»** löscht alle Daten aller Fundstellen. Vor einem echten Einsatz entfernen (Migration `…_demo.sql`).
- Die Fundnummern (`BSM-2026-0006`) sind erratbar; unter `/fund/…` sind aber nur öffentliche Funde abrufbar.
