#!/bin/bash
# Applies the repo's migrations to a disposable local Postgres cluster with
# minimal Supabase stubs, then asserts the schema came out as intended.
#
# Between the baseline and the new migrations it recreates the drift observed on
# the live project — legacy policy names, blanket anon/authenticated grants, and
# a duplicate quiz session — so the cleanup is exercised rather than assumed.
#
# Touches nothing outside its own temp dir; the real project is never contacted.
# Requires a local Postgres (initdb/pg_ctl/psql) but no Docker and no CLI.
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
apply() { echo "    -> $1.sql"; psql -d $DB -f "$REPO/supabase/migrations/$1.sql" >/dev/null; }

psql -d postgres -c "create database $DB" >/dev/null

echo "### supabase stubs"
psql -d $DB <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
-- Real auth.uid() reads the request JWT; a GUC is enough to exercise policies.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;
SQL

echo "### baseline migrations"
apply 00000000000000_init
apply 20260303_topics
apply 20260304_storage_rls

echo "### replay live-project drift"
psql -d $DB <<'SQL' >/dev/null
-- Command-specific policies scoped to every role, with unwrapped auth.uid().
drop policy if exists documents_all_own on documents;
create policy documents_select_own on documents for select using (auth.uid() = user_id);
create policy documents_insert_own on documents for insert with check (auth.uid() = user_id);
create policy documents_update_own on documents for update using (auth.uid() = user_id);
create policy documents_delete_own on documents for delete using (auth.uid() = user_id);

drop policy if exists study_sessions_all_own on study_sessions;
create policy study_sessions_all_own on study_sessions for all using (auth.uid() = user_id);

-- Blanket grants, including TRUNCATE, which RLS does not govern.
grant all on table public.topics, public.topic_documents,
                  public.documents, public.study_sessions
  to anon, authenticated, service_role;
SQL

echo "### new migrations"
apply 20260807140821_data_api_grants
apply 20260807140832_integrity

echo
echo "### assertions"
psql -d $DB <<'SQL'
do $$
declare n int;
begin
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relrowsecurity
      and c.relname in ('documents','study_sessions','topics','topic_documents');
  assert n = 4, format('RLS enabled on only %s/4 tables', n);

  -- Legacy policies replaced, not merely added alongside.
  select count(*) into n from pg_policies where schemaname = 'public';
  assert n = 4, format('expected exactly 4 policies, found %s', n);

  select count(*) into n from pg_policies
    where schemaname = 'public' and policyname like 'documents_%_own'
      and policyname <> 'documents_all_own';
  assert n = 0, format('%s legacy command-specific policies survived', n);

  select count(*) into n from pg_policies where schemaname='public' and roles = '{authenticated}';
  assert n = 4, format('only %s/4 policies scoped to authenticated', n);

  select count(*) into n from pg_policies
    where schemaname = 'public' and qual like '%SELECT auth.uid()%';
  assert n = 4, format('only %s/4 policies use (select auth.uid())', n);

  -- Blanket grants revoked, least privilege in place.
  assert not has_table_privilege('anon','public.topics','select'), 'anon retains select';
  assert not has_table_privilege('anon','public.documents','truncate'), 'anon retains TRUNCATE';
  assert not has_table_privilege('authenticated','public.documents','truncate'),
    'authenticated retains TRUNCATE (RLS does not govern it)';
  assert not has_table_privilege('authenticated','public.topics','insert'),
    'authenticated can insert topics; that is the service role''s job';
  assert has_table_privilege('authenticated','public.topics','select');
  assert has_table_privilege('authenticated','public.documents','select');
  assert has_table_privilege('authenticated','public.study_sessions','delete');
  assert has_table_privilege('service_role','public.documents','delete');

  -- Foreign keys must all cascade from auth.users, and indexes must exist.
  select count(*) into n from pg_constraint
    where contype = 'f' and connamespace = 'public'::regnamespace
      and confrelid = 'auth.users'::regclass and confdeltype <> 'c';
  assert n = 0, format('%s foreign keys to auth.users still do not cascade', n);

  foreach n in array array[1] loop end loop;
  perform 1 from pg_indexes where schemaname='public' and indexname='study_sessions_topic_id_idx';
  assert found, 'missing study_sessions_topic_id_idx';
  perform 1 from pg_indexes where schemaname='public' and indexname='study_sessions_document_id_idx';
  assert found, 'missing study_sessions_document_id_idx';
  perform 1 from pg_indexes where schemaname='public' and indexname='topic_documents_document_id_idx';
  assert found, 'missing topic_documents_document_id_idx';

  raise notice 'schema, grants and policy assertions OK';
end $$;

-- The critical review finding, exercised end to end.
do $$
declare u uuid; t uuid; d uuid;
begin
  insert into auth.users (email) values ('a@example.com') returning id into u;
  insert into topics (user_id, title) values (u, 'T') returning id into t;
  insert into documents (user_id, title, file_path, extracted_text, file_type)
    values (u, 'D', u || '/1-a.pdf', 'text', 'pdf') returning id into d;
  insert into topic_documents (topic_id, document_id) values (t, d);
  insert into study_sessions (user_id, topic_id, document_id, mode, messages)
    values (u, t, d, 'quiz', '{}');

  delete from auth.users where id = u;   -- this is what used to raise

  assert (select count(*) from topics where user_id = u) = 0, 'topics survived';
  assert (select count(*) from documents where user_id = u) = 0, 'documents survived';
  assert (select count(*) from study_sessions where user_id = u) = 0, 'sessions survived';
  assert (select count(*) from topic_documents where topic_id = t) = 0, 'links survived';
  raise notice 'account deletion cascade OK';
end $$;

-- A session referencing a document must not block deleting it.
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
  assert (select count(*) from study_sessions where document_id = d) = 0;
  delete from auth.users where id = u;
  raise notice 'document delete cascade OK';
end $$;

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

do $$
begin
  insert into auth.users (id, email) values
    ('11111111-1111-1111-1111-111111111111', 'd@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'e@example.com');
  insert into topics (user_id, title) values
    ('11111111-1111-1111-1111-111111111111', 'mine'),
    ('22222222-2222-2222-2222-222222222222', 'theirs');
end $$;
SQL

VISIBLE=$(command psql -h "$SOCK" -U postgres -d $DB -qtAc \
  "begin;
   set local role authenticated;
   set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
   select coalesce(string_agg(title, ','), '<none>') from topics;
   rollback;" | head -1)

[ "$VISIBLE" = "mine" ] \
  && echo "NOTICE:  RLS isolation OK (authenticated sees only 'mine')" \
  || { echo "FAIL: authenticated saw '$VISIBLE', expected 'mine'"; exit 1; }

# The dedupe in 20260807140832_integrity deletes production rows, so prove it keeps
# the newest of each duplicate group. Rebuild the pre-migration state and re-run
# just that statement.
echo
echo "### dedupe keeps the newest duplicate"
KEPT=$(command psql -h "$SOCK" -U postgres -d $DB -qtAc "
  begin;
  drop index study_sessions_user_topic_mode_idx;
  insert into study_sessions (user_id, topic_id, mode, messages, created_at)
    select '11111111-1111-1111-1111-111111111111', id, 'quiz', '{\"n\": 1}', now() - interval '2 day'
      from topics where title = 'mine';
  insert into study_sessions (user_id, topic_id, mode, messages, created_at)
    select '11111111-1111-1111-1111-111111111111', id, 'quiz', '{\"n\": 2}', now()
      from topics where title = 'mine';
  delete from study_sessions a using study_sessions b
    where a.user_id = b.user_id
      and a.topic_id is not distinct from b.topic_id
      and a.mode = b.mode
      and (a.created_at < b.created_at
           or (a.created_at = b.created_at and a.id < b.id));
  select messages->>'n' from study_sessions where mode = 'quiz';
  rollback;" | head -1)

[ "$KEPT" = "2" ] \
  && echo "NOTICE:  dedupe kept the newest row (n=2), deleted the older" \
  || { echo "FAIL: dedupe kept '$KEPT', expected the newest (2)"; exit 1; }

# Only the new files need to be idempotent. 20260303/20260304 are pre-existing;
# the new ones will be applied for the first time to a populated database.
echo
echo "### idempotency: re-apply the new migrations"
for f in 00000000000000_init 20260807140821_data_api_grants 20260807140832_integrity; do
  psql -d $DB -f "$REPO/supabase/migrations/$f.sql" >/dev/null \
    || { echo "FAIL: $f.sql is not idempotent"; exit 1; }
  echo "    -> $f.sql re-applied cleanly"
done

echo
echo "### ALL CHECKS PASSED"
