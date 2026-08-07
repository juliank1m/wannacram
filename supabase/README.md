# Database migrations

## Verify locally

```bash
npm run verify:db
```

Applies every migration to a throwaway Postgres cluster with stubbed `auth` and
`storage` schemas, replays the drift observed on the live project, and asserts
the result. Needs a local Postgres (`initdb`/`pg_ctl`/`psql`); no Docker, no CLI,
and it never contacts the real project.

## Applying to the hosted project

The project's migration history is **empty** — the schema was built by hand
before this directory existed. `supabase db push` on its own therefore tries to
run `20260303_topics.sql`, which does `create table topics`, and fails because
the table is already there.

Mark the migrations that are already reflected in the database as applied first:

```bash
supabase link --project-ref kgkmtbtoygbxndqhbrov

supabase migration repair --status applied 00000000000000
supabase migration repair --status applied 20260303
supabase migration repair --status applied 20260304

supabase migration list          # confirm only the 20260807 files are pending
supabase db push
```

`00000000000000_init.sql` reconstructs the pre-existing `documents` and
`study_sessions` tables so a fresh `supabase db reset` works. It is idempotent,
so applying it instead of repairing it is harmless — repairing is just more
honest about what already happened.

## What the pending migrations change

`20260807_data_api_grants.sql`
- Revokes the blanket `anon`/`authenticated` CRUD grants (which include
  `TRUNCATE`, not governed by RLS) and re-grants only what the app uses.
- Replaces the four command-specific `documents_*_own` policies with one, scopes
  every policy to `authenticated`, and wraps `auth.uid()` in a subquery.

`20260807_integrity.sql`
- Makes the foreign keys to `auth.users` cascade, so account deletion stops
  failing partway through.
- **Deletes data:** the dedupe keeps the newest row of each duplicate
  `(user_id, topic_id, mode)` group before adding the unique index. As of
  2026-08-07 the live project has one such group, so this removes exactly one
  stale `study_sessions` row.
- Adds the missing indexes; before this the only indexes were primary keys.
