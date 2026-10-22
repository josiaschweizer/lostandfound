-- =============================================================================
-- Demo-Daten und Demo-Reset
-- ALLE Daten sind erfunden. Daten liegen relativ zum aktuellen Datum, damit
-- der Abgleich (Zeitfenster 30 Tage) auch später noch Treffer zeigt.
-- Demo-Passwort für alle Demo-Zugänge: demo1234
-- =============================================================================

create function public.seed_demo_data()
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
  o_school  uuid;
  o_city    uuid;
  o_company uuid;
  i_headphones uuid; i_bottle uuid; i_hoodie uuid; i_calculator uuid; i_keys uuid;
  i_wallet uuid; i_umbrella uuid; i_phone uuid; i_ring uuid; i_jacket uuid; i_backpack uuid;
  i_charger uuid; i_badge uuid; i_scarf uuid; i_glasses uuid;
  r_id uuid;
  d constant date := current_date;
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
      (u_lea,   'lea.brunner@bbz-seetal.example',       'Lea Brunner'),
      (u_marco, 'marco.keller@lindenau.example',        'Marco Keller'),
      (u_sara,  'sara.huber@nordwind-logistik.example', 'Sara Huber')
    ) as u(id, email, full_name)
  on conflict (id) do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at;

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         now(), now(), now()
    from auth.users u
   where u.id in (u_lea, u_marco, u_sara)
     and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

  -- --- Organisationen & Fundstellen ----------------------------------------
  insert into public.organisations (slug, name, type, short_code, address)
  values ('bbz-seetal', 'Berufsbildungszentrum Seetal', 'school', 'BZS', 'Seestrasse 12, 5700 Seetal')
  returning id into o_school;

  insert into public.organisations (slug, name, type, short_code, address)
  values ('fundbuero-lindenau', 'Fundbüro Stadt Lindenau', 'lost_property_office', 'FBL', 'Marktplatz 3, 4900 Lindenau')
  returning id into o_city;

  insert into public.organisations (slug, name, type, short_code, address)
  values ('nordwind-logistik', 'Nordwind Logistik AG', 'company', 'NWL', 'Industriestrasse 40, 6300 Talheim')
  returning id into o_company;

  insert into public.found_offices (organisation_id, name, location, contact_email, contact_phone, opening_hours, pickup_notes)
  values
    (o_school, 'Fundstelle Hauswartung', 'Trakt A, Raum A012', 'fundstelle@bbz-seetal.example', '000 000 00 01',
     'Mo–Fr 07:30–12:00 und 13:00–16:30', 'Bitte Schülerausweis oder amtlichen Ausweis mitbringen.'),
    (o_city, 'Fundbüro im Stadthaus', 'Stadthaus, Erdgeschoss, Schalter 4', 'fundbuero@lindenau.example', '000 000 00 02',
     'Mo–Do 08:00–11:30 und 13:30–17:00, Fr 08:00–14:00', 'Amtlicher Ausweis erforderlich.'),
    (o_company, 'Empfang Hauptgebäude', 'Industriestrasse 40, Empfang', 'empfang@nordwind-logistik.example', null,
     'Mo–Fr 07:00–18:00', 'Bitte am Empfang melden und die Fundnummer nennen.');

  insert into public.memberships (user_id, organisation_id, full_name)
  values (u_lea, o_school, 'Lea Brunner'),
         (u_marco, o_city, 'Marco Keller'),
         (u_sara, o_company, 'Sara Huber');

  -- --- Fundgegenstände ---------------------------------------------------------
  -- Berufsbildungszentrum Seetal
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_school, 'Kabellose Kopfhörer', 'electronics', 'black', 'Sony', d - 3, 'Mensa, Tisch beim Fenster',
          'Over-Ear-Kopfhörer in einem Etui.') returning id into i_headphones;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_school, 'Trinkflasche aus Metall', 'sports', 'blue', null, d - 5, 'Turnhalle, Garderobe Süd',
          'Trinkflasche, ca. 0,75 Liter.') returning id into i_bottle;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description, status)
  values (o_school, 'Kapuzenpullover', 'clothing', 'grey', null, d - 8, 'Schulzimmer B204',
          'Grauer Pullover mit Kapuze, Grösse M.', 'reserved') returning id into i_hoodie;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description, status)
  values (o_school, 'Taschenrechner', 'electronics', 'grey', 'Texas Instruments', d - 12, 'Prüfungsraum C1',
          'Wissenschaftlicher Taschenrechner.', 'returned') returning id into i_calculator;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_school, 'Schlüsselbund', 'keys', 'multicolor', null, d - 2, 'Veloständer Ost',
          'Mehrere Schlüssel mit Anhänger.') returning id into i_keys;

  -- Fundbüro Stadt Lindenau
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Portemonnaie', 'wallets', 'black', null, d - 4, 'Bushaltestelle Bahnhof',
          'Portemonnaie aus Leder.') returning id into i_wallet;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Taschenschirm', 'other', 'red', 'Knirps', d - 6, 'Tram Linie 3',
          'Zusammenklappbarer Regenschirm.') returning id into i_umbrella;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Smartphone mit Hülle', 'electronics', 'green', 'Apple', d - 1, 'Stadtpark, Parkbank beim Weiher',
          'Smartphone in einer Schutzhülle. Gerät ist gesperrt.') returning id into i_phone;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Ring', 'jewellery', 'gold', null, d - 15, 'Hallenbad, Garderobe',
          'Schmaler Ring.') returning id into i_ring;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Kinderjacke', 'clothing', 'blue', null, d - 20, 'Spielplatz Lindenhof',
          'Regenjacke für Kinder, ca. Grösse 116.') returning id into i_jacket;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_city, 'Rucksack', 'bags', 'black', 'Fjällräven', d - 9, 'Bahnhof, Wartesaal',
          'Rucksack mit Laptopfach.') returning id into i_backpack;

  -- Nordwind Logistik AG
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_company, 'Laptop-Ladegerät', 'electronics', 'white', 'Lenovo', d - 2, 'Sitzungszimmer Säntis',
          'USB-C-Netzteil mit Kabel.') returning id into i_charger;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description, is_public)
  values (o_company, 'Badge-Etui mit Schlüssel', 'keys', 'blue', null, d - 7, 'Parkhaus, Ebene 2',
          'Etui mit Firmenbadge. Nur intern sichtbar.', false) returning id into i_badge;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_company, 'Wollschal', 'clothing', 'brown', null, d - 11, 'Kantine',
          'Langer Schal aus Wolle.') returning id into i_scarf;
  insert into public.found_items (organisation_id, title, category, color, brand, found_on, found_location, public_description)
  values (o_company, 'Sonnenbrille', 'other', 'black', 'Ray-Ban', d - 25, 'Lobby, Sitzecke',
          'Sonnenbrille ohne Etui.') returning id into i_glasses;

  -- Interne Angaben (nie öffentlich sichtbar)
  insert into public.found_item_internal (item_id, organisation_id, identifying_feature, internal_note, storage_location)
  values
    (i_headphones, o_school, 'Aufkleber mit Initialen «J. M.» innen am Bügel', 'Akku leer.', 'Schrank A, Fach 2'),
    (i_bottle,     o_school, 'Delle am Boden, Aufkleber eines Kletterzentrums', '', 'Regal Turnhalle'),
    (i_hoodie,     o_school, 'Name auf dem Etikett: «Noah»', '', 'Schrank A, Fach 4'),
    (i_calculator, o_school, 'Gravur «S. L.» auf der Rückseite', '', 'Ausgegeben'),
    (i_keys,       o_school, 'Anhänger: roter Fussball, ein Schlüssel mit Nummer 47', '', 'Schlüsselkasten'),
    (i_wallet,     o_city,   'Enthält Bibliotheksausweis der Stadtbibliothek', 'Bargeld gezählt und protokolliert.', 'Tresor, Fach W-12'),
    (i_umbrella,   o_city,   'Griff mit weissem Klebeband umwickelt', '', 'Schirmständer Lager'),
    (i_phone,      o_city,   'Sperrbildschirm zeigt einen Hund am Strand; Riss oben links', 'Gerät ausgeschaltet gelagert.', 'Tresor, Fach E-03'),
    (i_ring,       o_city,   'Gravur innen: Datum und zwei Initialen', '', 'Tresor, Fach S-01'),
    (i_jacket,     o_city,   'Namensschild im Kragen: «Lia»', '', 'Regal K-2'),
    (i_backpack,   o_city,   'Fuchs-Anhänger am Reissverschluss, Inhalt: Notizbuch mit grünem Umschlag', 'Zwei Anfragen offen – Merkmale vergleichen!', 'Regal T-5'),
    (i_charger,    o_company,'Inventarnummer NW-IT-2231', 'Vermutlich von externem Besuch.', 'Empfangstheke, Schublade 1'),
    (i_badge,      o_company,'Badge auf Mitarbeitende Logistik ausgestellt', 'IT informieren, falls nicht abgeholt.', 'Empfang, Tresor'),
    (i_scarf,      o_company,'Kleines Loch am Ende', '', 'Garderobe Empfang'),
    (i_glasses,    o_company,'Kratzer am linken Glas', '', 'Empfangstheke, Schublade 2');

  -- --- Rückgabeanfragen (verschiedene Stände) --------------------------------
  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, status, pickup_instructions, decided_at, created_at)
  values (i_hoodie, o_school, 'Noah Frei', 'noah.frei@example.com', 'Habe ihn nach dem Englischunterricht liegen lassen.',
          'Auf dem Etikett steht mein Vorname Noah.', 'confirmed',
          'Bitte während der Öffnungszeiten in Raum A012 abholen und Schülerausweis mitbringen.', now() - interval '1 day', now() - interval '2 days');

  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, status, pickup_instructions, decided_at, created_at)
  values (i_calculator, o_school, 'Sina Lang', 'sina.lang@example.com', 'Brauche ihn für die nächste Prüfung.',
          'Auf der Rückseite sind meine Initialen S. L. eingraviert.', 'completed',
          'Abholung in Raum A012.', now() - interval '9 days', now() - interval '10 days');

  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, created_at)
  values (i_headphones, o_school, 'Jana Meier', 'jana.meier@example.com', 'Ich glaube, das sind meine.',
          'Innen am Bügel klebt ein Sticker mit meinen Initialen J. M.', now() - interval '5 hours')
  returning id into r_id;
  perform public.queue_email(o_school, 'fundstelle@bbz-seetal.example', 'Neue Rückgabeanfrage zu Kabellose Kopfhörer',
    'Jana Meier hat eine Rückgabe angefragt. Bitte die Angaben in der Verwaltung prüfen.', '/verwaltung/anfragen/' || r_id, r_id, null);

  -- Zwei Personen beanspruchen denselben Rucksack.
  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, created_at)
  values (i_backpack, o_city, 'Elena Rossi', 'elena.rossi@example.com', 'Am Bahnhof vergessen, als ich umgestiegen bin.',
          'Am Reissverschluss hängt ein kleiner Fuchs-Anhänger, drin ist ein grünes Notizbuch.', now() - interval '1 day');
  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, created_at)
  values (i_backpack, o_city, 'Tim Baumann', 'tim.baumann@example.com', 'Mein Rucksack ist schwarz und von Fjällräven.',
          'Er ist schwarz und hat ein Laptopfach.', now() - interval '3 hours');

  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, status, decision_note, decided_at, created_at)
  values (i_wallet, o_city, 'Max Muster', 'max.muster@example.com', 'Ist das meins?',
          'Ein schwarzes Portemonnaie.', 'rejected', 'Beschreibung zu allgemein.', now() - interval '1 day', now() - interval '2 days');

  insert into public.return_requests (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description, created_at)
  values (i_charger, o_company, 'Daniel Graf', 'daniel.graf@example.com', 'War letzte Woche an einem Meeting bei Ihnen.',
          'Auf dem Netzteil klebt eine Inventarnummer, die mit NW-IT beginnt.', now() - interval '20 hours');

  -- --- Verlustmeldungen --------------------------------------------------------
  insert into public.loss_reports (organisation_id, reporter_name, reporter_contact, title, category, color, brand, lost_on, lost_location, description, created_at)
  values
    (o_school, 'Lena Keller', 'lena.keller@example.com', 'Blaue Trinkflasche', 'sports', 'blue', null, d - 6,
     'Turnhalle', 'Metallflasche mit Aufkleber eines Kletterzentrums.', now() - interval '5 days'),
    (null, 'Jonas Weber', 'jonas.weber@example.com', 'Schwarzer Rucksack', 'bags', 'black', 'Fjällräven', d - 10,
     'Irgendwo zwischen Bahnhof und Arbeit', 'Rucksack mit Laptopfach und Fuchs-Anhänger.', now() - interval '8 days'),
    (o_city, 'Mia Steiner', 'mia.steiner@example.com', 'Roter Regenschirm', 'other', 'red', null, d - 7,
     'Tram', 'Kleiner roter Schirm.', now() - interval '6 days'),
    (null, 'Anna Graf', 'anna.graf@example.com', 'Laptop', 'electronics', 'grey', 'Dell', d - 3,
     'Unbekannt', 'Grauer Laptop in schwarzer Hülle.', now() - interval '2 days');
end;
$$;

revoke all on function public.seed_demo_data() from public, anon, authenticated;

-- Setzt die Demo auf den Ausgangszustand zurück. NUR FÜR DEN SCHULPROTOTYP:
-- Jede Person mit Zugriff auf die Seite kann diese Funktion aufrufen.
create function public.reset_demo()
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
                    '00000000-0000-4000-a000-000000000003');
  perform public.seed_demo_data();
end;
$$;

revoke all on function public.reset_demo() from public;
grant execute on function public.reset_demo() to anon, authenticated;
