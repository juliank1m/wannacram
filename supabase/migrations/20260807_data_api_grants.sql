-- Data API exposure and RLS policy tuning for the topics tables.
--
-- Supabase no longer exposes public tables to the Data API automatically:
-- the new behaviour is the default for projects created after 2026-05-30 and
-- is applied to existing projects on 2026-10-30. topics and topic_documents
-- were created by 20260303_topics.sql with no grants, so on that date every
-- PostgREST query the app makes as `authenticated` would start returning a
-- permission error.
--
-- Least privilege, matched to how the app actually queries:
--   anon           — nothing. The browser client only calls auth.* and storage.*.
--   authenticated  — select only. Creating a topic, linking a document and
--                    deleting either all go through the service-role client.
-- Move a write off the service-role client and you must add its grant here.
grant select on table public.topics to authenticated;
grant select on table public.topic_documents to authenticated;

grant select, insert, update, delete on table public.topics to service_role;
grant select, insert, update, delete on table public.topic_documents to service_role;

-- Recreate the 20260303 policies with two corrections:
--   * `to authenticated` — the policies applied to every role, including anon.
--   * `(select auth.uid())` — an uncorrelated subquery is evaluated once per
--     statement; a bare auth.uid() is re-evaluated for every candidate row.
drop policy if exists "Users can manage their own topics" on topics;
create policy "Users can manage their own topics"
  on topics for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own topic_documents" on topic_documents;
create policy "Users can manage their own topic_documents"
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
