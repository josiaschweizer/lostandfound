-- =============================================================================
-- E-Mail-Versand (optional, über die Edge Function «send-email» und Resend)
--
-- Jede Nachricht landet in simulated_emails (Postausgang, «Meine Meldung», «Meine Anfrage»).
-- Ist der Versand eingerichtet, ruft ein Trigger zusätzlich die Edge Function auf.
-- Einrichten (einmalig im SQL-Editor, siehe README):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-email', 'email_function_url');
--   select vault.create_secret('<zufälliges Secret>', 'email_webhook_secret');
-- =============================================================================

create extension if not exists pg_net with schema extensions;

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
    new.delivery_note := 'E-Mail-Versand nicht eingerichtet – nur im Postausgang.';
  elsif not public.is_email(new.recipient) then
    new.delivery_status := 'skipped';
    new.delivery_note := 'Keine gültige E-Mail-Adresse – nicht versendet.';
  elsif new.recipient ~* '@(example\.(com|org|net)|[^@]+\.example|[^@]+\.invalid)$' then
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
