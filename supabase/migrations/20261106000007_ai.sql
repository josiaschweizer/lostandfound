-- =============================================================================
-- KI (Edge Function «ai»): Ratenbegrenzung, Tageslimit und Protokoll ohne Inhalte.
-- Nur die Edge Function (service role) darf diese Funktionen aufrufen.
-- =============================================================================

-- Liefert 'ok', 'rate' (zu viele Aufrufe dieses Clients) oder 'daily' (Tageslimit gesamt erreicht).
create function public.ai_allow(p_key text, p_limit integer, p_window_seconds integer, p_daily_limit integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := date_bin(make_interval(secs => p_window_seconds), now(), timestamptz '2000-01-01 00:00:00+00');
  v_count integer;
begin
  if (select count(*) from public.ai_calls
       where created_at >= (public.today_ch()::timestamp at time zone 'Europe/Zurich')) >= p_daily_limit then
    return 'daily';
  end if;

  insert into public.rate_limits (key_hash, bucket, window_start, count)
  values (p_key, 'ai', v_start, 1)
  on conflict (key_hash, bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return case when v_count > p_limit then 'rate' else 'ok' end;
end;
$$;

create function public.ai_log(
  p_action text, p_duration_ms integer, p_ok boolean, p_tokens_in integer, p_tokens_out integer, p_organisation_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_calls (action, duration_ms, ok, tokens_in, tokens_out, organisation_id)
  values (left(p_action, 40), greatest(p_duration_ms, 0), p_ok, p_tokens_in, p_tokens_out, p_organisation_id);
$$;

revoke all on function public.ai_allow(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.ai_log(text, integer, boolean, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.ai_allow(text, integer, integer, integer) to service_role;
grant execute on function public.ai_log(text, integer, boolean, integer, integer, uuid) to service_role;
