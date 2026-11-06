-- =============================================================================
-- lostandfound (App C) – Grundschema
-- Fundstelle (organisations) → Funde (found_items + found_item_internal)
-- Verlustmeldungen und Rückgabe-Anfragen kommen von Personen ohne Konto.
-- Namen und Zuordnung zum Konzept: docs/SCHEMA_MAPPING.md
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create type public.organisation_type as enum ('school', 'lost_property_office', 'company', 'leisure', 'other');
create type public.member_role as enum ('staff', 'admin');

create type public.item_category as enum (
  'electronics', 'clothing', 'keys', 'bags', 'wallets', 'id_cards', 'jewellery', 'sports', 'other'
);

-- Farbgruppen gemäss KONZEPT 6.3
create type public.item_color as enum (
  'black', 'grey', 'white', 'beige', 'brown', 'red', 'pink', 'orange',
  'yellow', 'green', 'turquoise', 'blue', 'violet', 'silver', 'gold', 'multicolor'
);

create type public.item_status as enum ('available', 'reserved', 'returned', 'disposed');
create type public.request_status as enum ('open', 'confirmed', 'rejected', 'completed');
create type public.loss_report_status as enum ('open', 'closed');
create type public.email_delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

-- Heutiges Datum in der Schweiz (nicht UTC), überall für «nicht in der Zukunft» verwendet.
create function public.today_ch()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Zurich')::date;
$$;

-- -----------------------------------------------------------------------------
-- Fundstellen
-- -----------------------------------------------------------------------------
create table public.organisations (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null check (length(trim(name)) between 2 and 120),
  type               public.organisation_type not null,
  short_code         text not null unique check (short_code ~ '^[A-Z]{2,5}$'),
  address            text not null check (length(trim(address)) > 0),
  drop_off_location  text not null check (length(trim(drop_off_location)) > 0),
  opening_hours      text not null check (length(trim(opening_hours)) > 0),
  pickup_rules       text,
  contact_email      text not null,
  contact_phone      text,
  retention_days     integer not null default 90 check (retention_days > 0),
  created_at         timestamptz not null default now()
);

comment on column public.organisations.short_code is 'Kürzel für Fundnummern, z. B. BSM → BSM-2026-0001';
comment on column public.organisations.drop_off_location is 'Abgabe- und Abholort, z. B. «Sekretariat, Raum A012»';

create table public.memberships (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  full_name        text not null,
  role             public.member_role not null default 'staff',
  created_at       timestamptz not null default now()
);

create index memberships_organisation_idx on public.memberships (organisation_id);

-- Zähler für Fundnummern pro Fundstelle und Jahr
create table public.item_number_counters (
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  year             integer not null,
  next_seq         integer not null default 1,
  primary key (organisation_id, year)
);

-- -----------------------------------------------------------------------------
-- Funde
-- -----------------------------------------------------------------------------
create table public.found_items (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.organisations (id) on delete cascade,
  item_number         text not null unique,
  title               text not null check (length(trim(title)) between 2 and 120),
  category            public.item_category not null,
  colors              public.item_color[] not null check (cardinality(colors) between 1 and 3),
  brand               text check (brand is null or length(brand) <= 80),
  found_on            date not null,
  found_location      text not null check (length(trim(found_location)) between 1 and 200),
  public_description  text not null default '' check (length(public_description) <= 1000),
  photo_path          text,
  status              public.item_status not null default 'available',
  is_public           boolean not null default true,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index found_items_org_idx on public.found_items (organisation_id, created_at desc);
create index found_items_catalog_idx on public.found_items (is_public, status, found_on desc);

-- Nur für Mitarbeitende der eigenen Fundstelle (nie öffentlich, nie an die KI).
create table public.found_item_internal (
  item_id              uuid primary key references public.found_items (id) on delete cascade,
  organisation_id      uuid not null references public.organisations (id) on delete cascade,
  identifying_feature  text not null default '' check (length(identifying_feature) <= 500),
  internal_note        text not null default '' check (length(internal_note) <= 1000),
  storage_location     text not null check (length(trim(storage_location)) between 1 and 200)
);

create index found_item_internal_org_idx on public.found_item_internal (organisation_id);

-- Änderungsprotokoll (T15): eine Zeile pro geändertem Feld
create table public.item_history (
  id               bigint generated always as identity primary key,
  item_id          uuid not null references public.found_items (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  changed_by       uuid references auth.users (id) on delete set null,
  changed_at       timestamptz not null default now(),
  field            text not null,
  old_value        text,
  new_value        text
);

create index item_history_item_idx on public.item_history (item_id, changed_at desc);

-- -----------------------------------------------------------------------------
-- Verlustmeldungen und Rückgabe-Anfragen (ohne Konto, Zugang über Token-Link)
-- Gespeichert wird nur der SHA-256-Hash des Tokens.
-- -----------------------------------------------------------------------------
create table public.loss_reports (
  id                   uuid primary key default gen_random_uuid(),
  -- null = «Weiss nicht» → alle Fundstellen sehen die Meldung
  organisation_id      uuid references public.organisations (id) on delete cascade,
  token_hash           bytea not null unique,
  reporter_name        text check (reporter_name is null or length(reporter_name) <= 120),
  reporter_email       text not null check (reporter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  title                text not null check (length(trim(title)) between 2 and 120),
  category             public.item_category not null,
  colors               public.item_color[] not null default '{}' check (cardinality(colors) <= 3),
  brand                text check (brand is null or length(brand) <= 80),
  description          text not null default '' check (length(description) <= 1000),
  private_feature      text not null default '' check (length(private_feature) <= 500),
  lost_location        text not null default '' check (length(lost_location) <= 200),
  lost_from            date not null,
  lost_to              date not null,
  lost_date_uncertain  boolean not null default false,
  notify               boolean not null default true,
  status               public.loss_report_status not null default 'open',
  created_at           timestamptz not null default now(),
  closed_at            timestamptz,
  check (lost_to >= lost_from)
);

create index loss_reports_org_idx on public.loss_reports (organisation_id, status);

create table public.return_requests (
  id                   uuid primary key default gen_random_uuid(),
  item_id              uuid not null references public.found_items (id) on delete cascade,
  organisation_id      uuid not null references public.organisations (id) on delete cascade,
  token_hash           bytea not null unique,
  claimant_name        text not null check (length(trim(claimant_name)) between 1 and 120),
  claimant_email       text not null check (claimant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  claimant_phone       text check (claimant_phone is null or length(claimant_phone) <= 40),
  message              text not null default '' check (length(message) <= 1000),
  recognition_text     text not null check (length(trim(recognition_text)) between 10 and 1000),
  pickup_by_other      boolean not null default false,
  pickup_person_name   text check (pickup_person_name is null or length(pickup_person_name) <= 120),
  status               public.request_status not null default 'open',
  pickup_instructions  text,
  decision_note        text,
  created_at           timestamptz not null default now(),
  confirmed_at         timestamptz,
  rejected_at          timestamptz,
  completed_at         timestamptz
);

create index return_requests_org_idx on public.return_requests (organisation_id, status);
create index return_requests_item_idx on public.return_requests (item_id);

-- Höchstens eine bestätigte Anfrage pro Fund.
create unique index return_requests_one_confirmed_per_item
  on public.return_requests (item_id) where status = 'confirmed';

-- -----------------------------------------------------------------------------
-- Matching-Hilfstabellen
-- -----------------------------------------------------------------------------
create table public.color_relations (
  color    public.item_color not null,
  related  public.item_color not null,
  primary key (color, related)
);

create table public.search_synonyms (
  group_id  integer not null,
  term      text not null,
  primary key (group_id, term)
);

-- Gemerkte Treffer, z. B. ob die suchende Person schon benachrichtigt wurde.
create table public.match_suggestions (
  loss_report_id  uuid not null references public.loss_reports (id) on delete cascade,
  item_id         uuid not null references public.found_items (id) on delete cascade,
  source          text not null check (source in ('regel', 'ki')),
  score           integer not null,
  reasons         jsonb not null default '[]',
  notified_at     timestamptz,
  created_at      timestamptz not null default now(),
  primary key (loss_report_id, item_id, source)
);

-- -----------------------------------------------------------------------------
-- Betrieb: Ratenbegrenzung, KI-Protokoll (ohne Inhalte), Postausgang
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key_hash      text not null,
  bucket        text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key_hash, bucket, window_start)
);

create table public.ai_calls (
  id               bigint generated always as identity primary key,
  action           text not null,
  duration_ms      integer not null,
  ok               boolean not null,
  tokens_in        integer,
  tokens_out       integer,
  organisation_id  uuid references public.organisations (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index ai_calls_created_idx on public.ai_calls (created_at);

create table public.simulated_emails (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid references public.organisations (id) on delete cascade,
  return_request_id  uuid references public.return_requests (id) on delete cascade,
  loss_report_id     uuid references public.loss_reports (id) on delete cascade,
  recipient          text not null,
  subject            text not null,
  body               text not null,
  link_path          text,
  created_at         timestamptz not null default now(),
  delivery_status    public.email_delivery_status not null default 'skipped',
  delivery_note      text,
  sent_at            timestamptz
);

create index simulated_emails_org_idx on public.simulated_emails (organisation_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------

-- Fundnummer KÜRZEL-JJJJ-NNNN, Zähler pro Fundstelle und Jahr.
create function public.assign_item_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_year integer := extract(year from new.found_on)::integer;
  v_seq  integer;
begin
  select short_code into v_code from public.organisations where id = new.organisation_id;

  insert into public.item_number_counters (organisation_id, year, next_seq)
  values (new.organisation_id, v_year, 2)
  on conflict (organisation_id, year) do update set next_seq = public.item_number_counters.next_seq + 1
  returning next_seq - 1 into v_seq;

  new.item_number := v_code || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');
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

-- Fundnummer, Fundstelle und Ersteller sind unveränderlich.
create function public.protect_item_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.item_number := old.item_number;
  new.organisation_id := old.organisation_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger found_items_protect_identity
  before update on public.found_items
  for each row execute function public.protect_item_identity();

-- Änderungsprotokoll
create function public.log_item_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_item uuid;
  v_fields text[];
begin
  if tg_table_name = 'found_items' then
    v_item := new.id;
    v_fields := array['title', 'category', 'colors', 'brand', 'found_on', 'found_location',
                      'public_description', 'photo_path', 'status', 'is_public'];
  else
    v_item := new.item_id;
    v_fields := array['identifying_feature', 'internal_note', 'storage_location'];
  end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'found_items' then
      insert into public.item_history (item_id, organisation_id, changed_by, field, new_value)
      values (v_item, new.organisation_id, auth.uid(), 'created', new.item_number);
    end if;
    return new;
  end if;

  v_old := to_jsonb(old);
  v_new := to_jsonb(new);
  foreach v_key in array v_fields loop
    if v_old -> v_key is distinct from v_new -> v_key then
      insert into public.item_history (item_id, organisation_id, changed_by, field, old_value, new_value)
      values (v_item, new.organisation_id, auth.uid(), v_key, v_old ->> v_key, v_new ->> v_key);
    end if;
  end loop;
  return new;
end;
$$;

create trigger found_items_history
  after insert or update on public.found_items
  for each row execute function public.log_item_changes();

create trigger found_item_internal_history
  after update on public.found_item_internal
  for each row execute function public.log_item_changes();
