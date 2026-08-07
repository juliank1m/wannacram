-- Data API privileges and RLS policy tuning for every application table.
--
-- Two problems, verified against the live project:
--
-- 1. anon and authenticated hold blanket CRUD on all four tables — the legacy
--    default for projects created before 2026-04-28, including TRUNCATE, which
--    is NOT subject to row level security. PostgREST does not expose TRUNCATE,
--    so this is not remotely reachable today, but the grants do not reflect any
--    intent and RLS is carrying the whole load on its own.
--
-- 2. Supabase stopped exposing public tables to the Data API automatically. The
--    new behaviour is the default for projects created after 2026-05-30 and is
--    applied to existing projects on 2026-10-30. Declaring the grants
--    explicitly makes the outcome the same on either side of that date.
--
-- Privileges are matched to how the app actually queries:
--   anon           — nothing. The browser client only calls auth.* and storage.*.
--   authenticated  — select everywhere; writes only to study_sessions. Creating
--                    a topic, saving a document and unlinking either all run
--                    through the service-role client.
--   service_role   — full CRUD; it is the write path and it bypasses RLS.
--
-- Move a write off the service-role client and its grant must be added here.

revoke all on table public.topics           from anon, authenticated;
revoke all on table public.topic_documents  from anon, authenticated;
revoke all on table public.documents        from anon, authenticated;
revoke all on table public.study_sessions   from anon, authenticated;

grant select on table public.topics          to authenticated;
grant select on table public.topic_documents to authenticated;
grant select on table public.documents       to authenticated;
grant select, insert, update, delete on table public.study_sessions to authenticated;

grant select, insert, update, delete on table public.topics          to service_role;
grant select, insert, update, delete on table public.topic_documents to service_role;
grant select, insert, update, delete on table public.documents       to service_role;
grant select, insert, update, delete on table public.study_sessions  to service_role;

-- Consolidate the policies. Corrections applied to all four tables:
--   * `to authenticated` — every existing policy targets `public`, so it is
--     also evaluated for anon on each query.
--   * `(select auth.uid())` — an uncorrelated subquery is evaluated once per
--     statement; a bare auth.uid() is re-evaluated for every candidate row.
-- Legacy names are dropped explicitly: documents carried four command-specific
-- policies, and creating a new one without removing them would simply add a
-- fifth (policies are permissive and OR together).
drop policy if exists documents_select_own on documents;
drop policy if exists documents_insert_own on documents;
drop policy if exists documents_update_own on documents;
drop policy if exists documents_delete_own on documents;
drop policy if exists "Users can manage their own documents" on documents;
drop policy if exists documents_all_own on documents;
create policy documents_all_own
  on documents for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own study sessions" on study_sessions;
drop policy if exists study_sessions_all_own on study_sessions;
create policy study_sessions_all_own
  on study_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own topics" on topics;
drop policy if exists topics_all_own on topics;
create policy topics_all_own
  on topics for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own topic_documents" on topic_documents;
drop policy if exists topic_documents_all_own on topic_documents;
create policy topic_documents_all_own
  on topic_documents for all
  to authenticated
  using (
    exists (
      select 1 from topics
      where topics.id = topic_documents.topic_id
        and topics.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from topics
      where topics.id = topic_documents.topic_id
        and topics.user_id = (select auth.uid())
    )
  );
