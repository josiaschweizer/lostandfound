\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{}', false); set role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role','authenticated')::text, false); set role authenticated;
  end if;
end $$;
create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL: %', msg; end if; raise notice 'ok: %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok: % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (no error): %', msg;
end $$;

-- ===== Anonym =====
select pg_temp.as_user(null);
select pg_temp.check((select count(*) from public.found_items) = 29, 'anon sieht nur öffentliche, nicht zurückgegebene Gegenstände (29)');
select pg_temp.check(not exists (select 1 from public.found_items where status='returned' or not is_public), 'anon: keine zurückgegebenen/internen');
select pg_temp.fails('select internal_note from public.found_item_internal', 'anon kann interne Angaben nicht lesen');
select pg_temp.fails('select updated_at from public.found_items', 'anon kann nicht-öffentliche Spalten nicht lesen');
select pg_temp.fails('select * from public.return_requests', 'anon kann Anfragen nicht lesen');
select pg_temp.fails('select * from public.loss_reports', 'anon kann Verlustmeldungen nicht lesen');
select pg_temp.fails('select * from public.simulated_emails', 'anon kann E-Mails nicht lesen');
select pg_temp.fails($$insert into public.found_items (organisation_id,title,category,color,found_on,found_location) select id,'x','other','red',current_date,'x' from public.organisations limit 1$$, 'anon kann keine Gegenstände erfassen');
select pg_temp.fails($$select public.seed_demo_data()$$, 'anon kann seed_demo_data nicht aufrufen');
select pg_temp.fails($$select public.queue_email(null,'a','b','c')$$, 'anon kann keine E-Mails einreihen');
select pg_temp.fails($$select public.decide_return_request(gen_random_uuid(), true)$$, 'anon kann nicht entscheiden');

-- Rückgabe anfragen
create temp table t_tok as select public.submit_return_request(
  (select id from public.found_items where title='Trinkflasche aus Metall'), 'Test Person', 'test@example.com', 'Hallo', 'Aufkleber Kletterzentrum') as tok;
select pg_temp.check((select public.get_return_request_status(tok)->>'status' from t_tok) = 'open', 'Statusseite per Token: open');
select pg_temp.check((select jsonb_array_length(public.get_return_request_status(tok)->'emails') from t_tok) = 1, 'Suchende sehen nur ihre eigene Bestätigungsmail');
select pg_temp.check(public.get_return_request_status(gen_random_uuid()) is null, 'falsches Token liefert nichts');
select pg_temp.fails($$select public.submit_return_request((select id from public.found_items where title='Trinkflasche aus Metall'), '', 'x', '', 'y')$$, 'Pflichtfelder bei Anfrage');
select pg_temp.check((select status from public.found_items where title='Trinkflasche aus Metall')='available', 'Anfrage ändert Status NICHT');

-- Verlustmeldung
create temp table t_lr as select public.submit_loss_report(null, 'Frau Test', 'ft@example.com', 'Schwarze Kopfhörer', 'electronics', 'black', 'Sony', current_date - 4, 'Mensa', 'Over-Ear') as tok;
select pg_temp.check((select public.get_loss_report(tok)->>'title' from t_lr) = 'Schwarze Kopfhörer', 'Verlustmeldung per Token lesbar');
select pg_temp.fails($$select public.submit_loss_report(null, 'a', 'b', 'c', 'other', 'red', null, current_date + 3, '', '')$$, 'Verlustdatum in Zukunft abgelehnt');
reset role;

-- ===== Mitarbeitende Schule (Lea) =====
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select pg_temp.check((select count(*) from public.found_items where organisation_id = public.current_organisation_id()) = 9, 'Lea sieht 9 eigene Gegenstände inkl. zurückgegebener');
select pg_temp.check((select count(*) from public.found_item_internal) = 9, 'Lea sieht nur interne Angaben der eigenen Org');
select pg_temp.check((select count(*) from public.found_items i join public.organisations o on o.id=i.organisation_id where o.short_code='NWL' and not i.is_public) = 0, 'Lea sieht interne (nicht öffentliche) Gegenstände anderer Orgs nicht');
select pg_temp.check((select count(distinct organisation_id) from public.return_requests) = 1, 'Lea sieht nur Anfragen der eigenen Org');
select pg_temp.check((select count(*) from public.return_requests) = 4, 'Lea sieht 4 Anfragen (3 Seed + 1 Test)');
select pg_temp.check((select count(*) from public.loss_reports where organisation_id is not null and organisation_id <> public.current_organisation_id()) = 0, 'Lea sieht keine Meldungen anderer Orgs');
select pg_temp.check((select count(*) from public.loss_reports where organisation_id is null) = 4, 'Lea sieht «weiss nicht»-Meldungen (4)');
select pg_temp.check((select count(*) from public.simulated_emails where organisation_id <> public.current_organisation_id()) = 0, 'Lea sieht nur eigenen Postausgang');

with u as (update public.found_items set title='hack' where organisation_id <> public.current_organisation_id() returning 1)
select pg_temp.check((select count(*) from u) = 0, 'Lea kann fremde Gegenstände nicht ändern');
select pg_temp.fails($$insert into public.found_items (organisation_id,title,category,color,found_on,found_location) select id,'x','other','red',current_date,'x' from public.organisations where short_code='FBL'$$, 'Lea kann nicht für fremde Org erfassen');
select pg_temp.fails($$update public.found_items set status='returned' where title='Kabellose Kopfhörer'$$, 'Status nicht direkt änderbar');
select pg_temp.fails($$insert into public.found_item_internal (item_id, organisation_id) select id, public.current_organisation_id() from public.found_items where title='Wollschal'$$, 'Lea kann keine internen Angaben an fremde Gegenstände hängen');

-- Gegenstand erfassen → Fundnummer
insert into public.found_items (organisation_id,title,category,color,found_on,found_location,public_description)
values (public.current_organisation_id(),'Testjacke','clothing','red',current_date,'Aula','Rote Jacke');
select pg_temp.check((select item_number from public.found_items where title='Testjacke') = 'BZS-' || to_char(current_date,'YYYY') || '-0010', 'Fundnummer fortlaufend: BZS-JJJJ-0010');
select pg_temp.fails($$update public.found_items set item_number='X' where title='Testjacke'$$, 'Fundnummer nicht änderbar (Spaltenrecht)');
update public.found_items set title='Testjacke 2' where title='Testjacke';
select pg_temp.check((select item_number from public.found_items where title='Testjacke 2') like 'BZS-%', 'Fundnummer unveränderlich');
insert into public.found_item_internal (item_id, organisation_id, internal_note, storage_location)
select id, public.current_organisation_id(), 'geheim', 'Fach 9' from public.found_items where title='Testjacke 2';
reset role;
select pg_temp.as_user(null);
select pg_temp.check(exists (select 1 from public.found_items where title='Testjacke 2'), 'Neuer Gegenstand sofort im öffentlichen Katalog');
reset role;

-- Anfrage-Workflow mit zwei Anfragen auf die Kopfhörer
select pg_temp.as_user(null);
select public.submit_return_request((select id from public.found_items where title='Kabellose Kopfhörer'), 'Zweite Person', 'zweite@example.com', '', 'Schwarz');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
select public.decide_return_request((select id from public.return_requests where claimant_name='Jana Meier'), true, null, null);
select pg_temp.check((select status from public.found_items where title='Kabellose Kopfhörer')='reserved', 'Bestätigung reserviert Gegenstand');
select pg_temp.check((select pickup_instructions from public.return_requests where claimant_name='Jana Meier') is not null, 'Abholhinweise gesetzt');
select pg_temp.fails($$select public.decide_return_request((select id from public.return_requests where claimant_name='Zweite Person'), true)$$, 'Zweite Bestätigung verhindert');
select pg_temp.fails($$select public.change_item_status((select id from public.found_items where title='Kabellose Kopfhörer'), 'available')$$, 'Verfügbar trotz bestätigter Anfrage verhindert');
select public.change_item_status((select id from public.found_items where title='Kabellose Kopfhörer'), 'returned');
select pg_temp.check((select status from public.return_requests where claimant_name='Jana Meier')='completed', 'Rückgabe schliesst bestätigte Anfrage ab');
select pg_temp.check((select status from public.return_requests where claimant_name='Zweite Person')='open', 'Andere Anfrage bleibt offen');
select public.decide_return_request((select id from public.return_requests where claimant_name='Zweite Person'), false, null, 'Bereits übergeben');
select pg_temp.check((select status from public.return_requests where claimant_name='Zweite Person')='rejected', 'Ablehnen');
select pg_temp.fails($$select public.decide_return_request((select id from public.return_requests where claimant_name='Elena Rossi'), true)$$, 'Fremde Anfrage nicht entscheidbar');
-- Ablehnen einer bestätigten Anfrage gibt Gegenstand wieder frei
select public.decide_return_request((select id from public.return_requests where claimant_name='Noah Frei'), false, null, null);
select pg_temp.check((select status from public.found_items where title='Kapuzenpullover')='available', 'Ablehnen der bestätigten Anfrage gibt frei');
-- Treffer melden
select pg_temp.check(public.notify_loss_report_match((select id from public.loss_reports where title='Blaue Trinkflasche'), (select id from public.found_items where title='Trinkflasche aus Metall')), 'Treffer-Mail versendet (simuliert)');
select pg_temp.check(not public.notify_loss_report_match((select id from public.loss_reports where title='Blaue Trinkflasche'), (select id from public.found_items where title='Trinkflasche aus Metall')), 'Keine doppelte Treffer-Mail');
select pg_temp.check(not public.notify_loss_report_match((select id from public.loss_reports where title='Blaue Trinkflasche'), (select id from public.found_items where title='Wollschal')), 'Kein Treffer mit fremdem Gegenstand');
select pg_temp.fails($$select public.register_organisation('a','b','school','c','d','e','f','g','h','i')$$, 'Bereits zugeordnetes Konto kann keine zweite Org anlegen');
reset role;

-- ===== Mitarbeitende Fundbüro (Marco) =====
select pg_temp.as_user('00000000-0000-4000-a000-000000000002');
select pg_temp.check((select count(*) from public.found_item_internal where organisation_id <> public.current_organisation_id()) = 0, 'Marco sieht keine internen Angaben anderer Orgs');
select pg_temp.check((select count(*) from public.return_requests where claimant_name in ('Jana Meier','Noah Frei')) = 0, 'Marco sieht Anfragen der Schule nicht');
select pg_temp.check((select count(*) from public.loss_reports where title='Blaue Trinkflasche') = 0, 'Marco sieht an Schule gerichtete Meldung nicht');
reset role;

-- ===== Neue Organisation registrieren =====
insert into auth.users (id, email) values ('11111111-1111-4111-a111-111111111111', 'neu@example.com');
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
select pg_temp.check(public.current_organisation_id() is null, 'Neues Konto ohne Org');
select pg_temp.check((select count(*) from public.found_item_internal) = 0, 'Konto ohne Org sieht keine internen Daten');
select pg_temp.check((select count(*) from public.loss_reports) = 0, 'Konto ohne Org sieht keine Meldungen');
select pg_temp.fails($$select public.register_organisation('Hans','','school','x','','y','z','w','','')$$, 'Pflichtfelder bei Registrierung');
select pg_temp.check(public.register_organisation('Hans Test','Berufsbildungszentrum Seetal','school','Weg 1','','Raum 1','f@example.com','','Mo–Fr','') = 'berufsbildungszentrum-seetal', 'Slug erzeugt');
select pg_temp.check((select short_code from public.organisations where slug='berufsbildungszentrum-seetal') = 'BS', 'Kürzel aus Initialen: BS');
reset role;
insert into auth.users (id, email) values ('22222222-2222-4222-a222-222222222222', 'neu2@example.com');
select pg_temp.as_user('22222222-2222-4222-a222-222222222222');
select pg_temp.check(public.register_organisation('Eva','Berufsbildungszentrum Seetal','school','Weg 1','','Raum 1','f@example.com','','Mo','') = 'berufsbildungszentrum-seetal-2', 'Slug-Kollision → -2');
select pg_temp.check((select short_code from public.organisations where slug='berufsbildungszentrum-seetal-2') = 'BSA', 'Kürzel-Kollision → BSA');
select pg_temp.check((select count(*) from public.memberships) = 1, 'Neue Org sieht nur eigenes Mitglied');
reset role;
insert into auth.users (id, email) values ('33333333-3333-4333-a333-333333333333', 'neu3@example.com');
select pg_temp.as_user('33333333-3333-4333-a333-333333333333');
select public.register_organisation('Ida','Berufsbildungszentrum Seetal','school','Weg 1','','Raum 1','f@example.com','','Mo','');
select pg_temp.check((select short_code from public.organisations where slug='berufsbildungszentrum-seetal-3') = 'BSB', 'Dritte Kollision → BSB (wächst nicht unbegrenzt)');
reset role;

-- ===== Storage =====
select pg_temp.as_user('00000000-0000-4000-a000-000000000001');
insert into storage.objects (bucket_id, name) select 'item-photos', public.current_organisation_id()::text || '/a.jpg';
select pg_temp.fails($$insert into storage.objects (bucket_id, name) select 'item-photos', (select id from public.organisations where short_code='FBL')::text || '/a.jpg'$$, 'Upload in fremden Ordner verhindert');
reset role;

-- ===== Reset =====
select pg_temp.as_user(null);
select public.reset_demo();
reset role;
select pg_temp.check((select count(*) from public.organisations) = 4, 'Reset: 4 Organisationen');
select pg_temp.check((select count(*) from public.found_items) = 31, 'Reset: 31 Gegenstände');
select pg_temp.check((select count(*) from public.return_requests) = 9, 'Reset: 9 Anfragen');
select pg_temp.check((select count(*) from auth.users) = 4, 'Reset: neue Konten entfernt');
select pg_temp.check((select count(*) from auth.identities) = 4, 'Reset: Identitäten vorhanden');
select pg_temp.check((select extensions.crypt('demo1234', encrypted_password) = encrypted_password from auth.users where email='lea.brunner@bbz-seetal.example'), 'Demo-Passwort funktioniert');
select pg_temp.check((select count(*) from public.found_items where photo_path like 'demo/%.webp') = 26, 'Reset: 26 Gegenstände mit Beispielbild, 5 ohne');
select pg_temp.check((select count(*) from public.loss_reports) = 7, 'Reset: 7 Verlustmeldungen');
select pg_temp.check(not exists (
  select 1 from public.found_items a join public.found_items b
    on a.organisation_id = b.organisation_id and a.found_on < b.found_on and a.item_number > b.item_number
), 'Reset: Fundnummern steigen chronologisch');
select pg_temp.check((select id from public.found_items where title = 'Kabellose Kopfhörer') = '00000000-0000-4000-c000-000000000001', 'Reset: feste IDs der Gegenstände');
select pg_temp.as_user('00000000-0000-4000-a000-000000000004');
select pg_temp.check((select count(*) from public.found_item_internal) = 6, 'Luca (Regionalverkehr) sieht nur eigene 6 internen Angaben');
select pg_temp.check((select count(*) from public.return_requests) = 1, 'Luca sieht nur die eigene Anfrage');
reset role;

-- ===== E-Mail-Versand =====
select pg_temp.check((select count(*) from net.calls) = 0, 'Ohne Konfiguration: kein Versand-Aufruf');
select pg_temp.check((select bool_and(delivery_status = 'skipped') from public.simulated_emails), 'Ohne Konfiguration: alle Mails nur simuliert');
insert into vault.decrypted_secrets values ('email_function_url', 'https://test.supabase.co/functions/v1/send-email'), ('email_webhook_secret', 's3cret');
select pg_temp.as_user(null);
select public.submit_loss_report(null, 'Echt Person', 'echt.person@gmail.com', 'Velo-Helm', 'sports', 'white', null, current_date, '', '');
select public.submit_loss_report(null, 'Test Person', 'test@example.com', 'Velo-Helm', 'sports', 'white', null, current_date, '', '');
select public.submit_loss_report(null, 'Tel Person', '+41 00 000 00 00', 'Velo-Helm', 'sports', 'white', null, current_date, '', '');
reset role;
select pg_temp.check((select delivery_status from public.simulated_emails where recipient = 'echt.person@gmail.com') = 'pending', 'Echte Adresse: Versand ausgelöst (pending)');
select pg_temp.check((select delivery_status from public.simulated_emails where recipient = 'test@example.com') = 'skipped', 'Test-Domain example.com: nicht versendet');
select pg_temp.check((select delivery_status from public.simulated_emails where recipient = '+41 00 000 00 00') = 'skipped', 'Telefonnummer: nicht versendet');
select pg_temp.check((select count(*) from net.calls) = 1, 'Genau ein Aufruf der Edge Function');
select pg_temp.check((select headers->>'x-webhook-secret' from net.calls limit 1) = 's3cret', 'Aufruf enthält Webhook-Secret');
select pg_temp.check((select (body->>'id')::uuid from net.calls limit 1) = (select id from public.simulated_emails where recipient = 'echt.person@gmail.com'), 'Aufruf enthält Mail-ID');
select pg_temp.check((select public.get_loss_report(access_token)->'emails'->0->>'deliveryStatus' from public.loss_reports where reporter_contact = 'echt.person@gmail.com') = 'pending', 'Statusseite zeigt Versandstatus');
select pg_temp.as_user(null);
select pg_temp.fails($$select public.email_setting('email_webhook_secret')$$, 'anon kann Secrets nicht lesen');
reset role;
