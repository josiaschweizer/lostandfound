# Übergabe – Präsentation, Nutzertests, KI-Deklaration

## Präsentation (ca. 3 Minuten)

Vorbereitung: Demo zurücksetzen (Demo-Hilfe → «Demo zurücksetzen»), dann Startseite öffnen.

| Zeit | Schritt | Was zeigen / sagen |
|---|---|---|
| 0:00 | **Problem** | «Personen wissen nicht, wo ihr Gegenstand abgegeben wurde. Fundstellen beantworten immer wieder dieselben Nachfragen.» Startseite: eine Suche über alle Fundstellen. |
| 0:20 | **Organisation registrieren** | «Organisation registrieren» → Konto, Organisation, Fundstelle → «Fertig» mit eigener öffentlicher Seite. |
| 0:50 | **Fund erfassen** | «Fundgegenstand erfassen»: öffentliche Angaben oben, **interne Merkmale** unten (orange). Speichern → Fundnummer wird vergeben. |
| 1:20 | **Suchen** | Demo-Hilfe → «Öffentliche Ansicht». Suche nach dem Begriff, Filter Organisation/Farbe. Detailansicht: Das interne Merkmal ist **nicht** sichtbar. |
| 1:50 | **Rückgabe anfragen** | Formular mit Eigentumsnachweis → Bestätigung + Statusseite mit simulierter E-Mail. |
| 2:15 | **Anfrage bearbeiten** | Demo-Hilfe → zurück zur eigenen Organisation (oder Login). Anfragen → Nachweis neben internem Merkmal → «Bestätigen» → «Übergabe erfolgt». |
| 2:40 | **Trennung + Abschluss** | Demo-Hilfe → «Berufsbildungszentrum Seetal»: Keine fremden Daten zu sehen. Optional: Verlustmeldungen mit «Weiss nicht». Fazit. |

Tipp: Wer weniger Zeit hat, überspringt die Registrierung und startet direkt mit dem Demo-Zugang «Berufsbildungszentrum Seetal».

## Drei Aufgaben für Nutzertests

1. **Suchende:** «Sie haben vor ein paar Tagen im Stadtpark Ihr grünes Smartphone verloren. Finden Sie heraus, ob es abgegeben wurde, und fragen Sie die Rückgabe an.»
   *Beobachten:* Findet die Person Suche und Filter? Versteht sie, was ein «besonderes Merkmal» ist? Bemerkt sie die Bestätigung und den Statuslink?
2. **Mitarbeitende (Demo-Zugang Fundbüro Stadt Lindenau):** «Für den schwarzen Rucksack gibt es zwei Anfragen. Entscheiden Sie, wem er gehört, und schliessen Sie die Rückgabe ab.»
   *Beobachten:* Wird das interne Merkmal zum Vergleichen genutzt? Ist klar, dass erst «Übergabe erfolgt» den Gegenstand zurückgibt? Was passiert mit der zweiten Anfrage?
3. **Organisation:** «Registrieren Sie Ihre Schule als neue Fundstelle und erfassen Sie eine gefundene Jacke so, dass nur Sie den Namen im Kragen sehen.»
   *Beobachten:* Ist der Registrierungsablauf klar? Wird die Trennung öffentlich/intern verstanden? Findet die Person ihre öffentliche Seite?

Nach jeder Aufgabe kurz fragen: «Was war unklar?», «Was haben Sie erwartet, das nicht passiert ist?»

## KI-Einsatz (Deklaration)

Erstellt mit Claude (Anthropic) in einer Cowork-Sitzung am 22.10.2026. Grundlage war unser schriftlicher Auftrag. Rückfragen zu Name, Suchmodus, Verlustmeldung, Technik, Sichtbarkeit von Meldungen, Abgleichsregel und Supabase hat das Team beantwortet.

**Von Claude erstellt:**
- Projekt-Setup (Vite, TypeScript, Tailwind, Linting, Tests) und gesamte Ordnerstruktur
- Supabase-Migrationen: Datenmodell, Row Level Security, RPC-Funktionen (Registrierung, Anfragen, Statuswechsel, Verlustmeldungen, simulierte E-Mails), Storage-Policies, Beispieldaten und Demo-Reset
- Sämtlicher Frontend-Code (Seiten, Komponenten, Formulare mit Validierung, Datenzugriff)
- Fachlogik als reine Funktionen (Abgleich, Filter, Statusregeln) mit Unit-Tests
- Erfundene Beispieldaten (Organisationen, Personen, Gegenstände)
- Diese Dokumentation (README, Präsentationsablauf, Testaufgaben)

**Vom Team vorgegeben bzw. entschieden:** Auftrag, Anforderungen und Abnahmekriterien, Plattformname, Suchmodus (global + pro Organisation), Verlustmeldung mit Abgleich, Technikwahl (React/TypeScript/Tailwind, Supabase mit Migrationen), Sichtbarkeitsregel «Weiss nicht» → alle Organisationen, Abgleichsregel.

**Von Claude angenommen** (kleine, reversible Gestaltungsentscheide): Farbpalette und Layout, Format der Fundnummer, Katalog zeigt «Reserviert» weiterhin an und blendet «Zurückgegeben» aus, Schalter «öffentlich sichtbar», nach der Rückgabe bleiben offene Anfragen bestehen.

**Von Claude durchgeführte Prüfungen** (in seiner Arbeitsumgebung, nicht gegen euer Supabase-Projekt):
- 17 Unit-Tests der Fachlogik (Vitest) – bestanden
- 67 SQL-Prüfungen der Migrationen gegen Postgres 16 mit nachgebildetem Supabase-Schema (`db-tests/`): Organisationstrennung, öffentliche/interne Daten, Statusregeln, Registrierung, Reset – bestanden
- Ein automatisierter Browser-Durchlauf (Playwright) des gesamten Kernablaufs gegen eine lokale Nachbildung von Supabase (Postgres 16 + Supabase Auth v2.180 + PostgREST v12). Geprüft wurden Registrierung, Erfassen und Bearbeiten, Suche und Filter, Anfrage, Bestätigen, Rückgabe, Organisationswechsel, Verlustmeldung mit Treffer, Mobile-Ansicht und Reset – bestanden. **Nicht** geprüft: Foto-Upload (Supabase Storage war in der Nachbildung nicht verfügbar) und der Betrieb auf dem echten gehosteten Projekt.

Keine dieser Prüfungen ersetzt eure eigenen Nutzertests. Testergebnisse mit Personen liegen noch keine vor.
