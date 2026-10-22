-- =============================================================================
-- Row Level Security
-- Grundsatz: Mitarbeitende sehen nur Daten ihrer eigenen Organisation.
-- Anonyme Suchende sehen nur öffentliche Angaben veröffentlichter Gegenstände.
-- Schreibzugriffe von Suchenden laufen ausschliesslich über RPC-Funktionen.
-- =============================================================================

-- Organisation des angemeldeten Kontos (oder null).
create function public.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organisation_id from public.memberships where user_id = auth.uid();
$$;

revoke all on function public.current_organisation_id() from public;
grant execute on function public.current_organisation_id() to anon, authenticated;

alter table public.organisations       enable row level security;
alter table public.found_offices       enable row level security;
alter table public.memberships         enable row level security;
alter table public.found_items         enable row level security;
alter table public.found_item_internal enable row level security;
alter table public.return_requests     enable row level security;
alter table public.loss_reports        enable row level security;
alter table public.simulated_emails    enable row level security;

-- Organisationen & Fundstellen: öffentlich lesbar, nur eigene bearbeitbar.
create policy "organisations: alle lesen"
  on public.organisations for select to anon, authenticated using (true);

create policy "organisations: eigene bearbeiten"
  on public.organisations for update to authenticated
  using (id = public.current_organisation_id())
  with check (id = public.current_organisation_id());

create policy "found_offices: alle lesen"
  on public.found_offices for select to anon, authenticated using (true);

create policy "found_offices: eigene bearbeiten"
  on public.found_offices for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

-- Mitgliedschaften: eigene Organisation.
create policy "memberships: eigene Organisation lesen"
  on public.memberships for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- Fundgegenstände
create policy "found_items: öffentlicher Katalog"
  on public.found_items for select to anon, authenticated
  using (is_public and status <> 'returned');

create policy "found_items: eigene Organisation lesen"
  on public.found_items for select to authenticated
  using (organisation_id = public.current_organisation_id());

create policy "found_items: eigene Organisation erfassen"
  on public.found_items for insert to authenticated
  with check (organisation_id = public.current_organisation_id());

create policy "found_items: eigene Organisation bearbeiten"
  on public.found_items for update to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (organisation_id = public.current_organisation_id());

create policy "found_items: eigene Organisation löschen"
  on public.found_items for delete to authenticated
  using (organisation_id = public.current_organisation_id());

-- Interne Angaben: ausschliesslich eigene Organisation.
create policy "found_item_internal: eigene Organisation"
  on public.found_item_internal for all to authenticated
  using (organisation_id = public.current_organisation_id())
  with check (
    organisation_id = public.current_organisation_id()
    and exists (
      select 1 from public.found_items i
       where i.id = item_id and i.organisation_id = public.current_organisation_id()
    )
  );

-- Rückgabeanfragen: Lesen nur durch die zuständige Organisation.
-- Erstellen und Statuswechsel laufen über RPC-Funktionen.
create policy "return_requests: eigene Organisation lesen"
  on public.return_requests for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- Verlustmeldungen: gewählte Organisation – oder alle, wenn «weiss nicht» (null).
create policy "loss_reports: zuständige oder offene Meldungen lesen"
  on public.loss_reports for select to authenticated
  using (
    public.current_organisation_id() is not null
    and (organisation_id is null or organisation_id = public.current_organisation_id())
  );

-- Simulierte E-Mails: Postausgang der eigenen Organisation.
create policy "simulated_emails: eigene Organisation lesen"
  on public.simulated_emails for select to authenticated
  using (organisation_id = public.current_organisation_id());

-- -----------------------------------------------------------------------------
-- Tabellenrechte (RLS greift zusätzlich)
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.organisations, public.found_offices to anon, authenticated;
grant update (name, type, address) on public.organisations to authenticated;
grant update (name, location, contact_email, contact_phone, opening_hours, pickup_notes)
  on public.found_offices to authenticated;
grant select on public.memberships to authenticated;

-- Anonyme sehen nur die öffentlichen Spalten.
grant select (id, organisation_id, item_number, title, category, color, brand, found_on,
              found_location, public_description, photo_path, status, is_public, created_at)
  on public.found_items to anon;
grant select, delete on public.found_items to authenticated;
grant insert (organisation_id, title, category, color, brand, found_on, found_location,
              public_description, photo_path, status, is_public)
  on public.found_items to authenticated;
-- Status nur über change_item_status() bzw. Anfrage-Funktionen ändern.
grant update (title, category, color, brand, found_on, found_location,
              public_description, photo_path, is_public)
  on public.found_items to authenticated;

grant select, insert, update, delete on public.found_item_internal to authenticated;
grant select on public.return_requests, public.loss_reports, public.simulated_emails to authenticated;
