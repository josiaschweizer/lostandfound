#!/usr/bin/env bash
# SQL-Checks (pnpm db:check): spielt alle Migrationen und den Seed in eine frische Test-Datenbank
# auf einem lokalen Postgres 16/17 ein und führt danach db-tests/tests.sql aus.
# Supabase-Schemas (auth, storage, vault, net) werden in stub.sql nachgebildet.
#
# Verbindung über die üblichen Postgres-Variablen, z. B.:
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres pnpm db:check
# Die Datenbank «lf_check» wird bei jedem Lauf neu angelegt.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=${DB_CHECK_NAME:-lf_check}
PSQL=(psql -X -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" > /dev/null 2>&1
PSQL+=(-d "$DB")

"${PSQL[@]}" -f db-tests/stub.sql > /dev/null
shopt -s nullglob
for migration in supabase/migrations/*.sql; do
  # pg_net gibt es lokal nicht – das Schema «net» kommt aus stub.sql.
  sed '/create extension if not exists pg_net/d' "$migration" | "${PSQL[@]}" -f - > /dev/null
done
"${PSQL[@]}" -f supabase/seed.sql > /dev/null

output=$("${PSQL[@]}" -f db-tests/tests.sql 2>&1) || { echo "$output" | grep -E "FAIL|ERROR" ; exit 1; }
echo "$output" | grep -E "ok:" | sed 's/^.*NOTICE:  //'
echo "SQL-Checks: $(echo "$output" | grep -c 'ok:') bestanden"
