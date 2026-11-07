-- =============================================================================
-- KI im Hintergrund (KONZEPT 7.3, 7.4): semantische Treffer, Such-Erweiterung, Kennzahl.
--
-- Die Edge Function «ai» holt über ai_loss_context / ai_item_context nur öffentliche
-- Beschreibungen (nie Kontaktdaten, interne Merkmale oder Notizen), lässt sie von der KI
-- bewerten und speichert das Ergebnis mit ai_store_matches in match_suggestions (source 'ki').
-- Angezeigt werden KI-Treffer in denselben Listen wie Regel-Treffer:
--   Suchende ab Bewertung 60 (nach den Regel-Treffern, insgesamt max. 5), Fundstellen ab 40.
-- =============================================================================

-- Zwischenspeicher für KI-Suchbegriffe (7 Tage gültig)
create table public.query_expansions (
  term        text primary key check (char_length(term) between 2 and 80),
  terms       text[] not null default '{}',
  category    public.item_category,
  created_at  timestamptz not null default now()
);
alter table public.query_expansions enable row level security;
-- keine Policies: nur die Edge Function (service role) über die Funktionen unten

-- ---------------------------------------------------------------------------
-- Kontext für die KI (nur service role)
-- ---------------------------------------------------------------------------
create function public.ai_item_json(i public.found_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'titel', i.title, 'kategorie', i.category, 'farben', to_jsonb(i.colors), 'marke', i.brand,
    'beschreibung', nullif(i.public_description, ''), 'ort', i.found_location, 'gefunden_am', i.found_on);
$$;

create function public.ai_loss_json(r public.loss_reports)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'titel', r.title, 'kategorie', r.category, 'farben', to_jsonb(r.colors), 'marke', r.brand,
    'beschreibung', nullif(r.description, ''), 'ort', r.lost_location,
    'verloren_von', r.lost_from, 'verloren_bis', r.lost_to);
$$;

-- Verlustmeldung + bis zu 30 Kandidaten (Datumsfenster und Fundstelle wie 6.2, Kategorie und Farbe NICHT erforderlich).
-- Aufruf mit p_token (suchende Person, nur öffentliche Funde) oder mit p_loss_id + p_organisation_id (Fundstelle, nur eigener Bestand).
create function public.ai_loss_context(p_token text default null, p_loss_id uuid default null, p_organisation_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_r public.loss_reports;
begin
  if p_token is not null then
    select * into v_r from public.loss_reports where token_hash = public.hash_token(p_token) and status = 'open';
  elsif p_loss_id is not null and p_organisation_id is not null then
    select * into v_r from public.loss_reports
     where id = p_loss_id and status = 'open' and (organisation_id is null or organisation_id = p_organisation_id);
  end if;
  if v_r.id is null then return null; end if;

  return jsonb_build_object(
    'loss', public.ai_loss_json(v_r),
    'candidates', coalesce((
      select jsonb_agg(public.ai_item_json(fi) order by abs(fi.found_on - v_r.lost_from), fi.created_at desc)
        from (
          select i.id from public.found_items i
           where i.status in ('available', 'reserved')
             and i.found_on between v_r.lost_from - 3 and v_r.lost_to + 30
             and (v_r.organisation_id is null or i.organisation_id = v_r.organisation_id)
             and (p_token is null or i.is_public)
             and (p_organisation_id is null or i.organisation_id = p_organisation_id)
           order by abs(i.found_on - v_r.lost_from), i.created_at desc
           limit 30
        ) c
        join public.found_items fi on fi.id = c.id), '[]'::jsonb));
end;
$$;

-- Fund + bis zu 30 offene Verlustmeldungen, die zeitlich und von der Fundstelle her passen.
create function public.ai_item_context(p_item_id uuid, p_organisation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_i public.found_items;
begin
  select * into v_i from public.found_items
   where id = p_item_id and organisation_id = p_organisation_id and status in ('available', 'reserved');
  if v_i.id is null then return null; end if;

  return jsonb_build_object(
    'item', public.ai_item_json(v_i),
    'candidates', coalesce((
      select jsonb_agg(public.ai_loss_json(lr) order by lr.created_at desc)
        from (
          select r.id from public.loss_reports r
           where r.status = 'open'
             and (r.organisation_id is null or r.organisation_id = p_organisation_id)
             and v_i.found_on between r.lost_from - 3 and r.lost_to + 30
           order by r.created_at desc
           limit 30
        ) c
        join public.loss_reports lr on lr.id = c.id), '[]'::jsonb));
end;
$$;

-- Speichert KI-Bewertungen: [{ "lossId": uuid, "itemId": uuid, "score": 0-100, "reason": text }]
create function public.ai_store_matches(p_pairs jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.match_suggestions (loss_report_id, item_id, source, score, reasons)
  select (p ->> 'lossId')::uuid, (p ->> 'itemId')::uuid, 'ki',
         greatest(0, least(100, (p ->> 'score')::integer)),
         jsonb_build_array('ki:' || left(coalesce(p ->> 'reason', ''), 120))
    from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) p
   where exists (select 1 from public.loss_reports r where r.id = (p ->> 'lossId')::uuid)
     and exists (select 1 from public.found_items i where i.id = (p ->> 'itemId')::uuid)
  on conflict (loss_report_id, item_id, source) do update
    set score = excluded.score, reasons = excluded.reasons, created_at = now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.ai_get_expansion(p_term text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('terms', to_jsonb(e.terms), 'category', e.category)
    from public.query_expansions e
   where e.term = lower(trim(p_term)) and e.created_at > now() - interval '7 days';
$$;

create function public.ai_put_expansion(p_term text, p_terms text[], p_category text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.query_expansions (term, terms, category)
  values (lower(trim(p_term)), coalesce(p_terms, '{}'),
          case when p_category = any (enum_range(null::public.item_category)::text[]) then p_category::public.item_category end)
  on conflict (term) do update set terms = excluded.terms, category = excluded.category, created_at = now();
$$;

revoke all on function public.ai_item_json(public.found_items) from public, anon, authenticated;
revoke all on function public.ai_loss_json(public.loss_reports) from public, anon, authenticated;
revoke all on function public.ai_loss_context(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.ai_item_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ai_store_matches(jsonb) from public, anon, authenticated;
revoke all on function public.ai_get_expansion(text) from public, anon, authenticated;
revoke all on function public.ai_put_expansion(text, text[], text) from public, anon, authenticated;
grant execute on function public.ai_loss_context(text, uuid, uuid) to service_role;
grant execute on function public.ai_item_context(uuid, uuid) to service_role;
grant execute on function public.ai_store_matches(jsonb) to service_role;
grant execute on function public.ai_get_expansion(text) to service_role;
grant execute on function public.ai_put_expansion(text, text[], text) to service_role;

-- ---------------------------------------------------------------------------
-- Anzeige: KI-Treffer in denselben Listen wie die Regel-Treffer
-- ---------------------------------------------------------------------------
create function public.ki_reasons(p_reasons jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(select jsonb_array_elements_text(p_reasons)), '{}');
$$;

-- «Meine Verlustmeldung»: Regel-Treffer zuerst, danach KI-Treffer ab 60 (ohne Doppelte), insgesamt max. 5.
create or replace function public.get_my_loss(p_token text)
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
      with rule as (
        select x.item_id, x.score, x.reasons, row_number() over () as ord
          from public.match_items(l.organisation_id, l.title, l.category, l.colors, l.brand, l.description,
                                  l.lost_location, l.lost_from, l.lost_to, true, 2, 5) x
      ), ki as (
        select s.item_id, s.score, public.ki_reasons(s.reasons) as reasons
          from public.match_suggestions s
          join public.found_items i on i.id = s.item_id
         where s.loss_report_id = l.id and s.source = 'ki' and s.score >= 60
           and i.is_public and i.status in ('available', 'reserved')
           and s.item_id not in (select item_id from rule)
      ), merged as (
        select public.public_match_json(item_id, score, reasons, false) || '{"source":"regel"}'::jsonb as j, 0 as grp, score, ord from rule
        union all
        select public.public_match_json(item_id, score, reasons, false) || '{"source":"ki"}'::jsonb, 1, score, 0 from ki
      )
      select jsonb_agg(j order by grp, score desc, ord)
        from (select * from merged order by grp, score desc, ord limit 5) m
    ), '[]'::jsonb) else '[]'::jsonb end,
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

-- Verwaltung: Treffer zu einer Meldung (Regel ab 1, KI ab 40 aus dem eigenen Bestand)
create or replace function public.match_for_loss(p_report_id uuid)
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
    with rule as (
      select m.item_id, m.score, m.reasons
        from public.match_items(v_org, v_r.title, v_r.category, v_r.colors, v_r.brand, v_r.description,
                                v_r.lost_location, v_r.lost_from, v_r.lost_to, false, 1, 50) m
    ), ki as (
      select s.item_id, s.score, public.ki_reasons(s.reasons) as reasons
        from public.match_suggestions s
        join public.found_items i on i.id = s.item_id
       where s.loss_report_id = v_r.id and s.source = 'ki' and s.score >= 40
         and i.organisation_id = v_org and i.status in ('available', 'reserved')
         and s.item_id not in (select item_id from rule)
    ), merged as (
      select item_id, score, reasons, 'regel' as source, 0 as grp from rule
      union all
      select item_id, score, reasons, 'ki', 1 from ki
    )
    select jsonb_agg(public.public_match_json(m.item_id, m.score, m.reasons, true)
                     || jsonb_build_object('isPublic', i.is_public, 'source', m.source,
                                           'notifiedAt', (select max(s.notified_at) from public.match_suggestions s
                                                           where s.loss_report_id = v_r.id and s.item_id = m.item_id))
                     order by m.grp, m.score desc, i.found_on desc)
      from merged m
      join public.found_items i on i.id = m.item_id
  ), '[]'::jsonb);
end;
$$;

-- Verwaltung: passende Verlustmeldungen zu einem Fund (Regel ab 1, KI ab 40)
create or replace function public.match_for_item(p_item_id uuid)
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
    with rule as (
      select r.id as report_id, m.score, m.reasons
        from public.loss_reports r
        cross join lateral public.match_eval(r.organisation_id, r.title, r.category, r.colors, r.brand, r.description,
                                             r.lost_location, r.lost_from, r.lost_to, v_item) m
       where r.status = 'open' and (r.organisation_id is null or r.organisation_id = v_org) and m.score >= 1
    ), ki as (
      select s.loss_report_id as report_id, s.score, public.ki_reasons(s.reasons) as reasons
        from public.match_suggestions s
        join public.loss_reports r on r.id = s.loss_report_id
       where s.item_id = v_item.id and s.source = 'ki' and s.score >= 40
         and r.status = 'open' and (r.organisation_id is null or r.organisation_id = v_org)
         and s.loss_report_id not in (select report_id from rule)
    ), merged as (
      select report_id, score, reasons, 'regel' as source, 0 as grp from rule
      union all
      select report_id, score, reasons, 'ki', 1 from ki
    )
    select jsonb_agg(jsonb_build_object(
             'reportId', r.id, 'title', r.title, 'category', r.category, 'colors', to_jsonb(r.colors),
             'lostFrom', r.lost_from, 'lostTo', r.lost_to, 'lostLocation', r.lost_location,
             'isUnknownOffice', r.organisation_id is null, 'createdAt', r.created_at,
             'score', m.score, 'reasons', to_jsonb(m.reasons), 'source', m.source,
             'notifiedAt', (select max(s.notified_at) from public.match_suggestions s
                             where s.loss_report_id = r.id and s.item_id = v_item.id))
           order by m.grp, m.score desc, r.created_at desc)
      from merged m
      join public.loss_reports r on r.id = m.report_id
  ), '[]'::jsonb);
end;
$$;

-- Zähler für Badges inkl. KI-Treffer ab 40
create or replace function public.staff_match_counts()
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
    with rule as (
      select r.id as report_id, i.id as item_id
        from public.loss_reports r
        join public.found_items i
          on i.organisation_id = v_org and i.category = r.category and i.status in ('available', 'reserved')
        cross join lateral public.match_eval(r.organisation_id, r.title, r.category, r.colors, r.brand,
                                             r.description, r.lost_location, r.lost_from, r.lost_to, i) m
       where r.status = 'open' and (r.organisation_id is null or r.organisation_id = v_org) and m.score >= 1
    ), ki as (
      select s.loss_report_id as report_id, s.item_id
        from public.match_suggestions s
        join public.loss_reports r on r.id = s.loss_report_id
        join public.found_items i on i.id = s.item_id
       where s.source = 'ki' and s.score >= 40 and r.status = 'open'
         and (r.organisation_id is null or r.organisation_id = v_org)
         and i.organisation_id = v_org and i.status in ('available', 'reserved')
    ), pairs as (
      select report_id, item_id from rule
      union
      select report_id, item_id from ki
    )
    select jsonb_build_object(
      'reports', coalesce((select jsonb_object_agg(report_id, n) from (select report_id, count(*) n from pairs group by report_id) a), '{}'::jsonb),
      'items', coalesce((select jsonb_object_agg(item_id, n) from (select item_id, count(*) n from pairs group by item_id) b), '{}'::jsonb)
    )
  );
end;
$$;

-- Kennzahl für die Übersicht: Was hat die KI in den letzten 30 Tagen für diese Fundstelle getan?
create function public.ai_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.require_staff();
begin
  return jsonb_build_object(
    -- KI-Treffer im eigenen Bestand, die die Regeln nicht gefunden hätten
    'kiOnlyMatches', (
      select count(*)
        from public.match_suggestions s
        join public.found_items i on i.id = s.item_id
        join public.loss_reports r on r.id = s.loss_report_id
       where s.source = 'ki' and s.score >= 40 and i.organisation_id = v_org
         and s.created_at > now() - interval '30 days'
         and not exists (
           select 1 from public.match_eval(r.organisation_id, r.title, r.category, r.colors, r.brand, r.description,
                                           r.lost_location, r.lost_from, r.lost_to, i) m
            where m.score >= 1)),
    -- Formulare, die Mitarbeitende mit KI ausgefüllt haben (Text oder Foto)
    'assistedForms', (
      select count(*) from public.ai_calls
       where organisation_id = v_org and ok and action in ('extract_fields', 'photo_suggest')
         and created_at > now() - interval '30 days')
  );
end;
$$;

revoke all on function public.ai_stats() from public, anon;
grant execute on function public.ai_stats() to authenticated;
