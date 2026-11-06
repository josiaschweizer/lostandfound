-- SQL-Checks für lostandfound (pnpm db:check). Jede Prüfung meldet «ok: …» oder bricht mit «FAIL: …» ab.
-- Läuft nach Migrationen + Seed in einer frischen Datenbank (siehe run.sh).
\set ON_ERROR_STOP 1

create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok: %', msg; end $$;

create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok: % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (kein Fehler): %', msg;
end $$;

-- Rolle wechseln: null = anonym, sonst angemeldet mit dieser Benutzer-ID
create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{}', false); set role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, false);
    set role authenticated;
  end if;
end $$;

create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claims', '{}', false); end $$;

grant execute on all functions in schema pg_temp to anon, authenticated;

-- Demo-Konten
\set u_bsm_admin '''00000000-0000-4000-a000-000000000001'''
\set u_bsm_staff '''00000000-0000-4000-a000-000000000002'''
\set u_tps_admin '''00000000-0000-4000-a000-000000000003'''
\set u_tps_staff '''00000000-0000-4000-a000-000000000004'''
\set u_kap_staff '''00000000-0000-4000-a000-000000000008'''

-- ===== Seed =====
select pg_temp.check((select count(*) from public.organisations) = 4, 'Seed: 4 Fundstellen');
select pg_temp.check((select count(*) from public.found_items) = 40, 'Seed: 40 Funde');
select pg_temp.check((select count(*) from public.found_item_internal) = 40, 'Seed: interne Angaben zu allen Funden');
select pg_temp.check((select count(*) from public.memberships where role = 'admin') = 4
                 and (select count(*) from public.memberships where role = 'staff') = 4, 'Seed: je ein Admin und eine Person Mitarbeitende pro Fundstelle');
select pg_temp.check((select count(*) from public.loss_reports) = 5, 'Seed: 5 Verlustmeldungen');
select pg_temp.check((select count(distinct status) from public.return_requests) = 4, 'Seed: Anfragen in allen Status');
select pg_temp.check((select item_number from public.found_items where title = 'Kabellose Ohrhörer') ~ '^BSM-\d{4}-\d{4}$', 'Fundnummer im Format KÜRZEL-JJJJ-NNNN');
select pg_temp.check(not exists (select 1 from public.found_item_internal where trim(storage_location) = ''), 'Aufbewahrungsort ist bei allen Funden gesetzt');

-- ===== Anonym =====
select pg_temp.as_user(null);
select pg_temp.check((select count(*) from public.public_items) = 36, 'anon sieht 36 öffentliche Funde (ohne zurückgegeben, entsorgt, nicht öffentlich)');
select pg_temp.check(not exists (select 1 from public.public_items where status not in ('available', 'reserved')), 'public_items: nur verfügbar/reserviert');
select pg_temp.check((select count(*) from public.organisations) = 4, 'anon liest Fundstellen');
select pg_temp.fails('select 1 from public.found_items', 'anon liest found_items nicht direkt');
select pg_temp.fails('select 1 from public.found_item_internal', 'anon liest interne Angaben nicht');
select pg_temp.fails('select 1 from public.loss_reports', 'anon liest Verlustmeldungen nicht');
select pg_temp.fails('select 1 from public.return_requests', 'anon liest Anfragen nicht');
select pg_temp.fails('select 1 from public.simulated_emails', 'anon liest den Postausgang nicht');
select pg_temp.fails('select 1 from public.rate_limits', 'anon liest rate_limits nicht');
select pg_temp.fails('select 1 from public.ai_calls', 'anon liest ai_calls nicht');
select pg_temp.fails($$insert into public.loss_reports (token_hash, reporter_email, title, category, lost_from, lost_to) values ('x', 'a@b.ch', 'Test', 'other', current_date, current_date)$$, 'anon schreibt nicht direkt in Tabellen');
select pg_temp.fails('select public.save_item(null, $$x$$, $$other$$, $${black}$$, null, current_date, $$x$$, $$x$$, null, null, null, true, null)', 'anon kann keine Funde erfassen');
select pg_temp.fails('select public.reset_demo()', 'anon kann die Demo nicht zurücksetzen');
select pg_temp.fails('select public.seed_demo_data()', 'anon kann seed_demo_data nicht aufrufen');
select pg_temp.fails('select public.purge_old_contacts()', 'anon kann purge_old_contacts nicht aufrufen');
select pg_temp.fails('select public.ai_allow($$k$$, 1, 60, 1)', 'anon kann ai_allow nicht aufrufen');
select pg_temp.as_admin();

select pg_temp.check(not exists (
  select 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'public_items'
     and column_name in ('identifying_feature', 'internal_note', 'storage_location', 'created_by', 'is_public')
), 'View public_items enthält keine internen Spalten');

-- ===== Verlust melden (anonym) =====
select pg_temp.as_user(null);
create temporary table t_tokens (name text primary key, token text);
grant all on t_tokens to anon, authenticated;
insert into t_tokens values ('loss', public.create_loss_report(
  null, 'Weisse Ohrhörer', 'electronics', '{white}', 'Apple', 'Im Ladeetui', 'Gravur L. K.', 'Bus Linie 5',
  public.today_ch() - 2, public.today_ch() - 2, false, 'test.person@example.com', 'Test Person'));
select pg_temp.check(length((select token from t_tokens where name = 'loss')) >= 43, 'Token hat mind. 256 Bit (base64url)');
select pg_temp.check((select public.get_my_loss(token) ->> 'title' from t_tokens where name = 'loss') = 'Weisse Ohrhörer', 'get_my_loss liefert die Meldung mit gültigem Token');
select pg_temp.check(public.get_my_loss('falsch') is null, 'get_my_loss liefert nichts mit falschem Token');
select pg_temp.check((select (public.get_my_loss(token) -> 'matches' -> 0 ->> 'title') from t_tokens where name = 'loss') = 'Kabellose Ohrhörer',
  'Ohrhörer einen Tag vor dem Verlustdatum gefunden erscheint als bester Treffer (T5)');
select pg_temp.check((select jsonb_array_length(public.get_my_loss(token) -> 'emails') from t_tokens where name = 'loss') = 1, 'Bestätigungs-E-Mail an die meldende Person');
select pg_temp.check(not exists (
  select 1 from t_tokens t, jsonb_array_elements(public.get_my_loss(t.token) -> 'matches') m
   where t.name = 'loss' and (m ? 'identifyingFeature' or m ? 'storageLocation' or m ? 'internalNote' or m ? 'score')),
  'Öffentliche Treffer enthalten keine internen Angaben und keinen Score');
select pg_temp.check(jsonb_array_length(public.match_for_draft(null, 'Rucksack', 'bags', '{black}', null, '', '', public.today_ch() - 6, public.today_ch() - 6)) between 1 and 5,
  'match_for_draft liefert Treffer während des Ausfüllens (max. 5)');
select pg_temp.fails($$select public.create_loss_report(null, 'X', 'other', '{}', null, '', '', '', current_date, current_date, false, 'a@b.ch', null)$$, 'Titel mit weniger als 2 Zeichen wird abgelehnt');
select pg_temp.fails($$select public.create_loss_report(null, 'Jacke', 'clothing', '{}', null, '', '', '', public.today_ch() + 1, public.today_ch() + 1, false, 'a@b.ch', null)$$, 'Verlustdatum in der Zukunft wird abgelehnt');
select pg_temp.fails($$select public.create_loss_report(null, 'Jacke', 'clothing', '{}', null, '', '', '', current_date, current_date, false, 'keine-mail', null)$$, 'Ungültige E-Mail wird abgelehnt');
select pg_temp.check((select public.close_my_loss(token) from t_tokens where name = 'loss'), 'Meldung über den Link schliessen');
select pg_temp.check((select public.get_my_loss(token) ->> 'status' from t_tokens where name = 'loss') = 'closed', 'Meldung ist danach erledigt');
select pg_temp.as_admin();
select pg_temp.check(not exists (select 1 from public.loss_reports l join t_tokens t on true where convert_to(t.token, 'UTF8') = l.token_hash),
  'In der Datenbank steht nur der Hash des Tokens');
insert into t_tokens values ('uncertain', public.create_loss_report(null, 'Velohelm', 'sports', '{white}', null, '', '', '', null, null, true, 'x@example.com', null));
select pg_temp.check((select lost_from = public.today_ch() - 14 and lost_to = public.today_ch() and lost_date_uncertain from public.loss_reports
                       where token_hash = (select public.hash_token(token) from t_tokens where name = 'uncertain')),
  '«Weiss nicht genau» setzt ein Fenster von 14 Tagen');

-- ===== Rückgabe-Anfrage (anonym) =====
create temporary table t_ids (name text primary key, id uuid);
grant all on t_ids to anon, authenticated;
insert into t_ids select 'wallet', id from public.found_items where title = 'Portemonnaie';
select pg_temp.as_user(null);
select pg_temp.fails($$select public.create_claim((select id from t_ids where name = 'wallet'), 'Enthält meine ID-Karte', 'a@example.com', 'A', null, '', false, null)$$,
  'Nicht öffentliche Funde können nicht angefragt werden');
select pg_temp.fails($$select public.create_claim((select id from public.public_items where title = 'Sonnenbrille'), 'zu kurz', 'a@example.com', 'A', null, '', false, null)$$,
  '«Woran erkennst du…» braucht mind. 10 Zeichen');
select pg_temp.fails($$select public.create_claim((select id from public.public_items where title = 'Sonnenbrille'), 'Kratzer am linken Glas', 'a@example.com', 'A', null, '', true, '')$$,
  '«Jemand anderes holt ab» braucht einen Namen');
insert into t_tokens values ('claim', public.create_claim((select id from public.public_items where title = 'Sonnenbrille'),
  'Kratzer am linken Glas, Marke Ray-Ban', 'claim.person@example.com', 'Claim Person', null, 'Am Sonntag verloren', true, 'Mia Person'));
select pg_temp.check((select public.get_my_claim(token) ->> 'status' from t_tokens where name = 'claim') = 'open', 'get_my_claim: Status offen');
select pg_temp.check((select public.get_my_claim(token) -> 'office' ->> 'dropOffLocation' from t_tokens where name = 'claim') is null,
  'Abholort wird erst nach der Bestätigung gezeigt');
select pg_temp.as_admin();

-- ===== Mitarbeitende Berufsschule (Admin) =====
select pg_temp.as_user(:u_bsm_admin);
select pg_temp.check((select count(*) from public.found_items) = 11, 'BSM sieht nur die eigenen 11 Funde');
select pg_temp.check((select count(*) from public.found_item_internal) = 11, 'BSM sieht nur eigene interne Angaben');
select pg_temp.check(not exists (select 1 from public.loss_reports where organisation_id is not null and organisation_id <> public.current_organisation_id()),
  'BSM sieht keine Meldungen anderer Fundstellen');
select pg_temp.check(exists (select 1 from public.loss_reports where organisation_id is null), 'BSM sieht «Weiss nicht»-Meldungen');
select pg_temp.check(not exists (select 1 from public.return_requests where organisation_id <> public.current_organisation_id()), 'BSM sieht nur eigene Anfragen');
select pg_temp.fails($$update public.found_items set title = 'x'$$, 'Funde werden nicht direkt geändert (nur über save_item)');

insert into t_ids select 'new_item', (public.save_item(null, 'Schwarze Jacke', 'clothing', '{black}', 'Mammut', public.today_ch(),
  'Mensa', 'Kiste 3, Sekretariat', 'Schwarze Jacke, Grösse M.', 'Name im Kragen', '', true, null) ->> 'id')::uuid;
select pg_temp.check((select item_number from public.found_items where id = (select id from t_ids where name = 'new_item'))
  = 'BSM-' || extract(year from public.today_ch()) || '-' || lpad((select count(*) from public.found_items where organisation_id = public.current_organisation_id() and extract(year from found_on) = extract(year from public.today_ch()))::text, 4, '0'),
  'save_item vergibt die nächste Fundnummer');
select pg_temp.check((select created_by from public.found_items where id = (select id from t_ids where name = 'new_item')) = :u_bsm_admin, 'Ersteller wird gespeichert');
select pg_temp.fails($$select public.save_item(null, 'Jacke', 'clothing', '{black}', null, current_date, 'Mensa', '', null, null, null, true, null)$$,
  'Aufbewahrungsort ist Pflicht');
select pg_temp.fails($$select public.save_item(null, 'Jacke', 'clothing', '{}', null, current_date, 'Mensa', 'Kiste 1', null, null, null, true, null)$$,
  'Mindestens eine Farbe ist Pflicht');
select public.save_item((select id from t_ids where name = 'new_item'), 'Schwarze Winterjacke', 'clothing', '{black}', 'Mammut', public.today_ch(),
  'Mensa', 'Kiste 4, Sekretariat', 'Schwarze Jacke, Grösse M.', 'Name im Kragen', '', true, null);
select pg_temp.check((select count(*) from public.item_history where item_id = (select id from t_ids where name = 'new_item') and field in ('title', 'storage_location')) = 2,
  'Änderungen werden pro Feld protokolliert (T15)');
select pg_temp.check((select changed_by from public.item_history where item_id = (select id from t_ids where name = 'new_item') and field = 'title') = :u_bsm_admin,
  'Protokoll speichert die ändernde Person');

-- Status mit einem Klick
select public.set_item_status((select id from t_ids where name = 'new_item'), 'returned');
select pg_temp.check((select status from public.found_items where id = (select id from t_ids where name = 'new_item')) = 'returned', 'Status mit einem Klick ändern');
select public.set_item_status((select id from t_ids where name = 'new_item'), 'available');
select pg_temp.fails($$select public.set_item_status((select id from public.found_items where title = 'Kapuzenpullover'), 'available')$$,
  '«Verfügbar» ist nicht möglich, solange eine bestätigte Anfrage besteht');

-- Treffer für Mitarbeitende (mit Score)
select pg_temp.check((select (public.match_for_loss((select id from public.loss_reports where title = 'Weisse AirPods')) -> 0 ->> 'score')::int) >= 3,
  'match_for_loss liefert Treffer mit Score für Mitarbeitende');
select pg_temp.check(jsonb_typeof(public.staff_match_counts() -> 'reports') = 'object', 'staff_match_counts liefert Zähler');
select pg_temp.check(public.notify_loss_match((select id from public.loss_reports where title = 'Weisse AirPods'),
                                              (select id from public.found_items where title = 'Kabellose Ohrhörer')), 'Suchende Person benachrichtigen');
select pg_temp.check(not public.notify_loss_match((select id from public.loss_reports where title = 'Weisse AirPods'),
                                                  (select id from public.found_items where title = 'Kabellose Ohrhörer')), 'Pro Paar nur eine Benachrichtigung');
select pg_temp.check(exists (select 1 from public.simulated_emails where subject = 'Möglicherweise wurde dein Gegenstand gefunden'), 'Treffer-E-Mail im Postausgang');
select public.update_organisation_profile('Sekretariat A012', 'Mo–Fr 07:30–16:30', 'Ausweis mitbringen.', 'sekretariat@bs-musterstadt.example', null, 120);
select pg_temp.check((select drop_off_location from public.organisations where short_code = 'BSM') = 'Sekretariat A012', 'Admin pflegt das Fundstellen-Profil');
select pg_temp.as_admin();

-- ===== Mitarbeitende (ohne Admin-Rolle) =====
select pg_temp.as_user(:u_bsm_staff);
select pg_temp.fails($$select public.update_organisation_profile('x', 'x', null, 'a@b.ch', null, 90)$$, 'Profil nur für Admins');
select pg_temp.fails('select public.reset_demo()', 'Demo-Reset nur für Admins');
select pg_temp.as_admin();

-- ===== Anfragen: Bestätigen → Übergabe (Tierpark) =====
select pg_temp.as_user(:u_tps_staff);
select pg_temp.fails($$select public.decide_claim((select id from public.return_requests where claimant_name = 'Noah Frei'), true, null)$$,
  'Fremde Anfragen können nicht entschieden werden');
select public.decide_claim((select id from public.return_requests where claimant_name = 'Elena Rossi'), true, 'Bitte an der Kasse melden.');
select pg_temp.check((select status from public.found_items where title = 'Rucksack') = 'reserved', 'Bestätigen reserviert den Fund');
select pg_temp.check(exists (select 1 from public.simulated_emails e join public.return_requests r on r.id = e.return_request_id
                              where r.claimant_name = 'Elena Rossi' and e.subject like '%bestätigt' and e.link_path like '/anfrage/%'),
  'Bestätigungs-E-Mail mit persönlichem Link');
select pg_temp.fails($$select public.decide_claim((select id from public.return_requests where claimant_name = 'Tim Baumann'), true, null)$$,
  'Höchstens eine bestätigte Anfrage pro Fund');
select public.complete_claim((select id from public.return_requests where claimant_name = 'Elena Rossi'));
select pg_temp.check((select status from public.found_items where title = 'Rucksack') = 'returned'
                 and (select status from public.return_requests where claimant_name = 'Elena Rossi') = 'completed', 'Übergabe abschliessen');
select public.decide_claim((select id from public.return_requests where claimant_name = 'Tim Baumann'), false, null);
select pg_temp.check((select status from public.return_requests where claimant_name = 'Tim Baumann') = 'rejected', 'Andere Anfrage ablehnen');
select pg_temp.as_admin();
select pg_temp.as_user(null);
select pg_temp.check(not exists (select 1 from public.public_items where title = 'Rucksack' and organisation_id = '00000000-0000-4000-b000-000000000002'),
  'Zurückgegebener Fund ist nicht mehr öffentlich');
select pg_temp.as_admin();

-- ===== Matching v2 – Testfälle KONZEPT 6.6 =====
insert into public.organisations (id, slug, name, type, short_code, address, drop_off_location, opening_hours, contact_email)
values ('00000000-0000-4000-b000-0000000000f1', 'testfundstelle', 'Testfundstelle', 'other', 'TST', 'Testweg 1', 'Empfang', 'Mo–Fr', 'test@example.com'),
       ('00000000-0000-4000-b000-0000000000f2', 'testfundstelle-zwei', 'Testfundstelle Zwei', 'other', 'TSZ', 'Testweg 2', 'Empfang', 'Mo–Fr', 'test2@example.com');
insert into public.found_items (organisation_id, title, category, colors, found_on, found_location, status)
values ('00000000-0000-4000-b000-0000000000f1', 'Fall1 Mütze',  'sports', '{black}', date '2026-11-09', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall2 Mütze',  'sports', '{black}', date '2026-11-06', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall3 Mütze',  'sports', '{green}', date '2026-11-10', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall4 Mütze',  'sports', '{grey}',  date '2026-11-10', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f2', 'Fall6 Mütze',  'sports', '{black}', date '2026-11-11', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall7 Mütze',  'sports', '{black}', date '2026-11-10', 'Halle', 'returned'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall8 Mütze',  'sports', '{black}', date '2026-12-10', 'Halle', 'available'),
       ('00000000-0000-4000-b000-0000000000f1', 'Fall9 Mütze',  'sports', '{black}', date '2026-12-11', 'Halle', 'available');

create function pg_temp.match_titles(p_org uuid, p_colors public.item_color[]) returns text[] language sql as $$
  select coalesce(array_agg(i.title order by i.title), '{}')
    from public.match_items(p_org, 'Kappe', 'sports', p_colors, null, '', '', date '2026-11-10', date '2026-11-10', false, 1, 100) m
    join public.found_items i on i.id = m.item_id
   where i.title like 'Fall%';
$$;
create function pg_temp.match_reasons(p_title text, p_colors public.item_color[]) returns text[] language sql as $$
  select m.reasons
    from public.found_items i
    cross join lateral public.match_eval(null, 'Kappe', 'sports', p_colors, null, '', '', date '2026-11-10', date '2026-11-10', i) m
   where i.title = p_title;
$$;
create function pg_temp.match_score(p_title text, p_colors public.item_color[]) returns integer language sql as $$
  select m.score
    from public.found_items i
    cross join lateral public.match_eval(null, 'Kappe', 'sports', p_colors, null, '', '', date '2026-11-10', date '2026-11-10', i) m
   where i.title = p_title;
$$;

select pg_temp.check(pg_temp.match_score('Fall1 Mütze', '{black}') >= 3, '6.6: Verlust 10.11., Fund 09.11., gleiche Farbe → Treffer mit Score ≥ 3');
select pg_temp.check(not 'Fall2 Mütze' = any (pg_temp.match_titles(null, '{black}')), '6.6: Verlust 10.11., Fund 06.11. → kein Treffer');
select pg_temp.check(not 'Fall3 Mütze' = any (pg_temp.match_titles(null, '{black}')), '6.6: Verlust schwarz, Fund grün → kein Regel-Treffer');
select pg_temp.check('farbe_aehnlich' = any (pg_temp.match_reasons('Fall4 Mütze', '{black}')), '6.6: Verlust schwarz, Fund grau → Treffer mit farbe_aehnlich');
select pg_temp.check('Fall3 Mütze' = any (pg_temp.match_titles(null, '{}')), '6.6: Verlust ohne Farbe → Farbe schränkt nicht ein');
select pg_temp.check('Fall6 Mütze' = any (pg_temp.match_titles(null, '{black}'))
                 and not 'Fall6 Mütze' = any (pg_temp.match_titles('00000000-0000-4000-b000-0000000000f1', '{black}')),
  '6.6: «Weiss nicht» berücksichtigt alle Fundstellen, sonst nur die gewählte');
select pg_temp.check(not 'Fall7 Mütze' = any (pg_temp.match_titles(null, '{black}')), '6.6: Zurückgegebener Fund ist nie ein Treffer');
select pg_temp.check('Fall8 Mütze' = any (pg_temp.match_titles(null, '{black}')) and not 'Fall9 Mütze' = any (pg_temp.match_titles(null, '{black}')),
  'Datumsfenster endet 30 Tage nach dem Verlust');
select pg_temp.check('Fall3 Mütze' = any (pg_temp.match_titles(null, '{multicolor}')), '«mehrfarbig» schränkt nicht ein');
select pg_temp.check(not 'datum_nah' = any (pg_temp.match_reasons('Fall8 Mütze', '{black}')) and 'datum_nah' = any (pg_temp.match_reasons('Fall1 Mütze', '{black}')),
  'Punkt «zeitlich nah» nur bis ±3 Tage');
select pg_temp.check((select reasons @> '{stichwort:Mütze}' from public.found_items i
                        cross join lateral public.match_eval(null, 'Mützen', 'sports', '{black}', null, '', '', date '2026-11-10', date '2026-11-10', i)
                       where i.title = 'Fall1 Mütze'), 'Stichwörter: Pluralform und Umlaute werden normalisiert');

-- Fundnummer: Zähler pro Jahr
insert into public.found_items (organisation_id, title, category, colors, found_on, found_location)
values ('00000000-0000-4000-b000-0000000000f1', 'Altjahr', 'other', '{black}', date '2025-12-30', 'Halle');
select pg_temp.check((select item_number from public.found_items where title = 'Altjahr') = 'TST-2025-0001', 'Fundnummer: Zähler beginnt pro Jahr neu');

-- ===== Ratenbegrenzung =====
select pg_temp.as_user(null);
do $$
declare i int;
begin
  for i in 1..20 loop
    perform public.create_claim((select id from public.public_items where title = 'Velohelm'),
      'Aufkleber innen am Helm', 'spam' || i || '@example.com', 'Spam', null, '', false, null);
  end loop;
  raise exception 'FAIL: Ratenbegrenzung hat nicht gegriffen';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok: Ratenbegrenzung für öffentliche Formulare (%)', sqlerrm;
end $$;
select pg_temp.as_admin();

-- ===== Reset =====
select pg_temp.as_user(:u_tps_admin);
select public.reset_demo();
select pg_temp.as_admin();
select pg_temp.check((select count(*) from public.found_items) = 40 and (select count(*) from public.organisations) = 4, 'Admin setzt die Demo zurück');
select pg_temp.check((select status from public.found_items where title = 'Rucksack' and organisation_id = '00000000-0000-4000-b000-000000000002') = 'available',
  'Nach dem Reset ist der Ausgangszustand wiederhergestellt');

-- ===== E-Mail-Versand =====
select pg_temp.check(not exists (select 1 from public.simulated_emails where delivery_status <> 'skipped'), 'Ohne Konfiguration wird nichts versendet');
insert into vault.decrypted_secrets values ('email_function_url', 'https://example.test/functions/v1/send-email'), ('email_webhook_secret', 's3cret');
select public.queue_email(null, 'echte.person@gmx.ch', 'Test', 'Test');
select public.queue_email(null, 'erfunden@bs-musterstadt.example', 'Test', 'Test');
select pg_temp.check((select delivery_status from public.simulated_emails where recipient = 'echte.person@gmx.ch') = 'pending'
                 and (select count(*) from net.calls) = 1, 'Mit Konfiguration: echte Adresse wird an send-email übergeben');
select pg_temp.check((select delivery_status from public.simulated_emails where recipient = 'erfunden@bs-musterstadt.example') = 'skipped', 'Test-Adressen werden nie angeschrieben');
delete from vault.decrypted_secrets;

-- ===== KI-Limits =====
select pg_temp.check(public.ai_allow('k1', 2, 300, 100) = 'ok' and public.ai_allow('k1', 2, 300, 100) = 'ok' and public.ai_allow('k1', 2, 300, 100) = 'rate',
  'KI: Ratenbegrenzung pro Client');
select public.ai_log('extract_fields', 1200, true, 300, 80, null);
select pg_temp.check(public.ai_allow('k2', 10, 300, 1) = 'daily', 'KI: Tageslimit gesamt');
select pg_temp.check(not exists (select 1 from information_schema.columns where table_name = 'ai_calls' and column_name in ('input', 'prompt', 'text', 'content')),
  'KI-Protokoll speichert keine Inhalte');

-- ===== Datenschutz =====
update public.loss_reports set status = 'closed', closed_at = now() - interval '100 days' where title = 'Blaue Brille';
select pg_temp.check(public.purge_old_contacts() >= 1, 'purge_old_contacts bereinigt alte Einträge');
select pg_temp.check((select reporter_email from public.loss_reports where title = 'Blaue Brille') = 'geloescht@example.invalid'
                 and (select reporter_email from public.loss_reports where title = 'Weisse AirPods') <> 'geloescht@example.invalid',
  'Kontaktdaten werden 90 Tage nach Abschluss gelöscht, offene Meldungen bleiben');
