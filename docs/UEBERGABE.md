# Übergabe und Präsentation

Stand: 06.11.2026 · Umfang: Must M1–M10, S1 (KI-Ausfüllhilfe), S2 (KI-Treffer), S3 (KI-Suche) und C1 (Foto-Vorschlag) aus [`KONZEPT_M245.md`](KONZEPT_M245.md).

## Vor der Präsentation (Checkliste)

1. **Supabase aufwecken:** Gratis-Projekte pausieren nach einigen Tagen ohne Zugriff. Am Vortag im Dashboard prüfen und die App einmal öffnen.
2. `pnpm dev` starten → http://localhost:5173 (oder die gehostete URL).
3. Als Admin anmelden (unten) → **Übersicht → «Demo zurücksetzen»**. Danach sind alle Beispieldaten frisch.
4. KI prüfen: Auf «Verlust melden» erscheint das Feld «In eigenen Worten beschreiben», beim Fund-Erfassen der Satz
   «Mit Foto schlägt die KI … vor». Fehlt beides, ist die KI aus (kein `AI_API_KEY`). Einmal durchspielen – die erste Antwort dauert manchmal ein paar Sekunden.
   Notlösung ohne Schlüssel: `supabase secrets set AI_PROVIDER=mock`. Der Mock arbeitet mit einfachen Regeln
   (Foto → immer «Rucksack») und ist für Tests gedacht – für die Präsentation die echten Schlüssel verwenden.
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

## Ablauf «Höhle der Löwen» (ca. 7 Minuten)

**1 · Das Problem (30 s).** «Jede Schule hat eine Fundkiste. Niemand schaut hinein, nach drei Monaten wird alles entsorgt.
Wer etwas sucht, muss vorbeigehen oder anrufen – und weiss nicht einmal, ob es abgegeben wurde.»

**2 · Suchen ohne Konto (60 s) – Handy-Ansicht.**
- Startseite: drei klare Einstiege, keine Anmeldung, kein Menü-Suchen.
- Suchfeld: `airpods` → unter «Ähnliche Gegenstände – auch gesucht nach: Kopfhörer, Ohrhörer …» erscheinen die «Kabellose Ohrhörer», obwohl das Wort nirgends steht (Synonyme).
- **KI-Suche:** `Ding für Musik` → die normale Suche findet nichts, die KI ergänzt «Kopfhörer, Ohrhörer …» und zeigt die Treffer mit «Vorschlag mit KI». So sucht man, wenn man das richtige Wort nicht kennt.
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
- Absenden → persönlicher Link mit Treffern. Darunter: «Die KI sucht nach weiteren passenden Funden …» – KI-Treffer kommen ohne Knopf dazu.

**6 · Fund erfassen per Foto (45 s) – Handy oder Desktop.**
- «Fund erfassen» → «Foto aufnehmen oder wählen» (z. B. einen Rucksack oder eine Jacke fotografieren).
- Die KI füllt Titel, Kategorie, Farbe und Beschreibung vor («bitte prüfen»). Nur noch Fundort und Aufbewahrungsort ergänzen → Speichern.
- Sofort: passende Verlustmeldungen; die KI prüft im Hintergrund weitere. «Suchende Person benachrichtigen» → Postausgang.
- Sicherheit: Erkennt die KI einen Ausweis, schaltet sie «Öffentlich sichtbar» aus.

**7 · Was Regeln nicht finden (45 s) – Desktop.**
- «Meldungen» → **«Blauer Turnsack»** (Kategorie Sport, Wörter «Turnsack», «Hallenschuhe»). Die Regeln finden nichts, weil der Fund
  als «Turnbeutel» unter «Taschen & Rucksäcke» erfasst ist.
- Die KI schlägt den **Turnbeutel** vor – mit Begründung und Prozentwert, gekennzeichnet als «Vorschlag mit KI». Entscheiden tut der Mensch.
- Zurück zur **Übersicht**: Die Kachel «KI-Unterstützung» zählt «Treffer nur dank KI» und «Formulare mit KI ausgefüllt».

**8 · Abschluss (30 s).** Mandantenfähig (jede Fundstelle sieht nur ihre Daten), Datenschutz eingebaut
(Merkmale bleiben intern, Kontaktdaten werden 90 Tage nach Abschluss gelöscht, an die KI gehen nie Kontaktdaten).
KI überall dort, wo sie Arbeit spart – aber jede Funktion hat einen Weg ohne KI, und über das Eigentum entscheidet immer ein Mensch.

### Weitere Beispiele in den Demo-Daten

- **Zwei Anfragen auf denselben Rucksack** (Tierpark): eine passt (Fuchs-Anhänger, grünes Notizbuch), eine nicht.
- **Offene Anfrage** an der Berufsschule: grauer Deuter-Rucksack (Lea Brunner) – gut zum Bestätigen.
- **Verlustmeldung «Weiss nicht»** (Schwarzer Rucksack, Tierpark oder Bus): alle Fundstellen sehen sie.
- **Nicht öffentlich** erfasste Wertsachen (z. B. Portemonnaie im Hotel) erscheinen nur in der Verwaltung.
- Der Finder-Weg: «Gefunden?» → Fundstelle wählen → Abgabeort und Öffnungszeiten, ohne Anmeldung.

## Tests (Stand der Übergabe)

| Ebene | Anzahl | Befehl |
| --- | --- | --- |
| SQL-Checks (RLS, Token, Matching-Testfälle 6.6, Limits, Reset, E-Mail, KI-Kontext, KI-Treffer, Cache) | 117 | `pnpm db:check` |
| Unit (Vitest) | 20 | `pnpm test` |
| Edge Functions (Deno) | 21 | `pnpm fn:test` |
| E2E (Playwright, je 360 px und 1280 px, inkl. axe und KI mit Mock) | 82 | `pnpm test:e2e` |

## Bekannte Grenzen

- **E-Mails:** Ohne Resend-Einrichtung werden keine echten E-Mails verschickt. Der Postausgang zeigt alles, was verschickt würde,
  inklusive der persönlichen Links – praktisch für die Demo, in einem echten Betrieb müsste das Team diese Links ausblenden.
- **Fotos** liegen in einem öffentlichen Storage-Bucket mit zufälligen Dateinamen. Keine Fotos von Personen oder Ausweisen hochladen.
- **KI (DeepSeek, Server in China):** Es gehen nur Angaben zum Gegenstand hin (Titel, Kategorie, Farbe, Marke, öffentliche Beschreibung,
  Ort, Datum) – nie Kontaktdaten, interne Merkmale oder Notizen; E-Mail-Adressen, Telefon- und Kontonummern werden vorher entfernt.
  IDs werden durch Kurzzeichen ersetzt, die Antwort wird gegen die Kandidatenliste geprüft. Max. 20 Aufrufe pro Stunde und Gerät,
  Tageslimit gesamt (`AI_DAILY_LIMIT`), Protokoll ohne Inhalte.
- **Foto-Vorschlag:** Das Foto geht verkleinert (768 px) an DeepSeek (`deepseek-flash`). Keine Fotos von Personen oder Ausweisen.
- **KI-Treffer** werden berechnet, wenn eine Meldung oder ein Fund gespeichert bzw. in der Verwaltung geöffnet wird – nicht laufend
  für alle Daten. Suchende sehen sie ab 60 %, Fundstellen ab 40 %.
- **Nicht umgesetzt (Should/Could):** automatische E-Mail bei neuen Funden (S4), «Freundlicher formulieren» (draft_reply),
  Hilfe-Assistent (C2).
- **«Demo zurücksetzen»** löscht alle Daten aller Fundstellen. Vor einem echten Einsatz entfernen (Migration `…_demo.sql`).
- Die Fundnummern (`BSM-2026-0006`) sind erratbar; unter `/fund/…` sind aber nur öffentliche Funde abrufbar.
