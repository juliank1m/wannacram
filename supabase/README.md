# Database migrations

## Verify locally

```bash
npm run verify:db
```

Applies every migration to a throwaway Postgres cluster with stubbed `auth` and
`storage` schemas, replays the drift observed on the live project, and asserts
the result. Needs a local Postgres (`initdb`/`pg_ctl`/`psql`); no Docker, no CLI,
and it never contacts the real project.

## Hosted project state

All five migrations are recorded as applied on `kgkmtbtoygbxndqhbrov`, so
`db push` has nothing pending. The two `20260807*` files were applied on
2026-08-07; the three earlier versions were backfilled into
`supabase_migrations.schema_migrations`, because the schema had been built by
hand before this directory existed and the history table did not exist at all.

`00000000000000_init.sql` reconstructs the pre-existing `documents` and
`study_sessions` tables so a fresh `supabase db reset` works. It never ran
against the hosted project — it is a record of what was already there.

The CLI is a devDependency, so use `npx supabase` (Homebrew's formula is gated
behind an Xcode version check on this machine). It needs an access token
(`npx supabase login`, or `SUPABASE_ACCESS_TOKEN`) and, for anything touching
the database, the Postgres password from Dashboard → Project Settings →
Database. Note that `supabase link` currently fails on this project with a
`LegacyLinkApiKeysNetworkError` — a CLI-side schema check rejects the
`inserted_at` timestamp on one of the API keys.

## What the applied migrations changed

`20260807140821_data_api_grants.sql`
- Revokes the blanket `anon`/`authenticated` CRUD grants (which include
  `TRUNCATE`, not governed by RLS) and re-grants only what the app uses.
- Replaces the four command-specific `documents_*_own` policies with one, scopes
  every policy to `authenticated`, and wraps `auth.uid()` in a subquery.

`20260807140832_integrity.sql`
- Makes the foreign keys to `auth.users` cascade, so account deletion stops
  failing partway through.
- **Deleted data:** the dedupe keeps the newest row of each duplicate
  `(user_id, topic_id, mode)` group before adding the unique index. The live
  project had one such group, so this removed one stale `study_sessions` row
  (9 → 8) before the unique index went on.
- Adds the missing indexes; before this the only indexes were primary keys.

## Verified state after applying

```
grants        anon: none on any table
              authenticated: SELECT on topics/topic_documents/documents,
                             SELECT+INSERT+UPDATE+DELETE on study_sessions
              service_role: full CRUD
policies      4 total, all scoped {authenticated}, all using (select auth.uid())
foreign keys  all 6 ON DELETE CASCADE
indexes       7 non-primary-key indexes, none before
data          topics=5 documents=33 sessions=8 users=5 duplicate_groups=0
advisors      security: leaked password protection disabled (pre-existing)
              performance: 6x unused_index (INFO — the indexes are new)
```
