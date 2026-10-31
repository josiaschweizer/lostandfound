-- =============================================================================
-- Beispieldaten v2: vier Organisationen, 31 Fundgegenstände mit Bildern
--
-- ALLE Daten sind erfunden. Daten liegen relativ zum aktuellen Datum, damit der
-- Abgleich (Zeitfenster 30 Tage) auch später noch Treffer zeigt.
-- Demo-Passwort für alle Demo-Zugänge: demo1234
--
-- Bilder: photo_path «demo/<datei>» zeigt auf public/demo-photos/<datei> im
-- Frontend (siehe src/services/photos.ts). So überleben die Bilder jeden Reset,
-- ohne dass etwas in Supabase Storage hochgeladen werden muss.
-- Fünf Gegenstände haben bewusst kein Bild → Kategorie-Illustration.
--
-- Feste UUIDs (Organisationen, Gegenstände) → Direktlinks bleiben nach einem
-- Reset gültig. Gegenstände werden vom ältesten zum neuesten Fund eingefügt,
-- damit die Fundnummern chronologisch aufsteigen.
--
-- Abdeckung der Nutzertests: siehe docs/TESTDATEN.md
-- =============================================================================

create or replace function public.seed_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_password constant text := 'demo1234';
  u_lea   constant uuid := '00000000-0000-4000-a000-000000000001';
  u_marco constant uuid := '00000000-0000-4000-a000-000000000002';
  u_sara  constant uuid := '00000000-0000-4000-a000-000000000003';
  u_luca  constant uuid := '00000000-0000-4000-a000-000000000004';
  o_school  constant uuid := '00000000-0000-4000-b000-000000000001';
  o_city    constant uuid := '00000000-0000-4000-b000-000000000002';
  o_company constant uuid := '00000000-0000-4000-b000-000000000003';
  o_transit constant uuid := '00000000-0000-4000-b000-000000000004';
  d constant date := current_date;
  r_id uuid;
begin
  -- --- Demo-Konten (Supabase Auth) -----------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
         extensions.crypt(c_password, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', ''
    from (values
      (u_lea,   'lea.brunner@bbz-seetal.example',                'Lea Brunner'),
      (u_marco, 'marco.keller@lindenau.example',                 'Marco Keller'),
      (u_sara,  'sara.huber@nordwind-logistik.example',          'Sara Huber'),
      (u_luca,  'luca.ammann@regionalverkehr-seetal.example',    'Luca Ammann')
    ) as u(id, email, full_name)
  on conflict (id) do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at;

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         now(), now(), now()
    from auth.users u
   where u.id in (u_lea, u_marco, u_sara, u_luca)
     and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

  -- --- Organisationen & Fundstellen ----------------------------------------
  insert into public.organisations (id, slug, name, type, short_code, address)
  values
    (o_school,  'bbz-seetal',             'Berufsbildungszentrum Seetal', 'school',               'BZS', 'Seestrasse 12, 5700 Seetal'),
    (o_city,    'fundbuero-lindenau',     'Fundbüro Stadt Lindenau',      'lost_property_office', 'FBL', 'Marktplatz 3, 4900 Lindenau'),
    (o_company, 'nordwind-logistik',      'Nordwind Logistik AG',         'company',              'NWL', 'Industriestrasse 40, 6300 Talheim'),
    (o_transit, 'regionalverkehr-seetal', 'Regionalverkehr Seetal',       'company',              'RVS', 'Bahnhofplatz 1, 5700 Seetal');

  insert into public.found_offices (organisation_id, name, location, contact_email, contact_phone, opening_hours, pickup_notes)
  values
    (o_school, 'Fundstelle Hauswartung', 'Trakt A, Raum A012', 'fundstelle@bbz-seetal.example', '000 000 00 01',
     'Mo–Fr 07:30–12:00 und 13:00–16:30', 'Bitte Schülerausweis oder amtlichen Ausweis mitbringen.'),
    (o_city, 'Fundbüro im Stadthaus', 'Stadthaus, Erdgeschoss, Schalter 4', 'fundbuero@lindenau.example', '000 000 00 02',
     'Mo–Do 08:00–11:30 und 13:30–17:00, Fr 08:00–14:00', 'Amtlicher Ausweis erforderlich.'),
    (o_company, 'Empfang Hauptgebäude', 'Industriestrasse 40, Empfang', 'empfang@nordwind-logistik.example', null,
     'Mo–Fr 07:00–18:00', 'Bitte am Empfang melden und die Fundnummer nennen.'),
    (o_transit, 'Fundservice Bahnhof Seetal', 'Bahnhof Seetal, Kundencenter bei Gleis 1', 'fundservice@regionalverkehr-seetal.example', '000 000 00 04',
     'Mo–Fr 06:30–19:00, Sa 08:00–12:00', 'Amtlichen Ausweis mitbringen. Fundsachen aus Bus, Tram und S-Bahn werden drei Monate aufbewahrt.');

  insert into public.memberships (user_id, organisation_id, full_name)
  values (u_lea, o_school, 'Lea Brunner'),
         (u_marco, o_city, 'Marco Keller'),
         (u_sara, o_company, 'Sara Huber'),
         (u_luca, o_transit, 'Luca Ammann');

  -- --- Fundgegenstände (öffentliche und interne Angaben) ---------------------
  -- Spalten: id, org, Titel, Kategorie, Farbe, Marke, vor X Tagen, Fundort, öffentliche Beschreibung,
  --          Bild, Status, öffentlich, internes Merkmal, interne Notiz, Lagerort
  if to_regclass('pg_temp.demo_items') is not null then
    drop table pg_temp.demo_items;
  end if;
  create temporary table demo_items (
    id uuid, org uuid, title text, category public.item_category, color public.item_color, brand text,
    days int, location text, description text, photo text, status public.item_status, is_public boolean,
    feature text, note text, storage text
  ) on commit drop;

  insert into demo_items values
    -- Berufsbildungszentrum Seetal (BZS)
    ('00000000-0000-4000-c000-000000000001', o_school, 'Kabellose Kopfhörer', 'electronics', 'black', 'Sony', 3,
     'Mensa, Tisch beim Fenster', 'Over-Ear-Kopfhörer, zusammenklappbar, in einem schwarzen Etui.',
     'bzs-kopfhoerer-schwarz', 'available', true, 'Aufkleber mit Initialen «J. M.» innen am Bügel', 'Akku leer.', 'Schrank A, Fach 2'),
    ('00000000-0000-4000-c000-000000000002', o_school, 'Kapuzenpullover', 'clothing', 'grey', null, 8,
     'Schulzimmer B204', 'Grauer Pullover mit Kapuze und Bauchtasche, Grösse M.',
     'bzs-kapuzenpullover-grau', 'reserved', true, 'Name auf dem Etikett: «Noah»', '', 'Schrank A, Fach 4'),
    ('00000000-0000-4000-c000-000000000003', o_school, 'Taschenrechner', 'electronics', 'grey', 'Texas Instruments', 12,
     'Prüfungsraum C1', 'Wissenschaftlicher Taschenrechner mit Schiebedeckel.',
     null, 'returned', true, 'Gravur «S. L.» auf der Rückseite', '', 'Ausgegeben'),
    ('00000000-0000-4000-c000-000000000004', o_school, 'Schlüsselbund', 'keys', 'multicolor', null, 2,
     'Veloständer Ost', 'Drei Schlüssel an einem Ring, einer davon messingfarben.',
     'bzs-schluesselbund', 'available', true, 'Ein Schlüssel trägt die Nummer 47; dazu gehört ein Anhänger in Form eines roten Fussballs',
     'Anhänger war lose und liegt separat im Kasten.', 'Schlüsselkasten'),
    ('00000000-0000-4000-c000-000000000005', o_school, 'Trinkflasche aus Metall', 'sports', 'blue', null, 5,
     'Turnhalle, Garderobe Süd', 'Isolierte Trinkflasche mit Schraubdeckel, ca. 0,75 Liter.',
     'bzs-trinkflasche-blau', 'available', true, 'Aufkleber eines Kletterzentrums auf der Rückseite, Delle am Boden', '', 'Regal Turnhalle'),
    ('00000000-0000-4000-c000-000000000006', o_school, 'Regenjacke', 'clothing', 'blue', 'Jack Wolfskin', 6,
     'Aula, hinterste Stuhlreihe', 'Blaue Regenjacke mit Kapuze und Reissverschluss, Erwachsenengrösse L.',
     'bzs-regenjacke-blau', 'available', true, 'In der Innentasche steckt ein Busbillett', '', 'Garderobe Hauswartung'),
    ('00000000-0000-4000-c000-000000000007', o_school, 'Rucksack', 'bags', 'grey', 'Deuter', 4,
     'Bibliothek, Lernzone 2. OG', 'Grauer Rucksack mit Fronttasche und gelbgrünem Zierstreifen.',
     'bzs-rucksack-grau', 'available', true, 'Im Hauptfach: Ordner «Mathematik» und eine Brotdose', '', 'Schrank B, Fach 1'),
    ('00000000-0000-4000-c000-000000000008', o_school, 'Stockschirm', 'other', 'black', null, 1,
     'Haupteingang, Schirmständer', 'Schwarzer Regenschirm (Stockschirm) mit Holzgriff.',
     'bzs-stockschirm-schwarz', 'available', true, 'Kleiner Riss im Stoff neben einer Speiche', '', 'Schirmständer Hauswartung'),
    ('00000000-0000-4000-c000-000000000009', o_school, 'Federmäppchen', 'other', 'green', null, 10,
     'Schulzimmer A105', 'Grünes Federmäppchen mit Reissverschluss, gefüllt mit Stiften.',
     null, 'available', true, 'Lineal mit dem Namen «Mila»', '', 'Schrank A, Fach 3'),

    -- Fundbüro Stadt Lindenau (FBL)
    ('00000000-0000-4000-c000-000000000010', o_city, 'Rucksack', 'bags', 'black', 'Fjällräven', 9,
     'Bahnhof, Wartesaal', 'Schwarzer Rucksack mit Laptopfach und Fronttasche.',
     'fbl-rucksack-schwarz', 'available', true, 'Fuchs-Anhänger am Reissverschluss, Inhalt: Notizbuch mit grünem Umschlag',
     'Zwei Anfragen offen – Merkmale vergleichen!', 'Regal T-5'),
    ('00000000-0000-4000-c000-000000000011', o_city, 'Smartphone mit Hülle', 'electronics', 'green', 'Apple', 1,
     'Stadtpark, Parkbank beim Weiher', 'Smartphone in einer grünen Schutzhülle. Gerät ist gesperrt.',
     'fbl-smartphone-gruen', 'available', true, 'Sperrbildschirm zeigt einen Hund am Strand; Riss oben links',
     'Gerät ausgeschaltet gelagert.', 'Tresor, Fach E-03'),
    ('00000000-0000-4000-c000-000000000012', o_city, 'Portemonnaie', 'wallets', 'black', null, 4,
     'Bushaltestelle Bahnhof', 'Klappbares Portemonnaie aus schwarzem Leder mit Ziernaht.',
     'fbl-portemonnaie-schwarz', 'available', true, 'Enthält Bibliotheksausweis der Stadtbibliothek',
     'Bargeld gezählt und protokolliert.', 'Tresor, Fach W-12'),
    ('00000000-0000-4000-c000-000000000013', o_city, 'Kinderjacke', 'clothing', 'blue', null, 20,
     'Spielplatz Lindenhof', 'Blaue Regenjacke für Kinder mit gelben Bündchen, ca. Grösse 116.',
     'fbl-kinderjacke-blau', 'available', true, 'Namensschild im Kragen: «Lia»', '', 'Regal K-2'),
    ('00000000-0000-4000-c000-000000000014', o_city, 'Daunenjacke', 'clothing', 'red', null, 5,
     'Stadtbibliothek, Garderobe', 'Rote, gesteppte Daunenjacke mit Stehkragen, Grösse S.',
     'fbl-daunenjacke-rot', 'available', true, 'Linke Innentasche: Quittung eines Cafés', '', 'Regal K-3'),
    ('00000000-0000-4000-c000-000000000015', o_city, 'Ring', 'jewellery', 'gold', null, 15,
     'Hallenbad, Garderobe', 'Schmaler Ring aus Gold.',
     'fbl-ring-gold', 'available', true, 'Gravur innen: Datum und zwei Initialen', '', 'Tresor, Fach S-01'),
    ('00000000-0000-4000-c000-000000000016', o_city, 'Veloschlüssel', 'keys', 'silver', 'Abus', 3,
     'Veloparking Bahnhof', 'Einzelner Schlüssel für ein Veloschloss.',
     null, 'available', true, 'Kunststoffkappe abgebrochen, Nummer 512 eingeprägt', '', 'Schlüsselkasten'),
    ('00000000-0000-4000-c000-000000000017', o_city, 'Armbanduhr', 'jewellery', 'silver', null, 7,
     'Stadthaus, Warteraum Einwohneramt', 'Silberne Armbanduhr mit dunkelblauem Zifferblatt und Gliederarmband.',
     'fbl-armbanduhr-silber', 'available', true, 'Gravur auf dem Gehäuseboden: «Für P. – 2019»', 'Uhr läuft.', 'Tresor, Fach S-04'),

    -- Nordwind Logistik AG (NWL)
    ('00000000-0000-4000-c000-000000000018', o_company, 'Laptop-Ladegerät', 'electronics', 'white', 'Lenovo', 2,
     'Sitzungszimmer Säntis', 'USB-C-Netzteil mit fest angebrachtem Kabel.',
     'nwl-ladegeraet-weiss', 'available', true, 'Inventarnummer NW-IT-2231', 'Vermutlich von externem Besuch.', 'Empfangstheke, Schublade 1'),
    ('00000000-0000-4000-c000-000000000019', o_company, 'Badge-Etui mit Schlüssel', 'keys', 'blue', null, 7,
     'Parkhaus, Ebene 2', 'Etui mit Firmenbadge. Nur intern sichtbar.',
     null, 'available', false, 'Badge auf Mitarbeitende Logistik ausgestellt', 'IT informieren, falls nicht abgeholt.', 'Empfang, Tresor'),
    ('00000000-0000-4000-c000-000000000020', o_company, 'Wollschal', 'clothing', 'brown', null, 11,
     'Kantine', 'Langer Schal aus Wolle mit Fransen.',
     'nwl-wollschal-braun', 'available', true, 'Kleines Loch am Ende', '', 'Garderobe Empfang'),
    ('00000000-0000-4000-c000-000000000021', o_company, 'Sonnenbrille', 'other', 'black', 'Ray-Ban', 25,
     'Lobby, Sitzecke', 'Sonnenbrille mit dunklen Gläsern, ohne Etui.',
     'nwl-sonnenbrille-schwarz', 'available', true, 'Kratzer am linken Glas', '', 'Empfangstheke, Schublade 2'),
    ('00000000-0000-4000-c000-000000000022', o_company, 'Headset mit Mikrofon', 'electronics', 'black', 'Jabra', 12,
     'Grossraumbüro, 3. OG', 'Kabellose Kopfhörer mit Mikrofonarm für Telefonate.',
     'nwl-headset-schwarz', 'available', true, 'Seriennummer endet auf 4471', '', 'Empfangstheke, Schublade 1'),
    ('00000000-0000-4000-c000-000000000023', o_company, 'Softshelljacke', 'clothing', 'black', null, 10,
     'Garderobe Schulungsraum', 'Schwarze Softshelljacke mit Stehkragen und Reissverschluss, Grösse M.',
     'nwl-softshelljacke-schwarz', 'available', true, 'In der rechten Tasche: Taschentücher und ein Kugelschreiber', '', 'Garderobe Empfang'),
    ('00000000-0000-4000-c000-000000000024', o_company, 'Regenschirm', 'other', 'other', null, 8,
     'Lobby, Schirmständer', 'Transparenter Regenschirm mit schwarzem Griff.',
     'nwl-regenschirm-transparent', 'available', true, 'Eine Speiche ist leicht verbogen', '', 'Schirmständer Empfang'),
    ('00000000-0000-4000-c000-000000000025', o_company, 'Rucksack', 'bags', 'green', 'Herschel', 6,
     'Velokeller', 'Grüner Rolltop-Rucksack mit schwarzer Schnalle.',
     'nwl-rucksack-gruen', 'reserved', true, 'Im Innenfach: Velolicht und Regenhose', '', 'Empfang, hinter der Theke'),

    -- Regionalverkehr Seetal (RVS)
    ('00000000-0000-4000-c000-000000000026', o_transit, 'Taschenschirm', 'other', 'red', 'Knirps', 6,
     'Tram Linie 3, Richtung Lindenhof', 'Zusammenklappbarer roter Regenschirm in Schutzhülle.',
     'rvs-taschenschirm-rot', 'available', true, 'Innen auf der Schutzhülle steht mit Filzstift ein «M»', '', 'Kundencenter, Fach 2'),
    ('00000000-0000-4000-c000-000000000027', o_transit, 'Kabellose Ohrhörer', 'electronics', 'white', 'Apple', 2,
     'Bus Linie 5, hinterste Sitzreihe', 'In-Ear-Kopfhörer im weissen Ladeetui.',
     'rvs-ohrhoerer-weiss', 'available', true, 'Etui hinten mit eingravierten Initialen «T. K.»', '', 'Kundencenter, Fach 7'),
    ('00000000-0000-4000-c000-000000000028', o_transit, 'Turnbeutel', 'bags', 'blue', 'Nike', 14,
     'S-Bahn S1, Gepäckablage', 'Blauer Sportbeutel mit schwarzen Kordeln, darin Sportkleidung.',
     'rvs-turnbeutel-blau', 'available', true, 'Hallenschuhe Grösse 38 mit dem Kürzel «L. B.»', '', 'Lager, Regal 2'),
    ('00000000-0000-4000-c000-000000000029', o_transit, 'Mütze', 'clothing', 'green', null, 9,
     'Bus Linie 2, Haltestelle Marktplatz', 'Grüne Strickmütze mit Umschlag.',
     'rvs-muetze-gruen', 'available', true, 'Eingenähtes Etikett mit Wäschenummer 12', '', 'Kundencenter, Fach 3'),
    ('00000000-0000-4000-c000-000000000030', o_transit, 'Velohelm', 'sports', 'white', 'Uvex', 4,
     'Bahnhof Seetal, Perron 2', 'Weisser Velohelm mit schwarzem Visier und Kinnriemen.',
     'rvs-velohelm-weiss', 'available', true, 'Innen ein Aufkleber mit Telefonnummer (teilweise unleserlich)', '', 'Lager, Regal 1'),
    ('00000000-0000-4000-c000-000000000031', o_transit, 'Handschuhe', 'clothing', 'black', null, 16,
     'Regionalzug, 2. Klasse', 'Paar schwarze Fingerhandschuhe aus Leder.',
     null, 'available', true, 'Rechter Handschuh: Naht am Daumen offen', '', 'Kundencenter, Fach 5');

  -- Ältester Fund zuerst → Fundnummern steigen chronologisch (pro Organisation).
  insert into public.found_items (id, organisation_id, title, category, color, brand, found_on, found_location,
                                  public_description, photo_path, status, is_public)
  select id, org, title, category, color, brand, d - days, location, description,
         case when photo is null then null else 'demo/' || photo || '.webp' end, status, is_public
    from demo_items
   order by days desc, id;

  -- Interne Angaben (nie öffentlich sichtbar)
  insert into public.found_item_internal (item_id, organisation_id, identifying_feature, internal_note, storage_location)
  select id, org, feature, note, storage from demo_items;

  -- --- Rückgabeanfragen (alle Stände) ----------------------------------------
  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, status, pickup_instructions, decision_note, decided_at, created_at)
  values
    -- bestätigt → Gegenstand reserviert
    ('00000000-0000-4000-c000-000000000002', o_school, 'Noah Frei', 'noah.frei@example.com', 'Habe ihn nach dem Englischunterricht liegen lassen.',
     'Auf dem Etikett steht mein Vorname Noah.', 'confirmed',
     'Bitte während der Öffnungszeiten in Raum A012 abholen und Schülerausweis mitbringen.', null, now() - interval '1 day', now() - interval '2 days'),
    ('00000000-0000-4000-c000-000000000025', o_company, 'Reto Schmid', 'reto.schmid@example.com', 'War letzte Woche als Kurier bei Ihnen und bin mit dem Velo gekommen.',
     'Im Innenfach sind ein Velolicht und eine Regenhose.', 'confirmed',
     'Bitte am Empfang melden und die Fundnummer nennen.', null, now() - interval '20 hours', now() - interval '2 days'),
    -- abgeschlossen → Gegenstand zurückgegeben
    ('00000000-0000-4000-c000-000000000003', o_school, 'Sina Lang', 'sina.lang@example.com', 'Brauche ihn für die nächste Prüfung.',
     'Auf der Rückseite sind meine Initialen S. L. eingraviert.', 'completed',
     'Abholung in Raum A012.', null, now() - interval '9 days', now() - interval '10 days'),
    -- abgelehnt
    ('00000000-0000-4000-c000-000000000012', o_city, 'Max Muster', 'max.muster@example.com', 'Ist das meins?',
     'Ein schwarzes Portemonnaie.', 'rejected', null, 'Beschreibung zu allgemein.', now() - interval '1 day', now() - interval '2 days');

  -- offen
  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, created_at)
  values
    ('00000000-0000-4000-c000-000000000001', o_school, 'Jana Meier', 'jana.meier@example.com', 'Ich glaube, das sind meine.',
     'Innen am Bügel klebt ein Sticker mit meinen Initialen J. M.', now() - interval '5 hours'),
    -- Zwei Personen beanspruchen denselben Rucksack – nur eine Angabe passt zum internen Merkmal.
    ('00000000-0000-4000-c000-000000000010', o_city, 'Elena Rossi', 'elena.rossi@example.com', 'Am Bahnhof vergessen, als ich umgestiegen bin.',
     'Am Reissverschluss hängt ein kleiner Fuchs-Anhänger, drin ist ein grünes Notizbuch.', now() - interval '1 day'),
    ('00000000-0000-4000-c000-000000000010', o_city, 'Tim Baumann', 'tim.baumann@example.com', 'Mein Rucksack ist schwarz und von Fjällräven.',
     'Er ist schwarz und hat ein Laptopfach.', now() - interval '3 hours'),
    ('00000000-0000-4000-c000-000000000018', o_company, 'Daniel Graf', 'daniel.graf@example.com', 'War letzte Woche an einem Meeting bei Ihnen.',
     'Auf dem Netzteil klebt eine Inventarnummer, die mit NW-IT beginnt.', now() - interval '20 hours'),
    ('00000000-0000-4000-c000-000000000027', o_transit, 'Tamara Koch', 'tamara.koch@example.com', 'Im Bus auf dem Heimweg aus der Tasche gefallen.',
     'Auf der Rückseite des Etuis sind meine Initialen T. K. eingraviert.', now() - interval '1 day');

  -- --- Verlustmeldungen --------------------------------------------------------
  -- organisation_id null = «Weiss nicht, wo verloren» → alle Organisationen sehen die Meldung.
  insert into public.loss_reports (organisation_id, reporter_name, reporter_contact, title, category, color, brand, lost_on, lost_location, description, created_at)
  values
    (o_school, 'Lena Keller', 'lena.keller@example.com', 'Blaue Trinkflasche', 'sports', 'blue', null, d - 6,
     'Turnhalle', 'Metallflasche mit Aufkleber eines Kletterzentrums.', now() - interval '5 days'),
    (o_school, 'Leon Baumann', 'leon.baumann@example.com', 'Schwarzer Regenschirm', 'other', 'black', null, d - 2,
     'Schulhaus, Eingang', 'Langer schwarzer Schirm mit Holzgriff.', now() - interval '1 day'),
    (o_city, 'Peter Aebi', 'peter.aebi@example.com', 'Silberne Armbanduhr', 'jewellery', 'silver', null, d - 8,
     'Stadthaus', 'Uhr mit blauem Zifferblatt, Geschenk zum Geburtstag.', now() - interval '7 days'),
    (o_transit, 'Mia Steiner', 'mia.steiner@example.com', 'Roter Regenschirm', 'other', 'red', null, d - 7,
     'Tram Linie 3', 'Kleiner roter Schirm in einer Hülle.', now() - interval '6 days'),
    (null, 'Jonas Weber', 'jonas.weber@example.com', 'Schwarzer Rucksack', 'bags', 'black', 'Fjällräven', d - 10,
     'Irgendwo zwischen Bahnhof und Arbeit', 'Rucksack mit Laptopfach und Fuchs-Anhänger.', now() - interval '8 days'),
    (null, 'Sven Imhof', 'sven.imhof@example.com', 'Blaue Regenjacke', 'clothing', 'blue', 'Jack Wolfskin', d - 7,
     'Weiss nicht – Schule oder Bus', 'Regenjacke mit Kapuze, Grösse L.', now() - interval '6 days'),
    (null, 'Anna Graf', 'anna.graf@example.com', 'Laptop', 'electronics', 'grey', 'Dell', d - 3,
     'Unbekannt', 'Grauer Laptop in schwarzer Hülle.', now() - interval '2 days');

  -- --- Postausgang: bisheriger Verlauf (alle Adressen erfunden → nie versendet) ----
  insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
  select r.organisation_id, r.id, r.claimant_contact,
         'Ihre Anfrage zu «' || i.title || '» wurde bestätigt',
         'Guten Tag ' || r.claimant_name || E'\n\nIhre Angaben passen. Abholhinweise:\n' || r.pickup_instructions
           || E'\n\nOrt: ' || o.location || E'\nÖffnungszeiten: ' || o.opening_hours
           || E'\nBitte Fundnummer ' || i.item_number || ' angeben.',
         '/status/anfrage/' || r.access_token, r.decided_at
    from public.return_requests r
    join public.found_items i on i.id = r.item_id
    join public.found_offices o on o.organisation_id = r.organisation_id
   where r.status in ('confirmed', 'completed');

  insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
  select r.organisation_id, r.id, r.claimant_contact,
         'Ihre Anfrage zu «' || i.title || '» wurde abgelehnt',
         'Guten Tag ' || r.claimant_name || E'\n\nIhre Angaben reichen leider nicht als Eigentumsnachweis.'
           || E'\nHinweis der Fundstelle: ' || r.decision_note || E'\nBei Fragen: ' || o.contact_email,
         '/status/anfrage/' || r.access_token, r.decided_at
    from public.return_requests r
    join public.found_items i on i.id = r.item_id
    join public.found_offices o on o.organisation_id = r.organisation_id
   where r.status = 'rejected';

  -- Offene Anfragen: Hinweis an die Fundstelle
  insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
  select r.organisation_id, r.id, o.contact_email,
         'Neue Rückgabeanfrage zu ' || i.item_number,
         r.claimant_name || ' hat eine Rückgabe für «' || i.title || '» angefragt. Bitte die Angaben in der Verwaltung prüfen.',
         '/verwaltung/anfragen/' || r.id, r.created_at
    from public.return_requests r
    join public.found_items i on i.id = r.item_id
    join public.found_offices o on o.organisation_id = r.organisation_id
   where r.status = 'open';

  -- Treffer-Hinweis des Fundbüros zur «Weiss nicht»-Meldung von Jonas Weber
  select id into r_id from public.loss_reports where reporter_contact = 'jonas.weber@example.com';
  insert into public.simulated_emails (organisation_id, loss_report_id, recipient, subject, body, link_path, created_at)
  select o_city, r_id, 'jonas.weber@example.com',
         'Möglicher Treffer zu Ihrer Verlustmeldung «Schwarzer Rucksack»',
         E'Guten Tag Jonas Weber\n\nEs wurde ein Gegenstand erfasst, der zu Ihrer Meldung passen könnte: «Rucksack» ('
           || i.item_number || '). Sie können die Rückgabe direkt online anfragen.',
         '/fund/' || i.id, now() - interval '7 days'
    from public.found_items i
   where i.id = '00000000-0000-4000-c000-000000000010';
end;
$$;

revoke all on function public.seed_demo_data() from public, anon, authenticated;

-- Setzt die Demo auf den Ausgangszustand zurück. NUR FÜR DEN SCHULPROTOTYP:
-- Jede Person mit Zugriff auf die Seite kann diese Funktion aufrufen.
create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.simulated_emails where true;
  delete from public.loss_reports where true;
  delete from public.organisations where true;  -- kaskadiert auf alle abhängigen Tabellen
  delete from auth.users
   where id not in ('00000000-0000-4000-a000-000000000001',
                    '00000000-0000-4000-a000-000000000002',
                    '00000000-0000-4000-a000-000000000003',
                    '00000000-0000-4000-a000-000000000004');
  perform public.seed_demo_data();
end;
$$;

revoke all on function public.reset_demo() from public;
grant execute on function public.reset_demo() to anon, authenticated;

-- Bestehende Datenbanken (bereits mit v1 befüllt) direkt auf v2 umstellen.
-- Auf einer frischen Datenbank (supabase db reset) sind noch keine Daten vorhanden
-- – dann übernimmt seed.sql das Befüllen.
do $$
begin
  if exists (select 1 from public.organisations) then
    perform public.reset_demo();
  end if;
end;
$$;
