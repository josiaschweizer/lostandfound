-- =============================================================================
-- Rate-Limit für die KI (Edge Function «ai»)
-- Zählt Anfragen pro Schlüssel (gehashte IP) in einem gleitenden Zeitfenster.
-- Nur die Edge Function (service_role) darf zugreifen.
-- =============================================================================

create table public.ai_requests (
  id          bigint generated always as identity primary key,
  client_key  text not null,
  created_at  timestamptz not null default now()
);

create index ai_requests_key_time_idx on public.ai_requests (client_key, created_at desc);

alter table public.ai_requests enable row level security;
-- Keine Policies: anon/authenticated haben keinen Zugriff.
revoke all on public.ai_requests from anon, authenticated;

-- Liefert true und zählt die Anfrage, wenn das Limit noch nicht erreicht ist.
create function public.ai_rate_check(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Serialisiert gleichzeitige Anfragen desselben Schlüssels.
  perform pg_advisory_xact_lock(hashtext(p_key));

  -- Alte Einträge gelegentlich aufräumen.
  if random() < 0.05 then
    delete from public.ai_requests where created_at < now() - interval '1 day';
  end if;

  select count(*) into v_count
    from public.ai_requests
   where client_key = p_key
     and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.ai_requests (client_key) values (p_key);
  return true;
end;
$$;

revoke all on function public.ai_rate_check(text, integer, integer) from public, anon, authenticated;
grant execute on function public.ai_rate_check(text, integer, integer) to service_role;
