-- SQL-Checks für lostandfound-new. Jede Prüfung meldet «ok: …» oder bricht mit «FAIL: …» ab.
\set ON_ERROR_STOP 1

create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok: %', msg; end $$;

-- ===== Etappe 1: Testumgebung =====
select pg_temp.check(exists (select 1 from pg_roles where rolname = 'anon'), 'Rolle anon vorhanden');
select pg_temp.check(exists (select 1 from pg_roles where rolname = 'authenticated'), 'Rolle authenticated vorhanden');
select pg_temp.check(to_regprocedure('auth.uid()') is not null, 'auth.uid() nachgebildet');
select pg_temp.check(to_regclass('storage.objects') is not null, 'Storage nachgebildet');
