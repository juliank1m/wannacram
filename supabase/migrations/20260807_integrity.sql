-- Referential integrity, uniqueness and indexes for the queries the app runs.

-- 1. Deleting an auth user must not fail on a dangling reference. topics had a
--    plain `references auth.users`, so account deletion wiped documents and
--    sessions and then errored on the topics constraint — unrecoverably, since
--    the RLS policies key on auth.uid().
alter table topics drop constraint if exists topics_user_id_fkey;
alter table topics add constraint topics_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table documents drop constraint if exists documents_user_id_fkey;
alter table documents add constraint documents_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table study_sessions drop constraint if exists study_sessions_user_id_fkey;
alter table study_sessions add constraint study_sessions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- Legacy study_sessions rows still carry a document_id; without a cascade they
-- block deleting the document they point at.
alter table study_sessions drop constraint if exists study_sessions_document_id_fkey;
alter table study_sessions add constraint study_sessions_document_id_fkey
  foreign key (document_id) references documents (id) on delete cascade;

-- 2. One session row per (user, topic, mode). Quiz progress is saved
--    fire-and-forget on every answer, so concurrent requests could each miss
--    the existing row and insert a second one. After that the PATCH lookup
--    raised PGRST116 and quiz reset silently stopped working.
delete from study_sessions a
  using study_sessions b
  where a.user_id = b.user_id
    and a.topic_id is not distinct from b.topic_id
    and a.mode = b.mode
    and (a.created_at < b.created_at
         or (a.created_at = b.created_at and a.id < b.id));

create unique index if not exists study_sessions_user_topic_mode_idx
  on study_sessions (user_id, topic_id, mode);

-- 3. Every list query filters on one of these; topic_documents.document_id is
--    the trailing half of the primary key, so a lookup by document alone (used
--    when deciding whether an unlinked document is now orphaned) had no index.
create index if not exists documents_user_id_idx on documents (user_id);
create index if not exists study_sessions_user_id_idx on study_sessions (user_id);
create index if not exists topics_user_id_idx on topics (user_id);
create index if not exists topic_documents_document_id_idx on topic_documents (document_id);
