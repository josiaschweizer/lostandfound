#!/bin/bash
# Testet die Migrationen gegen ein lokales Postgres 16 mit nachgebildetem Supabase-auth/storage-Schema.
# Aufruf: PGHOST=/tmp PGPORT=54329 PGUSER=postgres ./db-tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists lf_test" -c "create database lf_test"
P="$P -d lf_test"
$P -f db-tests/stub.sql
for f in supabase/migrations/*.sql; do $P -f "$f"; done
$P -f supabase/seed.sql > /dev/null
$P -f db-tests/tests.sql 2>&1 | grep -E "ok:|FAIL|ERROR" | sed 's/^.*NOTICE:  //'
