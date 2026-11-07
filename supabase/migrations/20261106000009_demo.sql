-- =============================================================================
-- Demo-Daten und Demo-Reset (KONZEPT 8.4). ALLE Daten sind erfunden.
-- Datumsangaben sind relativ zum heutigen Tag, damit Matching und «Zuletzt gefunden»
-- auch Wochen später noch passen. Passwort aller Demo-Konten: demo1234
-- =============================================================================

create function public.seed_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_password constant text := 'demo1234';
  o_school  constant uuid := '00000000-0000-4000-b000-000000000001';
  o_zoo     constant uuid := '00000000-0000-4000-b000-000000000002';
  o_hotel   constant uuid := '00000000-0000-4000-b000-000000000003';
  o_culture constant uuid := '00000000-0000-4000-b000-000000000004';
  d constant date := public.today_ch();
  v_token text;
  v_id uuid;
  v_item public.found_items;
  r record;
begin
  drop table if exists pg_temp.demo_users, pg_temp.demo_items, pg_temp.demo_photos, pg_temp.demo_claims, pg_temp.demo_reports;

  -- --- Demo-Konten (Supabase Auth): je ein Admin und eine Person Mitarbeitende pro Fundstelle --
  create temporary table demo_users (id uuid, email text, full_name text, org uuid, role public.member_role) on commit drop;
  insert into demo_users values
    ('00000000-0000-4000-a000-000000000001', 'sandra.keller@bs-musterstadt.example',        'Sandra Keller', o_school,  'admin'),
    ('00000000-0000-4000-a000-000000000002', 'marco.huber@bs-musterstadt.example',          'Marco Huber',   o_school,  'staff'),
    ('00000000-0000-4000-a000-000000000003', 'lea.frei@tierpark-sonnenberg.example',        'Lea Frei',      o_zoo,     'admin'),
    ('00000000-0000-4000-a000-000000000004', 'nico.baumann@tierpark-sonnenberg.example',    'Nico Baumann',  o_zoo,     'staff'),
    ('00000000-0000-4000-a000-000000000005', 'claudia.roth@hotel-bergblick.example',        'Claudia Roth',  o_hotel,   'admin'),
    ('00000000-0000-4000-a000-000000000006', 'jonas.weber@hotel-bergblick.example',         'Jonas Weber',   o_hotel,   'staff'),
    ('00000000-0000-4000-a000-000000000007', 'elena.rossi@kulturhaus-am-platz.example',     'Elena Rossi',   o_culture, 'admin'),
    ('00000000-0000-4000-a000-000000000008', 'tim.meier@kulturhaus-am-platz.example',       'Tim Meier',     o_culture, 'staff');

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
         extensions.crypt(c_password, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', ''
    from demo_users u
  on conflict (id) do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at,
        email = excluded.email;

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         now(), now(), now()
    from demo_users u
   where not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

  -- --- Fundstellen ----------------------------------------------------------------
  insert into public.organisations
    (id, slug, name, type, short_code, address, drop_off_location, opening_hours, pickup_rules, contact_email, contact_phone, retention_days)
  values
    (o_school, 'berufsschule-musterstadt', 'Berufsschule Musterstadt', 'school', 'BSM',
     'Schulstrasse 12, 8000 Musterstadt', 'Sekretariat, Raum A012 (Erdgeschoss)',
     'Mo–Fr 07:30–12:00 und 13:00–16:30',
     'Bitte Schüler- oder amtlichen Ausweis mitbringen. Eltern können mit Vollmacht abholen.',
     'sekretariat@bs-musterstadt.example', '000 000 00 01', 120),
    (o_zoo, 'tierpark-sonnenberg', 'Tierpark Sonnenberg', 'leisure', 'TPS',
     'Sonnenbergweg 5, 8001 Musterstadt', 'Kasse beim Haupteingang',
     'Täglich 09:00–18:00',
     'Amtlicher Ausweis erforderlich. Fundsachen werden drei Monate aufbewahrt.',
     'info@tierpark-sonnenberg.example', '000 000 00 02', 90),
    (o_hotel, 'hotel-bergblick', 'Hotel Bergblick', 'company', 'HBB',
     'Alpenstrasse 22, 3800 Bergdorf', 'Rezeption im Erdgeschoss',
     'Täglich 07:00–22:00',
     'Bitte an der Rezeption die Fundnummer nennen. Versand gegen Gebühr möglich.',
     'rezeption@hotel-bergblick.example', '000 000 00 03', 90),
    (o_culture, 'kulturhaus-am-platz', 'Kulturhaus am Platz', 'other', 'KAP',
     'Marktplatz 1, 8000 Musterstadt', 'Garderobe im Foyer',
     'Di–So 17:00–23:00 (an Veranstaltungstagen)',
     'Amtlicher Ausweis erforderlich.',
     'foyer@kulturhaus-am-platz.example', null, 60);

  insert into public.memberships (user_id, organisation_id, full_name, role)
  select id, org, full_name, role from demo_users;

  -- --- Funde ------------------------------------------------------------------------
  -- Spalten: Nr., Fundstelle, Titel, Kategorie, Farben, Marke, vor X Tagen, Fundort, Beschreibung,
  --          Status, öffentlich, internes Merkmal, interne Notiz, Aufbewahrungsort
  create temporary table demo_items (
    nr int, org uuid, title text, category public.item_category, colors public.item_color[], brand text, days int,
    location text, description text, status public.item_status, is_public boolean, feature text, note text, storage text
  ) on commit drop;

  insert into demo_items values
    -- Berufsschule Musterstadt (BSM)
    (1,  o_school, 'Kabellose Ohrhörer', 'electronics', '{white}', 'Apple', 3, 'Bus Linie 5, Haltestelle Berufsschule',
         'In-Ear-Kopfhörer im weissen Ladeetui.', 'available', true, 'Gravur «L. K.» hinten auf dem Etui', '', 'Schrank A, Fach 2'),
    (2,  o_school, 'Regenjacke', 'clothing', '{blue}', 'Jack Wolfskin', 6, 'Aula, hinterste Reihe',
         'Blaue Regenjacke mit Kapuze, Erwachsenengrösse L.', 'available', true, 'Busbillett in der Innentasche', '', 'Garderobe Sekretariat'),
    (3,  o_school, 'Rucksack', 'bags', '{grey}', 'Deuter', 8, 'Bibliothek, 2. OG',
         'Grauer Rucksack mit Fronttasche und gelbem Zierstreifen.', 'available', true, 'Ordner «Mathematik» und eine Brotdose im Hauptfach', '', 'Schrank B, Fach 1'),
    (4,  o_school, 'Schlüsselbund', 'keys', '{silver}', null, 2, 'Veloständer Ost',
         'Drei Schlüssel an einem Ring mit rotem Anhänger.', 'available', true, 'Ein Schlüssel trägt die Nummer 47', '', 'Schlüsselkasten'),
    (5,  o_school, 'Taschenrechner', 'electronics', '{black}', 'Texas Instruments', 12, 'Prüfungsraum C1',
         'Wissenschaftlicher Taschenrechner mit Schiebedeckel.', 'returned', true, 'Initialen «S. L.» auf der Rückseite', '', 'Ausgegeben'),
    (6,  o_school, 'Kapuzenpullover', 'clothing', '{grey}', null, 9, 'Turnhalle, Garderobe',
         'Grauer Hoodie mit Bauchtasche, Grösse M.', 'reserved', true, 'Vorname «Noah» auf dem Etikett', '', 'Schrank A, Fach 4'),
    (7,  o_school, 'Federmäppchen', 'other', '{green}', null, 10, 'Schulzimmer A105',
         'Grünes Etui mit Reissverschluss, gefüllt mit Stiften.', 'available', true, 'Lineal mit dem Namen «Mila»', '', 'Schrank A, Fach 3'),
    (8,  o_school, 'Stockschirm', 'other', '{black}', null, 1, 'Haupteingang, Schirmständer',
         'Schwarzer Regenschirm mit Holzgriff.', 'available', true, 'Kleiner Riss neben einer Speiche', '', 'Schirmständer Sekretariat'),
    (9,  o_school, 'Laptop-Ladegerät', 'electronics', '{white}', 'Lenovo', 4, 'Informatikzimmer B12',
         'USB-C-Netzteil mit fest angebrachtem Kabel.', 'available', true, 'Inventarnummer BS-IT-0815', '', 'Sekretariat, Schublade 1'),
    (10, o_school, 'Turnbeutel', 'bags', '{blue}', 'Nike', 5, 'Turnhalle, Garderobe Süd',
         'Blauer Sportbeutel mit schwarzen Kordeln.', 'available', true, 'Hallenschuhe Grösse 38 mit Kürzel «L. B.»', '', 'Regal Turnhalle'),
    (11, o_school, 'Brotdose', 'other', '{blue}', null, 40, 'Mensa',
         'Blaue Brotdose aus Kunststoff.', 'disposed', true, '', 'Nach Ablauf der Frist entsorgt.', 'Entsorgt'),
    -- Tierpark Sonnenberg (TPS)
    (12, o_zoo, 'Smartphone mit Hülle', 'electronics', '{green}', 'Samsung', 1, 'Spielplatz beim Elefantenhaus',
         'Smartphone in einer grünen Schutzhülle. Gerät ist gesperrt.', 'available', true, 'Sperrbildschirm zeigt einen Hund am Strand; Riss oben links', 'Ausgeschaltet gelagert.', 'Kasse, Tresor'),
    (13, o_zoo, 'Rucksack', 'bags', '{black}', 'Fjällräven', 5, 'Restaurant Savanne',
         'Schwarzer Rucksack mit Laptopfach und Fronttasche.', 'available', true, 'Fuchs-Anhänger am Reissverschluss, grünes Notizbuch im Hauptfach', 'Zwei Anfragen – Merkmale vergleichen!', 'Lager, Regal T-5'),
    (14, o_zoo, 'Trinkflasche', 'sports', '{blue}', 'Sigg', 3, 'Streichelzoo',
         'Blaue Trinkflasche aus Metall, ca. 0,75 Liter.', 'available', true, 'Aufkleber eines Kletterzentrums auf der Rückseite', '', 'Kasse, Fach 2'),
    (15, o_zoo, 'Kinderjacke', 'clothing', '{yellow}', null, 7, 'Picknickwiese',
         'Gelbe Regenjacke für Kinder, ca. Grösse 116.', 'available', true, 'Namensschild «Lia» im Kragen', '', 'Lager, Regal K-1'),
    (16, o_zoo, 'Sonnenbrille', 'other', '{black}', 'Ray-Ban', 2, 'Aussichtsplattform',
         'Sonnenbrille mit dunklen Gläsern, ohne Etui.', 'available', true, 'Kratzer am linken Glas', '', 'Kasse, Schublade'),
    (17, o_zoo, 'Plüschbär', 'other', '{brown}', null, 4, 'Bärengehege',
         'Brauner Plüschbär, ca. 30 cm gross.', 'available', true, 'Halstuch mit gesticktem «M»', '', 'Lager, Regal S-2'),
    (18, o_zoo, 'Velohelm', 'sports', '{white}', 'Uvex', 6, 'Veloparkplatz',
         'Weisser Velohelm mit schwarzem Visier.', 'available', true, 'Aufkleber mit Telefonnummer innen', '', 'Lager, Regal 1'),
    (19, o_zoo, 'Armbanduhr', 'jewellery', '{silver}', null, 11, 'Tropenhaus',
         'Silberne Armbanduhr mit dunkelblauem Zifferblatt.', 'available', true, 'Gravur «Für P. – 2019» auf dem Gehäuseboden', 'Uhr läuft.', 'Kasse, Tresor'),
    (20, o_zoo, 'Halskette', 'jewellery', '{gold}', null, 15, 'WC beim Haupteingang',
         'Feine goldene Halskette.', 'available', true, 'Anhänger in Herzform mit Datum', '', 'Kasse, Tresor'),
    (21, o_zoo, 'Veloschlüssel', 'keys', '{black}', 'Abus', 8, 'Veloparkplatz',
         'Einzelner Schlüssel für ein Veloschloss.', 'available', true, 'Nummer 512 eingeprägt', '', 'Kasse, Schlüsselbrett'),
    -- Hotel Bergblick (HBB)
    (22, o_hotel, 'Rucksack', 'bags', '{green}', 'Herschel', 2, 'Lobby, Sitzecke',
         'Grüner Rolltop-Rucksack mit schwarzer Schnalle.', 'available', true, 'Velolicht und Regenhose im Innenfach', '', 'Gepäckraum'),
    (23, o_hotel, 'Portemonnaie', 'wallets', '{black}', null, 3, 'Frühstücksraum',
         'Klappbares Portemonnaie aus schwarzem Leder.', 'available', false, 'Enthält ID und zwei Bankkarten', 'Bargeld gezählt und protokolliert.', 'Rezeption, Tresor'),
    (24, o_hotel, 'Ladekabel', 'electronics', '{black}', 'Anker', 1, 'Zimmer 214',
         'USB-C-Ladekabel mit Netzstecker.', 'available', true, 'Klebeband mit «Z» am Stecker', '', 'Rezeption, Schublade 2'),
    (25, o_hotel, 'Lesebrille', 'other', '{brown}', null, 5, 'Hotelbar',
         'Braune Lesebrille in einem Etui.', 'available', true, 'Etui mit Optikerstempel «Bern»', '', 'Rezeption, Schublade 1'),
    (26, o_hotel, 'Seidenschal', 'clothing', '{pink}', null, 8, 'Restaurant Panorama',
         'Rosa Seidenschal mit Blumenmuster.', 'available', true, 'Kleiner Fleck an einer Ecke', '', 'Garderobe Rezeption'),
    (27, o_hotel, 'Tablet', 'electronics', '{grey}', 'Apple', 4, 'Seminarraum Eiger',
         'Graues Tablet in einer schwarzen Hülle.', 'available', true, 'Sperrbildschirm mit Bergfoto; Seriennummer endet auf 77', '', 'Rezeption, Tresor'),
    (28, o_hotel, 'Badeshorts', 'sports', '{blue}', null, 6, 'Hallenbad',
         'Blaue Badeshorts, Grösse M.', 'available', true, 'Waschzettel mit Zimmernummer', '', 'Wellness, Fundkiste'),
    (29, o_hotel, 'Ring', 'jewellery', '{gold}', null, 9, 'Spa, Garderobe',
         'Schmaler goldener Ring.', 'available', true, 'Gravur innen: Datum und zwei Initialen', '', 'Rezeption, Tresor'),
    (30, o_hotel, 'Lesebuch', 'other', '{multicolor}', null, 12, 'Terrasse',
         'Taschenbuch, Kriminalroman.', 'available', true, 'Lesezeichen auf Seite 112', '', 'Rezeption, Regal'),
    -- Kulturhaus am Platz (KAP)
    (31, o_culture, 'Winterjacke', 'clothing', '{blue}', 'Mammut', 4, 'Garderobe Saal',
         'Dunkelblaue Daunenjacke mit Kapuze, Grösse M.', 'available', true, 'Theaterbillett in der Innentasche', '', 'Garderobe, Haken 12'),
    (32, o_culture, 'Taschenschirm', 'other', '{red}', 'Knirps', 3, 'Foyer',
         'Roter, zusammenklappbarer Regenschirm in Hülle.', 'available', true, 'Innen auf der Hülle ein «M» mit Filzstift', '', 'Garderobe, Fach 2'),
    (33, o_culture, 'Wollschal', 'clothing', '{beige}', null, 7, 'Saal, Reihe 8',
         'Langer beiger Wollschal mit Fransen.', 'available', true, 'Kleines Loch an einem Ende', '', 'Garderobe, Fach 3'),
    (34, o_culture, 'Handschuhe', 'clothing', '{black}', null, 10, 'Bar im Foyer',
         'Paar schwarze Lederhandschuhe.', 'available', true, 'Naht am rechten Daumen offen', '', 'Garderobe, Fach 3'),
    (35, o_culture, 'Kopfhörer', 'electronics', '{black}', 'Sony', 2, 'Probebühne',
         'Schwarze Over-Ear-Kopfhörer, zusammenklappbar.', 'available', true, 'Aufkleber mit Initialen «J. M.» innen am Bügel', 'Akku leer.', 'Garderobe, Schrank 1'),
    (36, o_culture, 'Abo-Karte', 'id_cards', '{blue}', null, 6, 'Kasse',
         'ÖV-Abo in einer blauen Hülle.', 'available', false, 'Lautet auf eine Person mit Initialen «R. S.»', 'Nur nach Ausweis herausgeben.', 'Kasse, Tresor'),
    (37, o_culture, 'Mütze', 'clothing', '{turquoise}', null, 9, 'Garderobe',
         'Türkisfarbene Strickmütze.', 'available', true, 'Eingenähtes Etikett mit Wäschenummer 12', '', 'Garderobe, Fach 1'),
    (38, o_culture, 'Notizbuch', 'other', '{black}', null, 5, 'Saal, Reihe 3',
         'Schwarzes Notizbuch im Format A5.', 'available', true, 'Erste Seite: Skizze eines Bühnenbilds', '', 'Garderobe, Fach 4'),
    (39, o_culture, 'Smartwatch', 'jewellery', '{black}', 'Garmin', 1, 'Foyer, Sitzbank',
         'Schwarze Sportuhr mit Silikonarmband.', 'available', true, 'Displayschutzfolie am Rand gelöst', '', 'Garderobe, Schrank 1'),
    (40, o_culture, 'Brillenetui', 'other', '{violet}', null, 14, 'Saal, Reihe 1',
         'Violettes Brillenetui aus Kunststoff, leer.', 'available', true, 'Name eines Optikers innen', '', 'Garderobe, Fach 4');

  -- Ältester Fund zuerst → Fundnummern steigen pro Fundstelle chronologisch.
  -- Bilder: photo_path «demo/<datei>» zeigt auf public/demo-photos/<datei> im Frontend (gezeichnete
  -- Studioaufnahmen ohne Erkennungsmerkmale, erzeugt mit scripts/demo-photos/generate.py).
  create temporary table demo_photos (org uuid, title text, file text) on commit drop;
  insert into demo_photos values
    (o_school,  'Kabellose Ohrhörer', 'rvs-ohrhoerer-weiss.webp'),
    (o_school,  'Regenjacke',         'bzs-regenjacke-blau.webp'),
    (o_school,  'Rucksack',           'bzs-rucksack-grau.webp'),
    (o_school,  'Schlüsselbund',      'bzs-schluesselbund.webp'),
    (o_school,  'Kapuzenpullover',    'bzs-kapuzenpullover-grau.webp'),
    (o_school,  'Stockschirm',        'bzs-stockschirm-schwarz.webp'),
    (o_school,  'Laptop-Ladegerät',   'nwl-ladegeraet-weiss.webp'),
    (o_school,  'Turnbeutel',         'rvs-turnbeutel-blau.webp'),
    (o_zoo,     'Smartphone mit Hülle', 'fbl-smartphone-gruen.webp'),
    (o_zoo,     'Rucksack',           'fbl-rucksack-schwarz.webp'),
    (o_zoo,     'Trinkflasche',       'bzs-trinkflasche-blau.webp'),
    (o_zoo,     'Sonnenbrille',       'nwl-sonnenbrille-schwarz.webp'),
    (o_zoo,     'Velohelm',           'rvs-velohelm-weiss.webp'),
    (o_zoo,     'Armbanduhr',         'fbl-armbanduhr-silber.webp'),
    (o_hotel,   'Rucksack',           'nwl-rucksack-gruen.webp'),
    (o_hotel,   'Portemonnaie',       'fbl-portemonnaie-schwarz.webp'),
    (o_hotel,   'Ring',               'fbl-ring-gold.webp'),
    (o_culture, 'Winterjacke',        'fbl-kinderjacke-blau.webp'),
    (o_culture, 'Taschenschirm',      'rvs-taschenschirm-rot.webp'),
    (o_culture, 'Kopfhörer',          'bzs-kopfhoerer-schwarz.webp');

  insert into public.found_items
    (organisation_id, title, category, colors, brand, found_on, found_location, public_description, status, is_public,
     photo_path, created_by, created_at)
  select di.org, di.title, di.category, di.colors, di.brand, d - di.days, di.location, di.description, di.status, di.is_public,
         (select 'demo/' || p.file from demo_photos p where p.org = di.org and p.title = di.title),
         (select u.id from demo_users u where u.org = di.org and u.role = 'staff'),
         now() - make_interval(days => di.days, mins => di.nr)
    from demo_items di
   order by di.days desc, di.nr;

  insert into public.found_item_internal (item_id, organisation_id, identifying_feature, internal_note, storage_location)
  select i.id, di.org, di.feature, di.note, di.storage
    from demo_items di
    join public.found_items i on i.organisation_id = di.org and i.title = di.title and i.found_on = d - di.days;

  -- --- Rückgabe-Anfragen (verschiedene Status) ---------------------------------------
  create temporary table demo_claims (
    org uuid, title text, name text, email text, recognition text, message text,
    status public.request_status, hours_ago int, decision text
  ) on commit drop;
  insert into demo_claims values
    (o_school,  'Taschenrechner',  'Sina Lang',    'sina.lang@example.com',    'Auf der Rückseite sind meine Initialen S. L. eingraviert.', 'Brauche ihn für die nächste Prüfung.', 'completed', 240, 'Bitte im Sekretariat abholen.'),
    (o_school,  'Kapuzenpullover', 'Noah Frei',    'noah.frei@example.com',    'Auf dem Etikett steht mein Vorname Noah.', 'Nach dem Sport liegen lassen.', 'confirmed', 30, 'Bitte im Sekretariat abholen und Schülerausweis mitbringen.'),
    (o_school,  'Rucksack',        'Lea Brunner',  'lea.brunner@example.com',  'Grauer Deuter-Rucksack, im Hauptfach sind mein Mathe-Ordner und eine Brotdose.', 'Ich habe ihn in der Bibliothek liegen lassen.', 'open', 6, null),
    (o_zoo,     'Rucksack',        'Elena Rossi',  'elena.rossi@example.com',  'Am Reissverschluss hängt ein kleiner Fuchs-Anhänger, drin ist ein grünes Notizbuch.', 'Beim Mittagessen im Restaurant vergessen.', 'open', 20, null),
    (o_zoo,     'Rucksack',        'Tim Baumann',  'tim.baumann@example.com',  'Er ist schwarz und hat ein Laptopfach.', 'Mein Rucksack ist von Fjällräven.', 'open', 3, null),
    (o_culture, 'Kopfhörer',       'Jana Meier',   'jana.meier@example.com',   'Innen am Bügel klebt ein Sticker mit meinen Initialen J. M.', 'Nach der Probe liegen lassen.', 'open', 5, null),
    (o_hotel,   'Lesebrille',      'Max Muster',   'max.muster@example.com',   'Eine braune Brille in einem Etui.', 'Ist das meine?', 'rejected', 48, 'Die Beschreibung passt nicht zu den Merkmalen.');

  for r in select * from demo_claims loop
    select * into v_item from public.found_items where organisation_id = r.org and title = r.title;
    v_token := public.new_token();
    insert into public.return_requests
      (item_id, organisation_id, token_hash, claimant_name, claimant_email, message, recognition_text, status,
       pickup_instructions, decision_note, created_at, confirmed_at, rejected_at, completed_at)
    values
      (v_item.id, r.org, public.hash_token(v_token), r.name, r.email, r.message, r.recognition, r.status,
       case when r.status in ('confirmed', 'completed') then r.decision end,
       case when r.status = 'rejected' then r.decision end,
       now() - make_interval(hours => r.hours_ago),
       case when r.status in ('confirmed', 'completed') then now() - make_interval(hours => r.hours_ago - 2) end,
       case when r.status = 'rejected' then now() - make_interval(hours => r.hours_ago - 2) end,
       case when r.status = 'completed' then now() - make_interval(hours => r.hours_ago - 24) end)
    returning id into v_id;

    insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
    values (r.org, v_id, r.email, 'Deine Anfrage für «' || v_item.title || '» ist eingegangen',
            'Hallo ' || r.name || E'\n\nDeine Anfrage für «' || v_item.title || '» (' || v_item.item_number
              || ') ist eingegangen. Die Fundstelle prüft deine Angaben, meist innert 1–2 Arbeitstagen. Den Stand siehst du jederzeit über den Link unten.',
            '/anfrage/' || v_token, now() - make_interval(hours => r.hours_ago));

    if r.status in ('confirmed', 'completed') then
      insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
      select r.org, v_id, r.email, 'Deine Anfrage für «' || v_item.title || '» wurde bestätigt',
             'Hallo ' || r.name || E'\n\nGute Nachricht: Die Fundstelle ' || o.name || ' hat deine Anfrage für '
               || v_item.title || ' (' || v_item.item_number || ') bestätigt. Abholen: ' || o.drop_off_location || ', '
               || o.opening_hours || '. Bitte nimm einen Ausweis mit. ' || coalesce(o.pickup_rules, ''),
             '/anfrage/' || v_token, now() - make_interval(hours => r.hours_ago - 2)
        from public.organisations o where o.id = r.org;
    elsif r.status = 'rejected' then
      insert into public.simulated_emails (organisation_id, return_request_id, recipient, subject, body, link_path, created_at)
      values (r.org, v_id, r.email, 'Deine Anfrage für «' || v_item.title || '»',
              'Hallo ' || r.name || E'\n\nLeider passt der Gegenstand ' || v_item.item_number
                || ' nach Prüfung nicht zu deiner Beschreibung.' || E'\n\n' || r.decision
                || E'\n\nDu kannst weiter suchen oder einen Verlust melden – wir melden uns bei einem neuen Treffer.',
              '/anfrage/' || v_token, now() - make_interval(hours => r.hours_ago - 2));
    end if;
  end loop;

  -- --- Verlustmeldungen ---------------------------------------------------------------
  -- Testfälle: Ohrhörer einen Tag vor dem Verlustdatum gefunden (T5), schwarze Kopfhörer
  -- ≠ grünes Smartphone (T6), «Weiss nicht» über alle Fundstellen, eine Meldung ohne Treffer.
  create temporary table demo_reports (
    nr int, org uuid, title text, category public.item_category, colors public.item_color[], brand text,
    lost_days int, location text, description text, name text, email text, created_days int
  ) on commit drop;
  insert into demo_reports values
    (1, o_school,  'Weisse AirPods',     'electronics', '{white}', 'Apple',      2, 'Bus Linie 5',              'Kopfhörer im weissen Ladeetui.',              'Lina Kunz',    'lina.kunz@example.com',    1),
    (2, null,      'Schwarzer Rucksack', 'bags',        '{black}', 'Fjällräven', 6, 'Tierpark oder im Bus',     'Rucksack mit Laptopfach.',                    'Jonas Graf',   'jonas.graf@example.com',   5),
    (3, o_culture, 'Blaue Winterjacke',  'clothing',    '{blue}',  null,         5, 'Saal, nach der Vorstellung','Daunenjacke mit Kapuze.',                    'Sven Imhof',   'sven.imhof@example.com',   4),
    (4, null,      'Schwarze Kopfhörer', 'electronics', '{black}', null,         3, 'Weiss nicht',              'Over-Ear-Kopfhörer.',                         null,           'kim.berger@example.com',   2),
    (5, o_zoo,     'Blaue Brille',       'other',       '{blue}',  null,         2, 'Beim Affenhaus',           'Brille mit blauem Gestell.',                  'Anna Graf',    'anna.graf@example.com',    1),
    -- Testfall KI (7.4): andere Kategorie und andere Wörter als der Fund «Turnbeutel» – die Regeln finden ihn nicht
    (6, o_school,  'Blauer Turnsack',    'sports',      '{blue}',  null,         6, 'Turnhalle',                'Sportsack mit Kordeln, Hallenschuhe drin.',   'Mia Brunner',  'mia.brunner@example.com',  5);

  for r in select * from demo_reports order by nr loop
    v_token := public.new_token();
    insert into public.loss_reports
      (organisation_id, token_hash, reporter_name, reporter_email, title, category, colors, brand, description,
       lost_location, lost_from, lost_to, created_at)
    values
      (r.org, public.hash_token(v_token), r.name, r.email, r.title, r.category, r.colors, r.brand, r.description,
       r.location, d - r.lost_days, d - r.lost_days, now() - make_interval(days => r.created_days))
    returning id into v_id;

    insert into public.simulated_emails (organisation_id, loss_report_id, recipient, subject, body, link_path, created_at)
    values (r.org, v_id, r.email, 'Deine Verlustmeldung «' || r.title || '»',
            public.greeting(r.name) || E'\n\nDanke für deine Meldung «' || r.title
              || '». Wir melden uns, sobald etwas Passendes abgegeben wird. Deine Meldung findest du über den Link unten.',
            '/verlust/' || v_token, now() - make_interval(days => r.created_days));
  end loop;
end;
$$;

revoke all on function public.seed_demo_data() from public, anon, authenticated;

-- Setzt die Demo auf den Ausgangszustand zurück. Nur Admins einer Fundstelle (oder im SQL-Editor).
create function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform public.require_admin();
  end if;
  delete from public.simulated_emails where true;
  delete from public.loss_reports where true;
  delete from public.organisations where true;  -- kaskadiert auf Funde, Anfragen, Mitarbeitende, Zähler, Protokoll
  delete from public.rate_limits where true;
  perform public.seed_demo_data();
end;
$$;

revoke all on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated, service_role;
