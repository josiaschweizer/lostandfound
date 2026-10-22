-- =============================================================================
-- lostandfound – Grundschema
-- Organisation → Fundstelle (1:1 in Version 1) → Fundgegenstände
-- Öffentliche Angaben (found_items) sind getrennt von internen (found_item_internal).
-- =============================================================================

create type public.organisation_type as enum ('school', 'lost_property_office', 'company', 'other');

create type public.item_category as enum (
  'electronics', 'clothing', 'keys', 'bags', 'wallets', 'jewellery', 'sports', 'other'
);

create type public.item_color as enum (
  'black', 'white', 'grey', 'blue', 'red', 'green', 'yellow', 'brown', 'pink', 'gold', 'silver', 'multicolor', 'other'
);

create type public.item_status as enum ('available', 'reserved', 'returned');

-- open → confirmed | rejected; confirmed → completed (nach Übergabe) | rejected
create type public.request_status as enum ('open', 'confirmed', 'rejected', 'completed');

create type public.loss_report_status as enum ('open', 'closed');

-- -----------------------------------------------------------------------------
-- Organisationen und Fundstellen
-- -----------------------------------------------------------------------------
create table public.organisations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (length(trim(name)) between 2 and 120),
  type          public.organisation_type not null,
  short_code    text not null unique check (short_code ~ '^[A-Z]{2,5}$'),
  address       text not null check (length(trim(address)) > 0),
  next_item_seq integer not null default 1,
  created_at    timestamptz not null default now()
);

comment on column public.organisations.short_code is 'Kürzel für Fundnummern, z. B. BZS → BZS-2026-0001';

create table public.found_offices (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null unique references public.organisations (id) on delete cascade,
  name             text not null,
  location         text not null,
  contact_email    text not null,
  contact_phone    text,
  opening_hours    text not null,
  pickup_notes     text,
  created_at       timestamptz not null default now()
);

comment on table public.found_offices is 'Fundstelle einer Organisation. Version 1: genau eine pro Organisation (unique).';

-- Mitarbeitende: Zuordnung eines Supabase-Auth-Kontos zu genau einer Organisation.
create table public.memberships (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  full_name        text not null,
  created_at       timestamptz not null default now()
);

create index memberships_organisation_idx on public.memberships (organisation_id);

-- -----------------------------------------------------------------------------
-- Fundgegenstände
-- -----------------------------------------------------------------------------
create table public.found_items (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.organisations (id) on delete cascade,
  item_number         text not null unique,
  title               text not null check (length(trim(title)) between 2 and 120),
  category            public.item_category not null,
  color               public.item_color not null,
  brand               text,
  found_on            date not null,
  found_location      text not null,
  public_description  text not null default '',
  photo_path          text,
  status              public.item_status not null default 'available',
  is_public           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index found_items_org_idx on public.found_items (organisation_id);
create index found_items_catalog_idx on public.found_items (is_public, status, found_on desc);

-- Nur für Mitarbeitende der eigenen Organisation sichtbar (siehe RLS).
create table public.found_item_internal (
  item_id              uuid primary key references public.found_items (id) on delete cascade,
  organisation_id      uuid not null references public.organisations (id) on delete cascade,
  identifying_feature  text not null default '',
  internal_note        text not null default '',
  storage_location     text not null default ''
);

create index found_item_internal_org_idx on public.found_item_internal (organisation_id);

-- -----------------------------------------------------------------------------
-- Rückgabeanfragen und Verlustmeldungen (von Suchenden ohne Konto)
-- -----------------------------------------------------------------------------
create table public.return_requests (
  id                   uuid primary key default gen_random_uuid(),
  item_id              uuid not null references public.found_items (id) on delete cascade,
  organisation_id      uuid not null references public.organisations (id) on delete cascade,
  access_token         uuid not null unique default gen_random_uuid(),
  claimant_name        text not null,
  claimant_contact     text not null,
  message              text not null default '',
  proof_description    text not null,
  status               public.request_status not null default 'open',
  pickup_instructions  text,
  decision_note        text,
  created_at           timestamptz not null default now(),
  decided_at           timestamptz
);

create index return_requests_org_idx on public.return_requests (organisation_id, status);
create index return_requests_item_idx on public.return_requests (item_id);

-- Höchstens eine bestätigte Anfrage pro Gegenstand.
create unique index return_requests_one_confirmed_per_item
  on public.return_requests (item_id) where status = 'confirmed';

create table public.loss_reports (
  id                uuid primary key default gen_random_uuid(),
  -- null = «Weiss nicht, wo verloren» → für alle Organisationen sichtbar
  organisation_id   uuid references public.organisations (id) on delete cascade,
  access_token      uuid not null unique default gen_random_uuid(),
  reporter_name     text not null,
  reporter_contact  text not null,
  title             text not null,
  category          public.item_category not null,
  color             public.item_color not null,
  brand             text,
  lost_on           date not null,
  lost_location     text not null default '',
  description       text not null default '',
  status            public.loss_report_status not null default 'open',
  created_at        timestamptz not null default now()
);

create index loss_reports_org_idx on public.loss_reports (organisation_id, status);

-- -----------------------------------------------------------------------------
-- Simulierte E-Mails (es werden keine echten Nachrichten versendet)
-- -----------------------------------------------------------------------------
create table public.simulated_emails (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid references public.organisations (id) on delete cascade,
  return_request_id  uuid references public.return_requests (id) on delete cascade,
  loss_report_id     uuid references public.loss_reports (id) on delete cascade,
  recipient          text not null,
  link_path          text,
  subject            text not null,
  body               text not null,
  created_at         timestamptz not null default now()
);

create index simulated_emails_org_idx on public.simulated_emails (organisation_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger: Fundnummer vergeben, updated_at pflegen
-- -----------------------------------------------------------------------------
create function public.assign_item_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_seq  integer;
begin
  update public.organisations
     set next_item_seq = next_item_seq + 1
   where id = new.organisation_id
  returning short_code, next_item_seq - 1 into v_code, v_seq;

  new.item_number := v_code || '-' || to_char(new.found_on, 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

create trigger found_items_assign_number
  before insert on public.found_items
  for each row execute function public.assign_item_number();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger found_items_touch
  before update on public.found_items
  for each row execute function public.touch_updated_at();

-- Fundnummer und Organisation sind nach dem Erfassen unveränderlich.
create function public.protect_item_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.item_number := old.item_number;
  new.organisation_id := old.organisation_id;
  return new;
end;
$$;

create trigger found_items_protect_identity
  before update on public.found_items
  for each row execute function public.protect_item_identity();
