-- =============================================================================
-- RPC-Funktionen
-- Alle Abläufe mit Regeln laufen hier, damit sie im Frontend nicht umgangen werden können.
-- Fehlermeldungen sind deutsch und werden in der App unverändert angezeigt.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hilfsfunktionen
-- -----------------------------------------------------------------------------
create function public.require_staff()
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
    raise exception 'Kein Zugriff: Dieses Konto gehört zu keiner Fundstelle.' using errcode = '42501';
  end if;
  return v_org;
end;
$$;

create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_staff();
begin
  if public.current_member_role() is distinct from 'admin' then
    raise exception 'Nur Admins der Fundstelle dürfen das.' using errcode = '42501';
  end if;
  return v_org;
end;
$$;

-- Persönlicher Link: 32 zufällige Bytes (base64url). In der Datenbank steht nur der SHA-256-Hash.
create function public.new_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), E'+/\n', '-_'), '=');
$$;

create function public.hash_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(coalesce(p_token, ''), 'sha256');
$$;

-- Schlüssel für die Ratenbegrenzung: Hash aus IP (vom Proxy gesetzt) und User-Agent, nie im Klartext.
create function public.request_client_key()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text;
begin
  v_ip := coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    nullif(trim(split_part(v_headers ->> 'x-forwarded-for', ',', -1)), ''),
    'unbekannt');
  return encode(extensions.digest(v_ip || '|' || coalesce(v_headers ->> 'user-agent', ''), 'sha256'), 'hex');
end;
$$;

-- Zählt einen Aufruf und bricht ab, wenn das Limit im Zeitfenster erreicht ist.
create function public.check_rate_limit(p_bucket text, p_limit integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key   text := public.request_client_key();
  v_start timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_count integer;
begin
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  insert into public.rate_limits (key_hash, bucket, window_start, count)
  values (v_key, p_bucket, v_start, 1)
  on conflict (key_hash, bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  if v_count > p_limit then
    raise exception 'Zu viele Anfragen in kurzer Zeit. Bitte versuche es später noch einmal.' using errcode = 'P0429';
  end if;
end;
$$;

create function public.queue_email(
  p_organisation_id   uuid,
  p_recipient         text,
  p_subject           text,
  p_body              text,
  p_link_path         text default null,
  p_return_request_id uuid default null,
  p_loss_report_id    uuid default null
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

create function public.greeting(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when nullif(trim(p_name), '') is null then 'Hallo' else 'Hallo ' || trim(p_name) end;
$$;

-- Einheitliche Prüfung von E-Mail-Adressen
create function public.is_email(p_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$', false) and length(p_value) <= 200;
$$;

revoke all on function public.require_staff() from public, anon;
revoke all on function public.require_admin() from public, anon;
revoke all on function public.new_token() from public, anon, authenticated;
revoke all on function public.request_client_key() from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, interval) from public, anon, authenticated;
revoke all on function public.queue_email(uuid, text, text, text, text, uuid, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Verlust melden (ohne Konto)
-- -----------------------------------------------------------------------------
create function public.create_loss_report(
  p_organisation_id     uuid,
  p_title               text,
  p_category            public.item_category,
  p_colors              public.item_color[],
  p_brand               text,
  p_description         text,
  p_private_feature     text,
  p_lost_location       text,
  p_lost_from           date,
  p_lost_to             date,
  p_lost_date_uncertain boolean,
  p_email               text,
  p_name                text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today  date := public.today_ch();
  v_from   date := p_lost_from;
  v_to     date := coalesce(p_lost_to, p_lost_from);
  v_token  text := public.new_token();
  v_id     uuid;
  v_title  text := trim(coalesce(p_title, ''));
begin
  perform public.check_rate_limit('loss_report', 10, interval '1 hour');

  if length(v_title) < 2 or length(v_title) > 120 then
    raise exception 'Bitte angeben, was du verloren hast (2 bis 120 Zeichen).' using errcode = '22023';
  end if;
  if p_category is null then
    raise exception 'Bitte eine Kategorie wählen.' using errcode = '22023';
  end if;
  if not public.is_email(trim(p_email)) then
    raise exception 'Bitte eine gültige E-Mail-Adresse angeben.' using errcode = '22023';
  end if;
  if length(coalesce(p_description, '')) > 1000 or length(coalesce(p_private_feature, '')) > 500 then
    raise exception 'Die Beschreibung ist zu lang.' using errcode = '22023';
  end if;
  if p_organisation_id is not null and not exists (select 1 from public.organisations where id = p_organisation_id) then
    raise exception 'Fundstelle nicht gefunden.' using errcode = 'P0002';
  end if;

  if coalesce(p_lost_date_uncertain, false) or v_from is null then
    -- «Weiss nicht genau»: Fenster von 14 Tagen bis heute
    v_from := v_today - 14;
    v_to := v_today;
  end if;
  if v_to > v_today or v_from > v_today then
    raise exception 'Das Datum darf nicht in der Zukunft liegen.' using errcode = '22023';
  end if;
  if v_to < v_from then
    raise exception 'Das Enddatum liegt vor dem Startdatum.' using errcode = '22023';
  end if;

  insert into public.loss_reports
    (organisation_id, token_hash, reporter_name, reporter_email, title, category, colors, brand, description,
     private_feature, lost_location, lost_from, lost_to, lost_date_uncertain)
  values
    (p_organisation_id, public.hash_token(v_token), nullif(trim(p_name), ''), lower(trim(p_email)), v_title,
     p_category, coalesce(p_colors[1:3], '{}'), nullif(trim(p_brand), ''), trim(coalesce(p_description, '')),
     trim(coalesce(p_private_feature, '')), trim(coalesce(p_lost_location, '')), v_from, v_to,
     coalesce(p_lost_date_uncertain, false))
  returning id into v_id;

  perform public.queue_email(
    p_organisation_id, lower(trim(p_email)),
    'Deine Verlustmeldung «' || v_title || '»',
    public.greeting(p_name) || E'\n\nDanke für deine Meldung «' || v_title || '». '
      || 'Wir melden uns, sobald etwas Passendes abgegeben wird. Deine Meldung findest du über den Link unten.',
    '/verlust/' || v_token, null, v_id);

  return v_token;
end;
$$;

-- Treffer schon während des Ausfüllens (Schritt 2) – nur öffentliche Angaben, ohne Score.
create function public.match_for_draft(
  p_organisation_id uuid,
  p_title           text,
  p_category        public.item_category,
  p_colors          public.item_color[],
  p_brand           text,
  p_description     text,
  p_lost_location   text,
  p_lost_from       date,
  p_lost_to         date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.public_match_json(m.item_id, m.score, m.reasons, false) order by m.score desc, m.ord), '[]'::jsonb)
    from (
      select x.*, row_number() over () as ord
        from public.match_items(
               p_organisation_id, left(p_title, 120), p_category, coalesce(p_colors, '{}'), left(p_brand, 80),
               left(p_description, 1000), left(p_lost_location, 200),
               coalesce(p_lost_from, public.today_ch() - 14), coalesce(p_lost_to, p_lost_from, public.today_ch()),
               true, 2, 5) x
    ) m;
$$;

-- «Meine Verlustmeldung» über den persönlichen Link
create function public.get_my_loss(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id,
    'organisationId', l.organisation_id,
    'organisationName', o.name,
    'title', l.title,
    'category', l.category,
    'colors', to_jsonb(l.colors),
    'brand', l.brand,
    'description', l.description,
    'lostLocation', l.lost_location,
    'lostFrom', l.lost_from,
    'lostTo', l.lost_to,
    'lostDateUncertain', l.lost_date_uncertain,
    'reporterName', l.reporter_name,
    'notify', l.notify,
    'status', l.status,
    'createdAt', l.created_at,
    'closedAt', l.closed_at,
    'matches', case when l.status = 'open' then coalesce((
      select jsonb_agg(public.public_match_json(m.item_id, m.score, m.reasons, false) order by m.score desc, m.ord)
        from (
          select x.*, row_number() over () as ord
            from public.match_items(l.organisation_id, l.title, l.category, l.colors, l.brand, l.description,
                                    l.lost_location, l.lost_from, l.lost_to, true, 2, 5) x
        ) m), '[]'::jsonb) else '[]'::jsonb end,
    'emails', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'subject', e.subject, 'body', e.body, 'linkPath', e.link_path,
                                          'createdAt', e.created_at, 'deliveryStatus', e.delivery_status)
                       order by e.created_at)
        from public.simulated_emails e
       where e.loss_report_id = l.id), '[]'::jsonb)
  )
  from public.loss_reports l
  left join public.organisations o on o.id = l.organisation_id
  where l.token_hash = public.hash_token(p_token);
$$;

create function public.close_my_loss(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.loss_reports set status = 'closed', closed_at = now()
   where token_hash = public.hash_token(p_token) and status = 'open';
  return found;
end;
$$;

create function public.set_loss_notify(p_token text, p_notify boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.loss_reports set notify = coalesce(p_notify, true)
   where token_hash = public.hash_token(p_token);
  return found;
end;
$$;

-- -----------------------------------------------------------------------------
-- «Das gehört mir» – Rückgabe-Anfrage (ohne Konto)
-- -----------------------------------------------------------------------------
create function public.create_claim(
  p_item_id            uuid,
  p_recognition_text   text,
  p_email              text,
  p_name               text,
  p_phone              text,
  p_message            text,
  p_pickup_by_other    boolean,
  p_pickup_person_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item   public.found_items;
  v_org    public.organisations;
  v_token  text := public.new_token();
  v_id     uuid;
begin
  perform public.check_rate_limit('claim', 10, interval '1 hour');

  if length(trim(coalesce(p_recognition_text, ''))) < 10 then
    raise exception 'Bitte genauer beschreiben, woran du deinen Gegenstand erkennst (mindestens 10 Zeichen).' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Bitte deinen Namen angeben.' using errcode = '22023';
  end if;
  if not public.is_email(trim(p_email)) then
    raise exception 'Bitte eine gültige E-Mail-Adresse angeben.' using errcode = '22023';
  end if;
  if coalesce(p_pickup_by_other, false) and length(trim(coalesce(p_pickup_person_name, ''))) = 0 then
    raise exception 'Bitte den Namen der Person angeben, die abholt.' using errcode = '22023';
  end if;

  select * into v_item from public.found_items
   where id = p_item_id and is_public and status in ('available', 'reserved');
  if not found then
    raise exception 'Dieser Gegenstand kann nicht angefragt werden.' using errcode = 'P0002';
  end if;
  select * into v_org from public.organisations where id = v_item.organisation_id;

  insert into public.return_requests
    (item_id, organisation_id, token_hash, claimant_name, claimant_email, claimant_phone, message,
     recognition_text, pickup_by_other, pickup_person_name)
  values
    (v_item.id, v_item.organisation_id, public.hash_token(v_token), trim(p_name), lower(trim(p_email)),
     nullif(trim(p_phone), ''), trim(coalesce(p_message, '')), trim(p_recognition_text),
     coalesce(p_pickup_by_other, false),
     case when coalesce(p_pickup_by_other, false) then trim(p_pickup_person_name) end)
  returning id into v_id;

  perform public.queue_email(
    v_item.organisation_id, lower(trim(p_email)),
    'Deine Anfrage für «' || v_item.title || '» ist eingegangen',
    public.greeting(p_name) || E'\n\nDeine Anfrage für «' || v_item.title || '» (' || v_item.item_number || ') ist bei '
      || v_org.name || ' eingegangen. Die Fundstelle prüft deine Angaben, meist innert 1–2 Arbeitstagen. '
      || 'Den Stand siehst du jederzeit über den Link unten.',
    '/anfrage/' || v_token, v_id, null);

  return v_token;
end;
$$;

-- «Meine Anfrage» über den persönlichen Link. Abholort und Zeiten erst nach der Bestätigung.
create function public.get_my_claim(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', r.status,
    'claimantName', r.claimant_name,
    'pickupByOther', r.pickup_by_other,
    'pickupPersonName', r.pickup_person_name,
    'pickupInstructions', case when r.status in ('confirmed', 'completed') then r.pickup_instructions end,
    'decisionNote', case when r.status = 'rejected' then r.decision_note end,
    'createdAt', r.created_at,
    'confirmedAt', r.confirmed_at,
    'rejectedAt', r.rejected_at,
    'completedAt', r.completed_at,
    'item', jsonb_build_object('id', i.id, 'title', i.title, 'itemNumber', i.item_number,
                               'category', i.category, 'colors', to_jsonb(i.colors), 'photoPath', i.photo_path),
    'office', jsonb_build_object(
      'name', o.name, 'slug', o.slug, 'address', o.address, 'contactEmail', o.contact_email,
      'dropOffLocation', case when r.status in ('confirmed', 'completed') then o.drop_off_location end,
      'openingHours', case when r.status in ('confirmed', 'completed') then o.opening_hours end,
      'pickupRules', case when r.status in ('confirmed', 'completed') then o.pickup_rules end),
    'emails', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'subject', e.subject, 'body', e.body, 'linkPath', e.link_path,
                                          'createdAt', e.created_at, 'deliveryStatus', e.delivery_status)
                       order by e.created_at)
        from public.simulated_emails e
       where e.return_request_id = r.id and e.recipient = r.claimant_email), '[]'::jsonb)
  )
  from public.return_requests r
  join public.found_items i on i.id = r.item_id
  join public.organisations o on o.id = r.organisation_id
  where r.token_hash = public.hash_token(p_token);
$$;

-- -----------------------------------------------------------------------------
-- Verwaltung: Funde
-- -----------------------------------------------------------------------------
-- Erfassen oder bearbeiten in einer Transaktion (Fund + interne Angaben + Protokoll).
create function public.save_item(
  p_item_id             uuid,
  p_title               text,
  p_category            public.item_category,
  p_colors              public.item_color[],
  p_brand               text,
  p_found_on            date,
  p_found_location      text,
  p_storage_location    text,
  p_public_description  text,
  p_identifying_feature text,
  p_internal_note       text,
  p_is_public           boolean,
  p_photo_path          text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org  uuid := public.require_staff();
  v_item public.found_items;
begin
  if length(trim(coalesce(p_title, ''))) < 2 then
    raise exception 'Bitte angeben, was es ist (mindestens 2 Zeichen).' using errcode = '22023';
  end if;
  if p_category is null then
    raise exception 'Bitte eine Kategorie wählen.' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_colors), 0) = 0 then
    raise exception 'Bitte mindestens eine Farbe wählen.' using errcode = '22023';
  end if;
  if p_found_on is null or p_found_on > public.today_ch() then
    raise exception 'Das Funddatum fehlt oder liegt in der Zukunft.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_found_location, ''))) = 0 then
    raise exception 'Bitte den Fundort angeben.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_storage_location, ''))) = 0 then
    raise exception 'Bitte den Aufbewahrungsort angeben.' using errcode = '22023';
  end if;
  if p_photo_path is not null and p_photo_path not like v_org::text || '/%' and p_photo_path not like 'demo/%' then
    raise exception 'Ungültiger Fotopfad.' using errcode = '22023';
  end if;

  if p_item_id is null then
    insert into public.found_items
      (organisation_id, title, category, colors, brand, found_on, found_location, public_description,
       photo_path, is_public, created_by)
    values
      (v_org, trim(p_title), p_category, p_colors[1:3], nullif(trim(p_brand), ''), p_found_on, trim(p_found_location),
       trim(coalesce(p_public_description, '')), p_photo_path, coalesce(p_is_public, true), auth.uid())
    returning * into v_item;

    insert into public.found_item_internal (item_id, organisation_id, identifying_feature, internal_note, storage_location)
    values (v_item.id, v_org, trim(coalesce(p_identifying_feature, '')), trim(coalesce(p_internal_note, '')),
            trim(p_storage_location));
  else
    update public.found_items
       set title = trim(p_title), category = p_category, colors = p_colors[1:3], brand = nullif(trim(p_brand), ''),
           found_on = p_found_on, found_location = trim(p_found_location),
           public_description = trim(coalesce(p_public_description, '')), photo_path = p_photo_path,
           is_public = coalesce(p_is_public, true)
     where id = p_item_id and organisation_id = v_org
    returning * into v_item;
    if not found then
      raise exception 'Fund nicht gefunden.' using errcode = 'P0002';
    end if;

    update public.found_item_internal
       set identifying_feature = trim(coalesce(p_identifying_feature, '')),
           internal_note = trim(coalesce(p_internal_note, '')),
           storage_location = trim(p_storage_location)
     where item_id = v_item.id;
  end if;

  return jsonb_build_object('id', v_item.id, 'itemNumber', v_item.item_number);
end;
$$;

-- Status mit einem Klick. «Zurückgegeben» schliesst eine bestätigte Anfrage ab.
create function public.set_item_status(p_item_id uuid, p_status public.item_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org     uuid := public.require_staff();
  v_item    public.found_items;
  v_claim   uuid;
begin
  select * into v_item from public.found_items where id = p_item_id and organisation_id = v_org for update;
  if not found then
    raise exception 'Fund nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_item.status = p_status then
    return;
  end if;

  select id into v_claim from public.return_requests where item_id = v_item.id and status = 'confirmed';

  if p_status = 'available' and v_claim is not null then
    raise exception 'Es gibt eine bestätigte Anfrage. Bitte diese zuerst ablehnen.' using errcode = '22023';
  end if;

  update public.found_items set status = p_status where id = v_item.id;

  if p_status = 'returned' and v_claim is not null then
    update public.return_requests set status = 'completed', completed_at = now() where id = v_claim;
  end if;
  -- Rückgängig: «Zurückgegeben» → vorheriger Status öffnet die zuletzt abgeschlossene Anfrage wieder.
  if v_item.status = 'returned' and p_status = 'reserved' then
    update public.return_requests set status = 'confirmed', completed_at = null
     where id = (select id from public.return_requests
                  where item_id = v_item.id and status = 'completed'
                  order by completed_at desc limit 1);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verwaltung: Anfragen
-- -----------------------------------------------------------------------------
create function public.decide_claim(p_claim_id uuid, p_confirm boolean, p_text text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org    uuid := public.require_staff();
  v_claim  public.return_requests;
  v_item   public.found_items;
  v_office public.organisations;
  v_text   text := nullif(trim(p_text), '');
  v_link   text;
begin
  select * into v_claim from public.return_requests where id = p_claim_id and organisation_id = v_org for update;
  if not found then
    raise exception 'Anfrage nicht gefunden.' using errcode = 'P0002';
  end if;
  -- Der persönliche Link steht nur in der ersten E-Mail (in der Datenbank ist nur der Hash gespeichert).
  select e.link_path into v_link from public.simulated_emails e
   where e.return_request_id = v_claim.id and e.link_path like '/anfrage/%'
   order by e.created_at limit 1;
  select * into v_item from public.found_items where id = v_claim.item_id for update;
  select * into v_office from public.organisations where id = v_org;

  if p_confirm then
    if v_claim.status <> 'open' then
      raise exception 'Nur offene Anfragen können bestätigt werden.' using errcode = '22023';
    end if;
    if v_item.status in ('returned', 'disposed') then
      raise exception 'Der Fund ist bereits erledigt.' using errcode = '22023';
    end if;
    if exists (select 1 from public.return_requests where item_id = v_item.id and status = 'confirmed') then
      raise exception 'Für diesen Fund ist bereits eine Anfrage bestätigt.' using errcode = '22023';
    end if;

    update public.return_requests
       set status = 'confirmed', confirmed_at = now(), pickup_instructions = v_text, decision_note = null
     where id = v_claim.id;
    update public.found_items set status = 'reserved' where id = v_item.id;

    perform public.queue_email(
      v_org, v_claim.claimant_email,
      'Deine Anfrage für «' || v_item.title || '» wurde bestätigt',
      public.greeting(v_claim.claimant_name) || E'\n\nGute Nachricht: Die Fundstelle ' || v_office.name
        || ' hat deine Anfrage für ' || v_item.title || ' (' || v_item.item_number || ') bestätigt. Abholen: '
        || v_office.drop_off_location || ', ' || v_office.opening_hours || '. Bitte nimm einen Ausweis mit.'
        || coalesce(' ' || v_office.pickup_rules, '')
        || coalesce(E'\n\n' || v_text, ''),
      v_link, v_claim.id, null);
  else
    if v_claim.status not in ('open', 'confirmed') then
      raise exception 'Diese Anfrage ist bereits abgeschlossen.' using errcode = '22023';
    end if;

    update public.return_requests
       set status = 'rejected', rejected_at = now(), decision_note = v_text
     where id = v_claim.id;

    if v_claim.status = 'confirmed' and v_item.status = 'reserved' then
      update public.found_items set status = 'available' where id = v_item.id;
    end if;

    perform public.queue_email(
      v_org, v_claim.claimant_email,
      'Deine Anfrage für «' || v_item.title || '»',
      public.greeting(v_claim.claimant_name) || E'\n\nLeider passt der Gegenstand ' || v_item.item_number
        || ' nach Prüfung nicht zu deiner Beschreibung.' || coalesce(E'\n\n' || v_text, '')
        || E'\n\nDu kannst weiter suchen oder einen Verlust melden – wir melden uns bei einem neuen Treffer.',
      v_link, v_claim.id, null);
  end if;
end;
$$;

-- «Übergabe abschliessen»: Fund → zurückgegeben, Anfrage → abgeschlossen.
create function public.complete_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org   uuid := public.require_staff();
  v_claim public.return_requests;
begin
  select * into v_claim from public.return_requests where id = p_claim_id and organisation_id = v_org for update;
  if not found then
    raise exception 'Anfrage nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_claim.status <> 'confirmed' then
    raise exception 'Nur bestätigte Anfragen können abgeschlossen werden.' using errcode = '22023';
  end if;
  perform public.set_item_status(v_claim.item_id, 'returned');
end;
$$;

-- -----------------------------------------------------------------------------
-- Verwaltung: Verlustmeldungen und Treffer (Mitarbeitende sehen Score ab 1)
-- -----------------------------------------------------------------------------
create function public.match_for_loss(p_report_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_staff();
  v_r   public.loss_reports;
begin
  select * into v_r from public.loss_reports
   where id = p_report_id and (organisation_id is null or organisation_id = v_org);
  if not found then
    raise exception 'Meldung nicht gefunden.' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(public.public_match_json(m.item_id, m.score, m.reasons, true)
                     || jsonb_build_object('isPublic', i.is_public, 'notifiedAt', s.notified_at)
                     order by m.score desc, i.found_on desc)
      from public.match_items(v_org, v_r.title, v_r.category, v_r.colors, v_r.brand, v_r.description,
                              v_r.lost_location, v_r.lost_from, v_r.lost_to, false, 1, 50) m
      join public.found_items i on i.id = m.item_id
      left join public.match_suggestions s on s.loss_report_id = v_r.id and s.item_id = m.item_id and s.source = 'regel'
  ), '[]'::jsonb);
end;
$$;

create function public.match_for_item(p_item_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org  uuid := public.require_staff();
  v_item public.found_items;
begin
  select * into v_item from public.found_items where id = p_item_id and organisation_id = v_org;
  if not found then
    raise exception 'Fund nicht gefunden.' using errcode = 'P0002';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'reportId', r.id, 'title', r.title, 'category', r.category, 'colors', to_jsonb(r.colors),
             'lostFrom', r.lost_from, 'lostTo', r.lost_to, 'lostLocation', r.lost_location,
             'isUnknownOffice', r.organisation_id is null, 'createdAt', r.created_at,
             'score', m.score, 'reasons', to_jsonb(m.reasons), 'notifiedAt', s.notified_at)
           order by m.score desc, r.created_at desc)
      from public.loss_reports r
      cross join lateral public.match_eval(r.organisation_id, r.title, r.category, r.colors, r.brand, r.description,
                                           r.lost_location, r.lost_from, r.lost_to, v_item) m
      left join public.match_suggestions s on s.loss_report_id = r.id and s.item_id = v_item.id and s.source = 'regel'
     where r.status = 'open' and (r.organisation_id is null or r.organisation_id = v_org) and m.score >= 1
  ), '[]'::jsonb);
end;
$$;

-- Zähler für Badges: «Mögliche Treffer: n» pro Meldung und «n Treffer» pro Fund (nur eigener Bestand).
create function public.staff_match_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_staff();
begin
  return (
    with pairs as (
      select r.id as report_id, i.id as item_id
        from public.loss_reports r
        join public.found_items i
          on i.organisation_id = v_org and i.category = r.category and i.status in ('available', 'reserved')
        cross join lateral public.match_eval(r.organisation_id, r.title, r.category, r.colors, r.brand,
                                             r.description, r.lost_location, r.lost_from, r.lost_to, i) m
       where r.status = 'open' and (r.organisation_id is null or r.organisation_id = v_org) and m.score >= 1
    )
    select jsonb_build_object(
      'reports', coalesce((select jsonb_object_agg(report_id, n) from (select report_id, count(*) n from pairs group by report_id) a), '{}'::jsonb),
      'items', coalesce((select jsonb_object_agg(item_id, n) from (select item_id, count(*) n from pairs group by item_id) b), '{}'::jsonb)
    )
  );
end;
$$;

-- «Suchende Person benachrichtigen» – einmal pro Paar Meldung/Fund.
create function public.notify_loss_match(p_report_id uuid, p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org    uuid := public.require_staff();
  v_report public.loss_reports;
  v_item   public.found_items;
  v_office public.organisations;
  v_score  integer;
  v_reasons text[];
begin
  select * into v_report from public.loss_reports
   where id = p_report_id and status = 'open' and (organisation_id is null or organisation_id = v_org);
  select * into v_item from public.found_items
   where id = p_item_id and organisation_id = v_org and is_public and status in ('available', 'reserved');
  if v_report.id is null or v_item.id is null then
    raise exception 'Benachrichtigen ist nur für offene Meldungen und öffentliche Funde möglich.' using errcode = '22023';
  end if;
  if exists (select 1 from public.match_suggestions
              where loss_report_id = v_report.id and item_id = v_item.id and source = 'regel' and notified_at is not null) then
    return false;
  end if;

  select m.score, m.reasons into v_score, v_reasons
    from public.match_eval(v_report.organisation_id, v_report.title, v_report.category, v_report.colors, v_report.brand,
                           v_report.description, v_report.lost_location, v_report.lost_from, v_report.lost_to, v_item) m;
  select * into v_office from public.organisations where id = v_org;

  insert into public.match_suggestions (loss_report_id, item_id, source, score, reasons, notified_at)
  values (v_report.id, v_item.id, 'regel', coalesce(v_score, 0), to_jsonb(coalesce(v_reasons, '{}')), now())
  on conflict (loss_report_id, item_id, source) do update set notified_at = now(), score = excluded.score, reasons = excluded.reasons;

  perform public.queue_email(
    v_org, v_report.reporter_email,
    'Möglicherweise wurde dein Gegenstand gefunden',
    public.greeting(v_report.reporter_name) || E'\n\nMöglicherweise wurde dein Gegenstand gefunden: ' || v_item.title
      || ' bei ' || v_office.name || '. Schau ihn dir über den Link unten an. Wenn er dir gehört, klicke auf «Das gehört mir».',
    '/fund/' || v_item.item_number, null, v_report.id);
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
  v_org uuid := public.require_staff();
begin
  update public.loss_reports set status = 'closed', closed_at = now()
   where id = p_report_id and status = 'open' and (organisation_id is null or organisation_id = v_org);
  if not found then
    raise exception 'Meldung nicht gefunden oder bereits erledigt.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verwaltung: Fundstellen-Profil (nur Admin)
-- -----------------------------------------------------------------------------
create function public.update_organisation_profile(
  p_drop_off_location text,
  p_opening_hours     text,
  p_pickup_rules      text,
  p_contact_email     text,
  p_contact_phone     text,
  p_retention_days    integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_admin();
begin
  if length(trim(coalesce(p_drop_off_location, ''))) = 0 or length(trim(coalesce(p_opening_hours, ''))) = 0 then
    raise exception 'Abgabeort und Öffnungszeiten sind Pflicht.' using errcode = '22023';
  end if;
  if not public.is_email(trim(p_contact_email)) then
    raise exception 'Bitte eine gültige E-Mail-Adresse angeben.' using errcode = '22023';
  end if;
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'Die Aufbewahrungsfrist muss zwischen 1 und 3650 Tagen liegen.' using errcode = '22023';
  end if;
  update public.organisations
     set drop_off_location = trim(p_drop_off_location), opening_hours = trim(p_opening_hours),
         pickup_rules = nullif(trim(p_pickup_rules), ''), contact_email = trim(p_contact_email),
         contact_phone = nullif(trim(p_contact_phone), ''), retention_days = p_retention_days
   where id = v_org;
end;
$$;

-- -----------------------------------------------------------------------------
-- Datenschutz: Kontaktdaten 90 Tage nach Abschluss entfernen (KONZEPT 10).
-- Für einen geplanten Job (service role) oder manuell im SQL-Editor.
-- -----------------------------------------------------------------------------
create function public.purge_old_contacts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reports integer;
  v_claims  integer;
begin
  update public.loss_reports
     set reporter_email = 'geloescht@example.invalid', reporter_name = null, private_feature = ''
   where status = 'closed' and closed_at < now() - interval '90 days'
     and reporter_email <> 'geloescht@example.invalid';
  get diagnostics v_reports = row_count;

  update public.return_requests
     set claimant_email = 'geloescht@example.invalid', claimant_name = 'Gelöscht', claimant_phone = null,
         pickup_person_name = null, message = ''
   where status in ('completed', 'rejected')
     and coalesce(completed_at, rejected_at) < now() - interval '90 days'
     and claimant_email <> 'geloescht@example.invalid';
  get diagnostics v_claims = row_count;

  delete from public.simulated_emails
   where created_at < now() - interval '90 days'
     and (loss_report_id in (select id from public.loss_reports where reporter_email = 'geloescht@example.invalid')
          or return_request_id in (select id from public.return_requests where claimant_email = 'geloescht@example.invalid'));

  return v_reports + v_claims;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ausführungsrechte
-- -----------------------------------------------------------------------------
revoke all on function public.create_loss_report(uuid, text, public.item_category, public.item_color[], text, text, text, text, date, date, boolean, text, text) from public;
revoke all on function public.match_for_draft(uuid, text, public.item_category, public.item_color[], text, text, text, date, date) from public;
revoke all on function public.get_my_loss(text) from public;
revoke all on function public.close_my_loss(text) from public;
revoke all on function public.set_loss_notify(text, boolean) from public;
revoke all on function public.create_claim(uuid, text, text, text, text, text, boolean, text) from public;
revoke all on function public.get_my_claim(text) from public;
revoke all on function public.save_item(uuid, text, public.item_category, public.item_color[], text, date, text, text, text, text, text, boolean, text) from public, anon;
revoke all on function public.set_item_status(uuid, public.item_status) from public, anon;
revoke all on function public.decide_claim(uuid, boolean, text) from public, anon;
revoke all on function public.complete_claim(uuid) from public, anon;
revoke all on function public.match_for_loss(uuid) from public, anon;
revoke all on function public.match_for_item(uuid) from public, anon;
revoke all on function public.staff_match_counts() from public, anon;
revoke all on function public.notify_loss_match(uuid, uuid) from public, anon;
revoke all on function public.close_loss_report(uuid) from public, anon;
revoke all on function public.update_organisation_profile(text, text, text, text, text, integer) from public, anon;
revoke all on function public.purge_old_contacts() from public, anon, authenticated;

grant execute on function public.create_loss_report(uuid, text, public.item_category, public.item_color[], text, text, text, text, date, date, boolean, text, text) to anon, authenticated;
grant execute on function public.match_for_draft(uuid, text, public.item_category, public.item_color[], text, text, text, date, date) to anon, authenticated;
grant execute on function public.get_my_loss(text) to anon, authenticated;
grant execute on function public.close_my_loss(text) to anon, authenticated;
grant execute on function public.set_loss_notify(text, boolean) to anon, authenticated;
grant execute on function public.create_claim(uuid, text, text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_my_claim(text) to anon, authenticated;
grant execute on function public.save_item(uuid, text, public.item_category, public.item_color[], text, date, text, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.set_item_status(uuid, public.item_status) to authenticated;
grant execute on function public.decide_claim(uuid, boolean, text) to authenticated;
grant execute on function public.complete_claim(uuid) to authenticated;
grant execute on function public.match_for_loss(uuid) to authenticated;
grant execute on function public.match_for_item(uuid) to authenticated;
grant execute on function public.staff_match_counts() to authenticated;
grant execute on function public.notify_loss_match(uuid, uuid) to authenticated;
grant execute on function public.close_loss_report(uuid) to authenticated;
grant execute on function public.update_organisation_profile(text, text, text, text, text, integer) to authenticated;
grant execute on function public.purge_old_contacts() to service_role;
