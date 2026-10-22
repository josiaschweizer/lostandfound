-- =============================================================================
-- Echter E-Mail-Versand (Resend über die Edge Function «send-email»)
--
-- Jede Nachricht landet weiterhin in simulated_emails (Postausgang/Statusseiten).
-- Zusätzlich ruft ein Trigger die Edge Function auf, die über Resend versendet.
-- Ohne Konfiguration (Vault-Secrets fehlen) bleibt alles reine Simulation.
--
-- Konfiguration (einmalig im SQL Editor, siehe README):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-email', 'email_function_url');
--   select vault.create_secret('<zufälliges Secret>', 'email_webhook_secret');
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create type public.email_delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

alter table public.simulated_emails
  add column delivery_status public.email_delivery_status not null default 'skipped',
  add column delivery_note   text,
  add column sent_at         timestamptz;

comment on column public.simulated_emails.delivery_status is
  'pending = an Versand übergeben, sent = von Resend angenommen, failed = Fehler, skipped = nur simuliert';

-- Vault-Secret lesen (null, wenn nicht gesetzt).
create function public.email_setting(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

revoke all on function public.email_setting(text) from public, anon, authenticated;

-- Vor dem Speichern entscheiden, ob versendet wird.
create function public.prepare_email_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.email_setting('email_function_url') is null then
    new.delivery_status := 'skipped';
    new.delivery_note := 'E-Mail-Versand nicht konfiguriert – nur simuliert.';
  elsif new.recipient !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    new.delivery_status := 'skipped';
    new.delivery_note := 'Keine E-Mail-Adresse (z. B. Telefonnummer) – nicht versendet.';
  elsif new.recipient ~* '@(example\.(com|org|net)|[^@]+\.example)$' then
    -- Reservierte Test-Domains der Beispieldaten: nie zustellbar.
    new.delivery_status := 'skipped';
    new.delivery_note := 'Erfundene Test-Adresse – nicht versendet.';
  else
    new.delivery_status := 'pending';
    new.delivery_note := null;
  end if;
  return new;
end;
$$;

create trigger simulated_emails_prepare_delivery
  before insert on public.simulated_emails
  for each row execute function public.prepare_email_delivery();

-- Nach dem Speichern: Edge Function asynchron aufrufen (pg_net).
create function public.dispatch_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.delivery_status = 'pending' then
    perform net.http_post(
      url     := public.email_setting('email_function_url'),
      body    := jsonb_build_object('id', new.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(public.email_setting('email_webhook_secret'), '')
      )
    );
  end if;
  return new;
end;
$$;

create trigger simulated_emails_dispatch
  after insert on public.simulated_emails
  for each row execute function public.dispatch_email();

-- Statusseiten der Suchenden zeigen den Versandstatus mit an.
create or replace function public.email_json(e public.simulated_emails)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'recipient', e.recipient, 'subject', e.subject, 'body', e.body,
    'linkPath', e.link_path, 'createdAt', e.created_at,
    'deliveryStatus', e.delivery_status, 'deliveryNote', e.delivery_note, 'sentAt', e.sent_at
  );
$$;

create or replace function public.get_return_request_status(p_token uuid)
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
      select jsonb_agg(public.email_json(e) order by e.created_at)
        from public.simulated_emails e
       where e.return_request_id = r.id and e.recipient = r.claimant_contact), '[]'::jsonb)
  )
  from public.return_requests r
  join public.found_items i on i.id = r.item_id
  join public.organisations o on o.id = r.organisation_id
  join public.found_offices f on f.organisation_id = o.id
  where r.access_token = p_token;
$$;

create or replace function public.get_loss_report(p_token uuid)
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
      select jsonb_agg(public.email_json(e) order by e.created_at)
        from public.simulated_emails e
       where e.loss_report_id = l.id), '[]'::jsonb)
  )
  from public.loss_reports l
  where l.access_token = p_token;
$$;

revoke all on function public.email_json(public.simulated_emails) from public, anon, authenticated;
