-- =============================================================================
-- RPC-Funktionen
-- Alle Abläufe mit Regeln (Registrierung, Anfragen, Statuswechsel, Meldungen)
-- laufen hier, damit die Regeln nicht im Frontend umgangen werden können.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hilfsfunktionen
-- -----------------------------------------------------------------------------
create function public.require_organisation()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.current_organisation_id();
begin
  if v_org is null then
    raise exception 'Kein Zugriff: Dieses Konto gehört zu keiner Organisation.'
      using errcode = '42501';
  end if;
  return v_org;
end;
$$;

create function public.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(p_text), 'äöüàâéèêëïîôûç', 'aouaaeeeeiiouc'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create function public.queue_email(
  p_organisation_id uuid,
  p_recipient text,
  p_subject text,
  p_body text,
  p_link_path text default null,
  p_return_request_id uuid default null,
  p_loss_report_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.simulated_emails
    (organisation_id, recipient, subject, body, link_path, return_request_id, loss_report_id)
  values
    (p_organisation_id, p_recipient, p_subject, p_body, p_link_path, p_return_request_id, p_loss_report_id);
$$;

revoke all on function public.require_organisation() from public, anon, authenticated;
revoke all on function public.queue_email(uuid, text, text, text, text, uuid, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Organisation registrieren (Schritte 2 + 3 der Einrichtung)
-- -----------------------------------------------------------------------------
create function public.register_organisation(
  p_full_name       text,
  p_org_name        text,
  p_org_type        public.organisation_type,
  p_address         text,
  p_office_name     text,
  p_office_location text,
  p_contact_email   text,
  p_contact_phone   text,
  p_opening_hours   text,
  p_pickup_notes    text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_org  uuid;
  v_slug text;
  v_base text;
  v_code text;
  v_i    integer := 1;
begin
  if v_uid is null then
    raise exception 'Bitte zuerst ein Konto erstellen.' using errcode = '42501';
  end if;
  if exists (select 1 from public.memberships where user_id = v_uid) then
    raise exception 'Dieses Konto ist bereits einer Organisation zugeordnet.' using errcode = '23505';
  end if;
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_org_name), '') = ''
     or coalesce(trim(p_address), '') = '' or coalesce(trim(p_office_location), '') = ''
     or coalesce(trim(p_contact_email), '') = '' or coalesce(trim(p_opening_hours), '') = '' then
    raise exception 'Bitte alle Pflichtfelder ausfüllen.' using errcode = '22023';
  end if;

  -- Eindeutigen Slug für die öffentliche Seite bilden.
  v_base := nullif(public.slugify(p_org_name), '');
  v_base := coalesce(v_base, 'organisation');
  v_slug := v_base;
  while exists (select 1 from public.organisations where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;

  -- Kürzel aus den Anfangsbuchstaben (2–4 Zeichen), bei Bedarf mit Zusatzbuchstabe.
  v_code := upper(left(regexp_replace(
              array_to_string(array(
                select left(w, 1) from regexp_split_to_table(translate(p_org_name, 'äöüÄÖÜ', 'aouAOU'), '\s+') w
                where w ~ '^[A-Za-z]'), ''),
              '[^A-Za-z]', '', 'g'), 4));
  if length(v_code) < 2 then
    v_code := upper(left(regexp_replace(translate(p_org_name, 'äöüÄÖÜ', 'aouAOU'), '[^A-Za-z]', '', 'g') || 'XX', 3));
  end if;
  -- Bei Kollision Buchstaben anhängen: BS → BSA, BSB, … (max. 5 Zeichen).
  v_base := left(v_code, 4);
  v_i := 0;
  while exists (select 1 from public.organisations where short_code = v_code) loop
    v_i := v_i + 1;
    v_code := case
      when v_i <= 26 then v_base || chr(64 + v_i)
      else left(v_base, 3) || chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int)
    end;
  end loop;

  insert into public.organisations (slug, name, type, short_code, address)
  values (v_slug, trim(p_org_name), p_org_type, v_code, trim(p_address))
  returning id into v_org;

  insert into public.found_offices
    (organisation_id, name, location, contact_email, contact_phone, opening_hours, pickup_notes)
  values
    (v_org, coalesce(nullif(trim(p_office_name), ''), 'Fundstelle'), trim(p_office_location),
     trim(p_contact_email), nullif(trim(p_contact_phone), ''), trim(p_opening_hours),
     nullif(trim(p_pickup_notes), ''));

  insert into public.memberships (user_id, organisation_id, full_name)
  values (v_uid, v_org, trim(p_full_name));

  return v_slug;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rückgabe anfragen (Suchende, ohne Konto)
-- -----------------------------------------------------------------------------
create function public.submit_return_request(
  p_item_id  uuid,
  p_name     text,
  p_contact  text,
  p_message  text,
  p_proof    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item    public.found_items;
  v_office  public.found_offices;
  v_id      uuid;
  v_token   uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_contact), '') = ''
     or coalesce(trim(p_proof), '') = '' then
    raise exception 'Bitte Name, Kontakt und Eigentumsnachweis angeben.' using errcode = '22023';
  end if;

  select * into v_item from public.found_items
   where id = p_item_id and is_public and status <> 'returned';
  if not found then
    raise exception 'Dieser Gegenstand kann nicht angefragt werden.' using errcode = 'P0002';
  end if;

  select * into v_office from public.found_offices where organisation_id = v_item.organisation_id;

  insert into public.return_requests
    (item_id, organisation_id, claimant_name, claimant_contact, message, proof_description)
  values
    (v_item.id, v_item.organisation_id, trim(p_name), trim(p_contact),
     coalesce(trim(p_message), ''), trim(p_proof))
  returning id, access_token into v_id, v_token;

  perform public.queue_email(
    v_item.organisation_id, trim(p_contact),
    'Ihre Anfrage zu «' || v_item.title || '» ist eingegangen',
    'Guten Tag ' || trim(p_name) || E'\n\nIhre Rückgabeanfrage zu ' || v_item.item_number
      || ' wurde an ' || v_office.name || ' übermittelt. Die Fundstelle prüft Ihre Angaben '
      || 'und meldet sich. Den aktuellen Stand sehen Sie jederzeit über den Link.',
    '/status/anfrage/' || v_token, v_id, null);

  perform public.queue_email(
    v_item.organisation_id, v_office.contact_email,
    'Neue Rückgabeanfrage zu ' || v_item.item_number,
    trim(p_name) || ' hat eine Rückgabe für «' || v_item.title || '» angefragt. '
      || 'Bitte die Angaben in der Verwaltung prüfen.',
    '/verwaltung/anfragen/' || v_id, v_id, null);

  return v_token;
end;
$$;

-- -----------------------------------------------------------------------------
-- Anfrage bestätigen oder ablehnen (Mitarbeitende)
-- -----------------------------------------------------------------------------
create function public.decide_return_request(
  p_request_id          uuid,
  p_confirm             boolean,
  p_pickup_instructions text default null,
  p_note                text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org     uuid := public.require_organisation();
  v_req     public.return_requests;
  v_item    public.found_items;
  v_office  public.found_offices;
  v_pickup  text;
begin
  select * into v_req from public.return_requests
   where id = p_request_id and organisation_id = v_org
   for update;
  if not found then
    raise exception 'Anfrage nicht gefunden.' using errcode = 'P0002';
  end if;

  select * into v_item from public.found_items where id = v_req.item_id for update;
  select * into v_office from public.found_offices where organisation_id = v_org;

  if p_confirm then
    if v_req.status <> 'open' then
      raise exception 'Nur offene Anfragen können bestätigt werden.' using errcode = '22023';
    end if;
    if v_item.status = 'returned' then
      raise exception 'Der Gegenstand wurde bereits zurückgegeben.' using errcode = '22023';
    end if;
    if exists (select 1 from public.return_requests
                where item_id = v_item.id and status = 'confirmed') then
      raise exception 'Für diesen Gegenstand ist bereits eine Anfrage bestätigt.' using errcode = '22023';
    end if;

    v_pickup := coalesce(nullif(trim(p_pickup_instructions), ''),
                         v_office.pickup_notes,
                         'Abholung während der Öffnungszeiten: ' || v_office.opening_hours);

    update public.return_requests
       set status = 'confirmed', pickup_instructions = v_pickup,
           decision_note = nullif(trim(p_note), ''), decided_at = now()
     where id = v_req.id;

    update public.found_items set status = 'reserved' where id = v_item.id;

    perform public.queue_email(
      v_org, v_req.claimant_contact,
      'Ihre Anfrage zu «' || v_item.title || '» wurde bestätigt',
      'Guten Tag ' || v_req.claimant_name || E'\n\nIhre Angaben passen. Abholhinweise:\n'
        || v_pickup || E'\n\nOrt: ' || v_office.location || E'\nÖffnungszeiten: ' || v_office.opening_hours
        || E'\nBitte Fundnummer ' || v_item.item_number || ' angeben.',
      '/status/anfrage/' || v_req.access_token, v_req.id, null);
  else
    if v_req.status not in ('open', 'confirmed') then
      raise exception 'Diese Anfrage ist bereits abgeschlossen.' using errcode = '22023';
    end if;

    update public.return_requests
       set status = 'rejected', decision_note = nullif(trim(p_note), ''), decided_at = now()
     where id = v_req.id;

    -- Reservation aufheben, wenn genau diese Anfrage bestätigt war.
    if v_req.status = 'confirmed' and v_item.status = 'reserved' then
      update public.found_items set status = 'available' where id = v_item.id;
    end if;

    perform public.queue_email(
      v_org, v_req.claimant_contact,
      'Ihre Anfrage zu «' || v_item.title || '» wurde abgelehnt',
      'Guten Tag ' || v_req.claimant_name || E'\n\nIhre Angaben reichen leider nicht als Eigentumsnachweis.'
        || coalesce(E'\nHinweis der Fundstelle: ' || nullif(trim(p_note), ''), '')
        || E'\nBei Fragen: ' || v_office.contact_email,
      '/status/anfrage/' || v_req.access_token, v_req.id, null);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Status eines Gegenstands ändern (Mitarbeitende)
-- «Zurückgegeben» schliesst eine bestätigte Anfrage ab. Offene Anfragen
-- bleiben offen und müssen bewusst abgelehnt werden.
-- -----------------------------------------------------------------------------
create function public.change_item_status(
  p_item_id uuid,
  p_status  public.item_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org   uuid := public.require_organisation();
  v_item  public.found_items;
  v_req   public.return_requests;
begin
  select * into v_item from public.found_items
   where id = p_item_id and organisation_id = v_org
   for update;
  if not found then
    raise exception 'Gegenstand nicht gefunden.' using errcode = 'P0002';
  end if;

  if v_item.status = p_status then
    return;
  end if;

  select * into v_req from public.return_requests
   where item_id = v_item.id and status = 'confirmed';

  if p_status = 'available' and v_req.id is not null then
    raise exception 'Es gibt eine bestätigte Anfrage. Bitte diese zuerst ablehnen.' using errcode = '22023';
  end if;

  update public.found_items set status = p_status where id = v_item.id;

  if p_status = 'returned' and v_req.id is not null then
    update public.return_requests set status = 'completed' where id = v_req.id;
    perform public.queue_email(
      v_org, v_req.claimant_contact,
      'Übergabe von «' || v_item.title || '» abgeschlossen',
      'Guten Tag ' || v_req.claimant_name || E'\n\nDie Übergabe wurde erfasst. Vielen Dank!',
      '/status/anfrage/' || v_req.access_token, v_req.id, null);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verlustmeldung (Suchende, ohne Konto)
-- -----------------------------------------------------------------------------
create function public.submit_loss_report(
  p_organisation_id uuid,
  p_name            text,
  p_contact         text,
  p_title           text,
  p_category        public.item_category,
  p_color           public.item_color,
  p_brand           text,
  p_lost_on         date,
  p_lost_location   text,
  p_description     text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_token  uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_contact), '') = ''
     or coalesce(trim(p_title), '') = '' or p_lost_on is null then
    raise exception 'Bitte alle Pflichtfelder ausfüllen.' using errcode = '22023';
  end if;
  if p_lost_on > current_date then
    raise exception 'Das Verlustdatum darf nicht in der Zukunft liegen.' using errcode = '22023';
  end if;
  if p_organisation_id is not null
     and not exists (select 1 from public.organisations where id = p_organisation_id) then
    raise exception 'Organisation nicht gefunden.' using errcode = 'P0002';
  end if;

  insert into public.loss_reports
    (organisation_id, reporter_name, reporter_contact, title, category, color, brand,
     lost_on, lost_location, description)
  values
    (p_organisation_id, trim(p_name), trim(p_contact), trim(p_title), p_category, p_color,
     nullif(trim(p_brand), ''), p_lost_on, coalesce(trim(p_lost_location), ''),
     coalesce(trim(p_description), ''))
  returning id, access_token into v_id, v_token;

  perform public.queue_email(
    p_organisation_id, trim(p_contact),
    'Ihre Verlustmeldung «' || trim(p_title) || '»',
    'Guten Tag ' || trim(p_name) || E'\n\nWir haben Ihre Verlustmeldung erfasst. '
      || 'Über den Link sehen Sie mögliche Treffer. Kommt ein passender Gegenstand neu dazu, '
      || 'informieren wir Sie.',
    '/status/meldung/' || v_token, null, v_id);

  return v_token;
end;
$$;

-- Mitarbeitende benachrichtigen eine meldende Person über einen möglichen Treffer.
create function public.notify_loss_report_match(
  p_report_id uuid,
  p_item_id   uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org     uuid := public.require_organisation();
  v_report  public.loss_reports;
  v_item    public.found_items;
  v_subject text;
begin
  select * into v_report from public.loss_reports
   where id = p_report_id and status = 'open'
     and (organisation_id is null or organisation_id = v_org);
  select * into v_item from public.found_items
   where id = p_item_id and organisation_id = v_org and is_public and status <> 'returned';
  if v_report.id is null or v_item.id is null then
    return false;
  end if;

  v_subject := 'Möglicher Treffer zu Ihrer Verlustmeldung «' || v_report.title || '»';
  if exists (select 1 from public.simulated_emails
              where loss_report_id = v_report.id and link_path = '/fund/' || v_item.id) then
    return false;
  end if;

  perform public.queue_email(
    v_org, v_report.reporter_contact, v_subject,
    'Guten Tag ' || v_report.reporter_name || E'\n\nEs wurde ein Gegenstand erfasst, der zu Ihrer '
      || 'Meldung passen könnte: «' || v_item.title || '» (' || v_item.item_number || '). '
      || 'Sie können die Rückgabe direkt online anfragen.',
    '/fund/' || v_item.id, null, v_report.id);
  return true;
end;
$$;

create function public.close_loss_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_organisation();
begin
  update public.loss_reports set status = 'closed'
   where id = p_report_id and (organisation_id is null or organisation_id = v_org);
  if not found then
    raise exception 'Meldung nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Statusseiten für Suchende (Zugriff nur mit geheimem Link-Token)
-- -----------------------------------------------------------------------------
create function public.get_return_request_status(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', r.status,
    'claimantName', r.claimant_name,
    'pickupInstructions', r.pickup_instructions,
    'decisionNote', r.decision_note,
    'createdAt', r.created_at,
    'decidedAt', r.decided_at,
    'item', jsonb_build_object('id', i.id, 'title', i.title, 'itemNumber', i.item_number,
                               'category', i.category, 'photoPath', i.photo_path),
    'organisation', jsonb_build_object('name', o.name, 'slug', o.slug),
    'office', jsonb_build_object('name', f.name, 'location', f.location,
                                 'openingHours', f.opening_hours, 'contactEmail', f.contact_email),
    'emails', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'recipient', e.recipient, 'subject', e.subject,
                                          'body', e.body, 'linkPath', e.link_path, 'createdAt', e.created_at)
                       order by e.created_at)
        from public.simulated_emails e
       where e.return_request_id = r.id and e.recipient = r.claimant_contact), '[]'::jsonb)
  )
  from public.return_requests r
  join public.found_items i on i.id = r.item_id
  join public.organisations o on o.id = r.organisation_id
  join public.found_offices f on f.organisation_id = o.id
  where r.access_token = p_token;
$$;

create function public.get_loss_report(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'organisationId', l.organisation_id,
    'reporterName', l.reporter_name,
    'title', l.title,
    'category', l.category,
    'color', l.color,
    'brand', l.brand,
    'lostOn', l.lost_on,
    'lostLocation', l.lost_location,
    'description', l.description,
    'status', l.status,
    'createdAt', l.created_at,
    'emails', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'recipient', e.recipient, 'subject', e.subject,
                                          'body', e.body, 'linkPath', e.link_path, 'createdAt', e.created_at)
                       order by e.created_at)
        from public.simulated_emails e
       where e.loss_report_id = l.id), '[]'::jsonb)
  )
  from public.loss_reports l
  where l.access_token = p_token;
$$;

-- -----------------------------------------------------------------------------
-- Ausführungsrechte
-- -----------------------------------------------------------------------------
revoke all on function public.register_organisation(text, text, public.organisation_type, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.decide_return_request(uuid, boolean, text, text) from public, anon;
revoke all on function public.change_item_status(uuid, public.item_status) from public, anon;
revoke all on function public.notify_loss_report_match(uuid, uuid) from public, anon;
revoke all on function public.close_loss_report(uuid) from public, anon;

grant execute on function public.register_organisation(text, text, public.organisation_type, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.decide_return_request(uuid, boolean, text, text) to authenticated;
grant execute on function public.change_item_status(uuid, public.item_status) to authenticated;
grant execute on function public.notify_loss_report_match(uuid, uuid) to authenticated;
grant execute on function public.close_loss_report(uuid) to authenticated;

grant execute on function public.submit_return_request(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_loss_report(uuid, text, text, text, public.item_category, public.item_color, text, date, text, text) to anon, authenticated;
grant execute on function public.get_return_request_status(uuid) to anon, authenticated;
grant execute on function public.get_loss_report(uuid) to anon, authenticated;
