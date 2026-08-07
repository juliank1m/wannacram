#!/bin/bash
# Applies the repo's migrations to a disposable local Postgres cluster with
# minimal Supabase stubs, then asserts the schema came out as intended.
# Touches nothing outside its own temp dir; the real project is never contacted.
set -euo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
SOCK=$WORK/sock
DATA=$WORK/data
DB=wannacram_verify

mkdir -p "$SOCK" "$DATA"

echo "### initdb"
initdb -D "$DATA" -U postgres --auth=trust >/dev/null

echo "### start"
pg_ctl -D "$DATA" -l "$WORK/pg.log" -o "-k $SOCK -h ''" -w start >/dev/null
trap 'pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

psql() { command psql -h "$SOCK" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql -d postgres -c "create database $DB" >/dev/null

echo "### supabase stubs"
psql -d $DB <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);
-- Real auth.uid() reads the request JWT; a GUC is enough to exercise policies.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;
SQL

echo "### apply migrations (in filename order)"
for f in "$REPO"/supabase/migrations/*.sql; do
  echo "    -> $(basename "$f")"
  psql -d $DB -f "$f" >/dev/null
done

echo
echo "### assertions"
psql -d $DB -v ON_ERROR_STOP=1 <<'SQL'
\set QUIET on
do $$
declare
  n int;
  u1 uuid; u2 uuid; t1 uuid; d1 uuid;
begin
  -- RLS enabled on every app table
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and c.relname in
      ('documents','study_sessions','topics','topic_documents') and c.relrowsecurity;
  assert n = 4, format('RLS enabled on %s/4 tables', n);

  -- Policies target `authenticated`, not every role
  select count(*) into n from pg_policies
    where schemaname='public' and 'authenticated' = any(roles);
  assert n = 4, format('expected 4 authenticated-scoped policies, got %s', n);

  select count(*) into n from pg_policies
    where schemaname='public' and roles = '{public}';
  assert n = 0, format('%s policies still apply to every role', n);

  -- auth.uid() wrapped in a subquery (initplan) rather than called per row
  select count(*) into n from pg_policies
    where schemaname='public' and qual like '%SELECT auth.uid()%';
  assert n = 4, format('only %s/4 policies use (select auth.uid())', n);

  -- Least-privilege grants
  assert has_table_privilege('authenticated','public.topics','select');
  assert not has_table_privilege('authenticated','public.topics','insert'),
    'authenticated should not insert topics (service role does)';
  assert not has_table_privilege('authenticated','public.documents','insert'),
    'authenticated should not insert documents (service role does)';
  assert has_table_privilege('authenticated','public.study_sessions','insert');
  assert has_table_privilege('authenticated','public.study_sessions','delete');
  assert not has_table_privilege('anon','public.topics','select'),
    'anon needs no table access';
  assert has_table_privilege('service_role','public.documents','delete');

  -- Indexes, including the FK columns Postgres does not index for you
  foreach n in array array[1] loop end loop;
  perform 1 from pg_indexes where schemaname='public'
    and indexname='study_sessions_user_topic_mode_idx';
  assert found, 'missing unique index study_sessions_user_topic_mode_idx';
  perform 1 from pg_indexes where schemaname='public' and indexname='study_sessions_topic_id_idx';
  assert found, 'missing study_sessions_topic_id_idx';
  perform 1 from pg_indexes where schemaname='public' and indexname='study_sessions_document_id_idx';
  assert found, 'missing study_sessions_document_id_idx';
  perform 1 from pg_indexes where schemaname='public' and indexname='topic_documents_document_id_idx';
  assert found, 'missing topic_documents_document_id_idx';

  raise notice 'schema assertions OK';
end $$;

-- The critical review finding, exercised end to end: deleting a user must not
-- trip a foreign key, and must leave nothing behind.
do $$
declare u uuid; t uuid; d uuid;
begin
  insert into auth.users (email) values ('a@example.com') returning id into u;
  insert into topics (user_id, title) values (u, 'Topic') returning id into t;
  insert into documents (user_id, title, file_path, extracted_text, file_type)
    values (u, 'Doc', u || '/1-a.pdf', 'text', 'pdf') returning id into d;
  insert into topic_documents (topic_id, document_id) values (t, d);
  insert into study_sessions (user_id, topic_id, document_id, mode, messages)
    values (u, t, d, 'quiz', '{}');

  delete from auth.users where id = u;   -- this is what used to raise

  assert (select count(*) from topics where user_id=u) = 0, 'topics survived';
  assert (select count(*) from documents where user_id=u) = 0, 'documents survived';
  assert (select count(*) from study_sessions where user_id=u) = 0, 'sessions survived';
  assert (select count(*) from topic_documents where topic_id=t) = 0, 'links survived';
  raise notice 'account deletion cascade OK';
end $$;

-- Deleting a document must not be blocked by a session referencing it.
do $$
declare u uuid; t uuid; d uuid;
begin
  insert into auth.users (email) values ('b@example.com') returning id into u;
  insert into topics (user_id, title) values (u, 'T') returning id into t;
  insert into documents (user_id, title, file_path, extracted_text, file_type)
    values (u, 'D', u || '/1-b.pdf', 'x', 'pdf') returning id into d;
  insert into study_sessions (user_id, topic_id, document_id, mode, messages)
    values (u, t, d, 'chat', '[]');

  delete from documents where id = d;
  assert (select count(*) from study_sessions where document_id=d) = 0;
  delete from auth.users where id = u;
  raise notice 'document delete cascade OK';
end $$;

-- The unique index must actually stop the duplicate rows that broke quiz reset.
do $$
declare u uuid; t uuid; ok boolean := false;
begin
  insert into auth.users (email) values ('c@example.com') returning id into u;
  insert into topics (user_id, title) values (u, 'T') returning id into t;
  insert into study_sessions (user_id, topic_id, mode, messages) values (u, t, 'quiz', '{}');
  begin
    insert into study_sessions (user_id, topic_id, mode, messages) values (u, t, 'quiz', '{}');
  exception when unique_violation then ok := true;
  end;
  assert ok, 'duplicate (user, topic, quiz) session was allowed';
  delete from auth.users where id = u;
  raise notice 'unique session index OK';
end $$;

-- RLS actually isolates users when queried as `authenticated`.
do $$
declare u1 uuid; u2 uuid;
begin
  insert into auth.users (email) values ('d@example.com') returning id into u1;
  insert into auth.users (email) values ('e@example.com') returning id into u2;
  insert into topics (user_id, title) values (u1, 'mine'), (u2, 'theirs');
end $$;
SQL

# RLS check has to run as the authenticated role, in its own session.
U1=$(command psql -h "$SOCK" -U postgres -d $DB -tAc \
  "select id from auth.users where email='d@example.com'")
VISIBLE=$(command psql -h "$SOCK" -U postgres -d $DB -tAc \
  "begin;
   set local role authenticated;
   set local request.jwt.claim.sub = '$U1';
   select coalesce(string_agg(title,','),'<none>') from topics;
   rollback;" -q | head -1)

if [ "$VISIBLE" = "mine" ]; then
  echo "NOTICE:  RLS isolation OK (authenticated sees only 'mine')"
else
  echo "FAIL: authenticated saw '$VISIBLE', expected 'mine'"; exit 1
fi

echo
# Only the new files need to be idempotent. 20260303/20260304 are already in the
# project's migration history and will never be re-run; the new ones will be
# applied for the first time to a database where the objects already exist.
echo "### idempotency: re-apply the new migrations to the same database"
for f in 00000000000000_init 20260807_data_api_grants 20260807_integrity; do
  psql -d $DB -f "$REPO/supabase/migrations/$f.sql" >/dev/null \
    || { echo "FAIL: $f.sql is not idempotent"; exit 1; }
  echo "    -> $f.sql re-applied cleanly"
done

echo
echo "### ALL CHECKS PASSED"
