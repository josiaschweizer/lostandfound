-- Minimaler Nachbau der Supabase-Umgebung für Tests
do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema extensions; create extension pgcrypto schema extensions;
create schema auth;
create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
  email_change text, email_change_token_new text);
create table auth.identities (id uuid primary key, user_id uuid references auth.users on delete cascade,
  provider_id text, provider text, identity_data jsonb, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  unique (provider_id, provider));
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
grant usage on schema auth, extensions to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema storage to anon, authenticated; grant all on storage.objects to authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase-Standardrechte nachbilden
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- Vault und pg_net nachbilden (E-Mail-Versand)
create schema vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
create schema net;
create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.calls (url, body, headers) values (url, body, headers) returning id $$;
