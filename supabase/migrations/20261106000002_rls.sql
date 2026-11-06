-- =============================================================================
-- Row Level Security und Rechte
-- Grundsatz: Mitarbeitende sehen nur Daten der eigenen Fundstelle.
-- Personen ohne Konto lesen nur die View public_items und die Fundstellen;
-- alles Schreiben läuft über RPC-Funktionen (siehe …_rpcs.sql).
-- =============================================================================

-- Fundstelle des angemeldeten Kontos (oder null).
create function public.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organisation_id from public.memberships where user_id = auth.uid();
$$;

create function public.current_member_role()
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.memberships where user_id = auth.uid();
$$;

revoke all on function public.current_organisation_id() from public;
revoke all on function public.current_member_role() from public;
grant execute on function public.current_organisation_id() to anon, authenticated;
grant execute on function public.current_member_role() to anon, authenticated;

alter table public.organisations        enable row level security;
alter table public.memberships          enable row level security;
alter table public.item_number_counters enable row level security;
alter table public.found_items          enable row level security;
alter table public.found_item_internal  enable row level security;
alter table public.item_history         enable row level security;
alter table public.loss_reports         enable row level security;
alter table public.return_requests      enable row level security;
alter table public.color_relations      enable row level security;
alter table public.search_synonyms      enable row level security;
alter table public.match_suggestions    enable row level security;
alter table public.rate_limits          enable row level security;
alter table public.ai_calls             enable row level security;
alter table public.simulated_emails     enable row level security;

-- Fundstellen: öffentlich lesbar.
create policy "organisations: alle lesen"
  on public.organisations for select to anon, authenticated using (true);

-- Mitarbeitende: eigene Fundstelle.
create policy "memberships: eigene Fundstelle lesen"
  on public.memberships for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- Funde und interne Angaben: nur eigene Fundstelle (öffentlich nur über public_items).
create policy "found_items: eigene Fundstelle lesen"
  on public.found_items for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "found_item_internal: eigene Fundstelle lesen"
  on public.found_item_internal for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "item_history: eigene Fundstelle lesen"
  on public.item_history for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- Verlustmeldungen: an die eigene Fundstelle oder «Weiss nicht» (alle Fundstellen).
create policy "loss_reports: zuständige oder «Weiss nicht» lesen"
  on public.loss_reports for select to authenticated
  using (
    public.current_organisation_id() is not null
    and (organisation_id is null or organisation_id = public.current_organisation_id())
  );

create policy "return_requests: eigene Fundstelle lesen"
  on public.return_requests for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "match_suggestions: eigene Funde lesen"
  on public.match_suggestions for select to authenticated
  using (exists (
    select 1 from public.found_items i
     where i.id = item_id and i.organisation_id = public.current_organisation_id()
  ));

create policy "simulated_emails: eigene Fundstelle lesen"
  on public.simulated_emails for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- Nachschlagetabellen: öffentlich lesbar.
create policy "color_relations: alle lesen"
  on public.color_relations for select to anon, authenticated using (true);

create policy "search_synonyms: alle lesen"
  on public.search_synonyms for select to anon, authenticated using (true);

-- rate_limits, ai_calls, item_number_counters: keine Policies → kein Zugriff für anon/authenticated.

-- -----------------------------------------------------------------------------
-- Öffentlicher Katalog: nur öffentliche Spalten, nur «öffentlich» und verfügbar/reserviert.
-- Enthält nie internal_feature, internal_note, storage_location, created_by.
-- -----------------------------------------------------------------------------
create view public.public_items
with (security_barrier = true)
as
  select i.id, i.organisation_id, i.item_number, i.title, i.category, i.colors, i.brand,
         i.found_on, i.found_location, i.public_description, i.photo_path, i.status, i.created_at
    from public.found_items i
   where i.is_public and i.status in ('available', 'reserved');

comment on view public.public_items is 'Öffentlicher Fundkatalog (KONZEPT 8.3). Läuft mit den Rechten des Eigentümers, filtert selbst.';

-- -----------------------------------------------------------------------------
-- Tabellenrechte (RLS greift zusätzlich)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.organisations, public.color_relations, public.search_synonyms, public.public_items to anon, authenticated;
grant select on public.memberships, public.found_items, public.found_item_internal, public.item_history,
                public.loss_reports, public.return_requests, public.match_suggestions, public.simulated_emails
  to authenticated;
