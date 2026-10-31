# Testdaten – Spickzettel für die Testleitung

Alle Daten sind erfunden. Sie stammen aus `supabase/migrations/20261030000008_demo_data_v2.sql`.
Daten sind **relativ zum heutigen Tag** gespeichert («vor 3 Tagen»). Der Abgleich mit dem Zeitfenster von 30 Tagen findet deshalb auch Wochen später noch Treffer.

**Vor jeder Testperson:** Demo-Hilfe → «Demo zurücksetzen» → Startseite öffnen. Online wird die Demo-Hilfe einmalig mit `?demo=1` eingeblendet.
Danach sind alle Gegenstände, Anfragen und Fundnummern wieder im Ausgangszustand. Die IDs der Gegenstände bleiben dabei gleich, Direktlinks funktionieren also weiter.

## Überblick

| | Anzahl | Bemerkung |
|---|---|---|
| Organisationen | 4 | Schule, Fundbüro, Unternehmen, öffentlicher Verkehr |
| Fundgegenstände | 31 | 29 im öffentlichen Katalog, 1 zurückgegeben (ausgeblendet), 1 nur intern |
| mit Bild | 26 | 5 bewusst ohne Bild → Illustration der Kategorie |
| Rückgabeanfragen | 9 | 5 offen, 2 bestätigt, 1 abgelehnt, 1 abgeschlossen |
| Verlustmeldungen | 7 | 3 davon «Weiss nicht, wo verloren» (für alle Organisationen sichtbar) |
| Postausgang | 10 | Bestätigungen, Absage, Hinweise an Fundstellen, Treffer-Hinweis |

Demo-Zugänge (Passwort immer `demo1234`):

| Organisation | Kürzel | Login | Fundstelle |
|---|---|---|---|
| Berufsbildungszentrum Seetal | BZS | `lea.brunner@bbz-seetal.example` | Fundstelle Hauswartung, Raum A012 |
| Fundbüro Stadt Lindenau | FBL | `marco.keller@lindenau.example` | Stadthaus, Schalter 4 |
| Nordwind Logistik AG | NWL | `sara.huber@nordwind-logistik.example` | Empfang Hauptgebäude |
| Regionalverkehr Seetal | RVS | `luca.ammann@regionalverkehr-seetal.example` | Kundencenter Bahnhof Seetal |

## Aufgaben → Daten → erwarteter Weg

| Aufgabe | Passende Beispieldaten | Erwarteter Weg (Erfolg) |
|---|---|---|
| **1 Kopfhörer verloren melden** | Kopfhörer schwarz (BZS, vor 3 Tagen), Ohrhörer weiss (RVS, vor 2 Tagen), Headset schwarz (NWL, vor 12 Tagen) | «Verlust melden» → Formular ausfüllen → absenden. Schon beim Ausfüllen erscheinen passende Funde. Bei «schwarz» steht der schwarze Kopfhörer zuoberst. |
| **2 Schlüssel gefunden melden** | Schlüsselbund (BZS), Veloschlüssel (FBL), Badge-Etui (NWL, nur intern) | Funde erfassen nur Mitarbeitende. Die Startseite zeigt «Etwas gefunden?» → Anmelden. **Entscheiden, ob die Testperson einen Demo-Zugang erhält.** Wenn ja: Demo-Zugang → «Fund erfassen». Wenn nein: «geht zur Anmeldung» notieren – das ist bereits ein Ergebnis. |
| **3 Rucksack suchen** | Rucksack grau (BZS), schwarz (FBL), grün (NWL, reserviert), Turnbeutel blau (RVS) | Suche «Rucksack» → 4 Treffer aus 3 Organisationen. |
| **4 Blaue Jacke filtern** | Jacken in 4 Farben: Regenjacke blau (BZS), Kinderjacke blau (FBL), Daunenjacke rot (FBL), Softshelljacke schwarz (NWL). Dazu weitere blaue Gegenstände (Trinkflasche, Turnbeutel) | Filter Farbe «Blau» → 4 Treffer. Zusätzlich Kategorie «Kleidung» oder Suchwort «Jacke» → 2 Treffer. |
| **5 Details ansehen** | jeder Gegenstand, z. B. Regenjacke blau | Detailseite: Bild, Fundnummer, Fundort, Datum, Fundstelle mit Öffnungszeiten. Interne Merkmale sind **nicht** sichtbar. |
| **6 Smart Matching** | eigene Verlustmeldung aus Aufgabe 1 | Statusseite der eigenen Meldung (Bestätigung nach dem Absenden oder Demo-Hilfe → «In diesem Browser gesendet») → mögliche Treffer, optional KI-Einschätzung. |
| **7 Gegenstand zurückbekommen** | z. B. Kopfhörer schwarz oder Rucksack schwarz | Detailseite → «Rückgabe anfragen» → Kontakt, Nachricht, Eigentumsnachweis → Bestätigung mit Statuslink. |
| **8 KI-Assistent, Regenschirm** | Stockschirm schwarz (BZS), Taschenschirm rot (RVS), Regenschirm transparent (NWL). Alle enthalten das Wort «Regenschirm» | Assistent unten rechts öffnen → z. B. «Ich habe meinen Regenschirm verloren, weiss aber nicht wo». Der Assistent nennt Schirme aus mehreren Organisationen. |

Hinweis zu Aufgabe 1/6: Gegenstände, die **vor** dem Verlustdatum gefunden wurden, sind kein Treffer (Regel: Funddatum 0–30 Tage nach dem Verlust). Wer «vor zwei Wochen» angibt, sieht deshalb auch das Headset.

## Szenarien für Mitarbeitende (Präsentation)

| Szenario | Daten |
|---|---|
| Zwei Personen beanspruchen denselben Gegenstand | Rucksack schwarz (FBL): Elena Rossi nennt Fuchs-Anhänger und grünes Notizbuch (= internes Merkmal), Tim Baumann nur «schwarz, Laptopfach» |
| Nachweis mit internem Merkmal vergleichen | Kopfhörer (BZS, Jana Meier: Initialen J. M.), Ladegerät (NWL, Daniel Graf: Inventarnummer), Ohrhörer (RVS, Tamara Koch: Gravur T. K.) |
| Reservierter Gegenstand | Kapuzenpullover (BZS, Noah Frei), Rucksack grün (NWL, Reto Schmid) |
| Abgelehnte Anfrage | Portemonnaie (FBL, Max Muster: «Beschreibung zu allgemein») |
| Abgeschlossene Rückgabe | Taschenrechner (BZS, Sina Lang) – nicht mehr im Katalog |
| Nur intern sichtbar | Badge-Etui mit Schlüssel (NWL) |
| Verlustmeldung mit Treffer | Blaue Trinkflasche → Trinkflasche (BZS) · Roter Regenschirm → Taschenschirm (RVS) · Silberne Armbanduhr → Armbanduhr (FBL) · Schwarzer Regenschirm → Stockschirm (BZS) · Schwarzer Rucksack und Blaue Regenjacke («Weiss nicht») → organisationsübergreifend |
| Verlustmeldung ohne Treffer | Laptop (Anna Graf) |
| Gegenstand im Fundbüro der Stadt (Übergabe-Aufgabe 1) | Smartphone grün, Stadtpark, vor 1 Tag |

## Alle Gegenstände

Die Fundnummern steigen pro Organisation vom ältesten zum neuesten Fund. Ohne Bild = Illustration der Kategorie.

| Org | Gegenstand | Farbe | Marke | gefunden | Fundort | Status | Bild |
|---|---|---|---|---|---|---|---|
| BZS | Kabellose Kopfhörer | Schwarz | Sony | vor 3 Tagen | Mensa | verfügbar, Anfrage offen | ✓ |
| BZS | Kapuzenpullover | Grau | – | vor 8 Tagen | Schulzimmer B204 | reserviert | ✓ |
| BZS | Taschenrechner | Grau | Texas Instruments | vor 12 Tagen | Prüfungsraum C1 | zurückgegeben | – |
| BZS | Schlüsselbund | Mehrfarbig | – | vor 2 Tagen | Veloständer Ost | verfügbar | ✓ |
| BZS | Trinkflasche aus Metall | Blau | – | vor 5 Tagen | Turnhalle | verfügbar | ✓ |
| BZS | Regenjacke | Blau | Jack Wolfskin | vor 6 Tagen | Aula | verfügbar | ✓ |
| BZS | Rucksack | Grau | Deuter | vor 4 Tagen | Bibliothek | verfügbar | ✓ |
| BZS | Stockschirm | Schwarz | – | vor 1 Tag | Haupteingang | verfügbar | ✓ |
| BZS | Federmäppchen | Grün | – | vor 10 Tagen | Schulzimmer A105 | verfügbar | – |
| FBL | Rucksack | Schwarz | Fjällräven | vor 9 Tagen | Bahnhof, Wartesaal | verfügbar, 2 Anfragen offen | ✓ |
| FBL | Smartphone mit Hülle | Grün | Apple | vor 1 Tag | Stadtpark | verfügbar | ✓ |
| FBL | Portemonnaie | Schwarz | – | vor 4 Tagen | Bushaltestelle Bahnhof | verfügbar, Anfrage abgelehnt | ✓ |
| FBL | Kinderjacke | Blau | – | vor 20 Tagen | Spielplatz Lindenhof | verfügbar | ✓ |
| FBL | Daunenjacke | Rot | – | vor 5 Tagen | Stadtbibliothek | verfügbar | ✓ |
| FBL | Ring | Gold | – | vor 15 Tagen | Hallenbad | verfügbar | ✓ |
| FBL | Veloschlüssel | Silber | Abus | vor 3 Tagen | Veloparking Bahnhof | verfügbar | – |
| FBL | Armbanduhr | Silber | – | vor 7 Tagen | Stadthaus | verfügbar | ✓ |
| NWL | Laptop-Ladegerät | Weiss | Lenovo | vor 2 Tagen | Sitzungszimmer Säntis | verfügbar, Anfrage offen | ✓ |
| NWL | Badge-Etui mit Schlüssel | Blau | – | vor 7 Tagen | Parkhaus | **nur intern** | – |
| NWL | Wollschal | Braun | – | vor 11 Tagen | Kantine | verfügbar | ✓ |
| NWL | Sonnenbrille | Schwarz | Ray-Ban | vor 25 Tagen | Lobby | verfügbar | ✓ |
| NWL | Headset mit Mikrofon | Schwarz | Jabra | vor 12 Tagen | Grossraumbüro | verfügbar | ✓ |
| NWL | Softshelljacke | Schwarz | – | vor 10 Tagen | Garderobe Schulungsraum | verfügbar | ✓ |
| NWL | Regenschirm | Andere Farbe (transparent) | – | vor 8 Tagen | Lobby | verfügbar | ✓ |
| NWL | Rucksack | Grün | Herschel | vor 6 Tagen | Velokeller | reserviert | ✓ |
| RVS | Taschenschirm | Rot | Knirps | vor 6 Tagen | Tram Linie 3 | verfügbar | ✓ |
| RVS | Kabellose Ohrhörer | Weiss | Apple | vor 2 Tagen | Bus Linie 5 | verfügbar, Anfrage offen | ✓ |
| RVS | Turnbeutel | Blau | Nike | vor 14 Tagen | S-Bahn S1 | verfügbar | ✓ |
| RVS | Mütze | Grün | – | vor 9 Tagen | Bus Linie 2 | verfügbar | ✓ |
| RVS | Velohelm | Weiss | Uvex | vor 4 Tagen | Bahnhof Seetal, Perron 2 | verfügbar | ✓ |
| RVS | Handschuhe | Schwarz | – | vor 16 Tagen | Regionalzug | verfügbar | – |

## Regeln für die Bilder

- Gezeichnete Studiobilder (`scripts/demo-photos/generate.py`), keine echten Fotos und keine Bilder aus dem Internet.
- Farbe und Art entsprechen genau den Angaben in den Daten.
- **Interne Erkennungsmerkmale sind nie zu sehen** (Initialen, Gravuren, Anhänger, Namensschilder). Sonst wäre der Eigentumsnachweis bei der Rückgabeanfrage wertlos.
- Keine Markenlogos, keine Personen, keine lesbaren persönlichen Angaben.
- Bild neu erzeugen: `python3 scripts/demo-photos/generate.py [name …]` (benötigt Python mit `playwright` und `Pillow`).
