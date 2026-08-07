-- Base schema: documents and study_sessions.
--
-- These tables predate the migrations directory, so nothing here created them
-- and `supabase db reset` aborted on 20260303_topics.sql, which references
-- documents and alters study_sessions. Everything below is idempotent so it is
-- also safe to apply to a database where the tables already exist.

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  file_path text not null,        -- path in Supabase Storage
  extracted_text text not null,   -- raw text used as LLM context
  file_type text not null,        -- 'pdf' | 'docx' | 'pptx'
  created_at timestamptz default now()
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  document_id uuid references documents (id) on delete cascade,
  mode text not null,             -- 'chat' | 'flashcards' | 'quiz'
  messages jsonb default '[]',
  created_at timestamptz default now()
);

alter table documents enable row level security;
alter table study_sessions enable row level security;

-- `to authenticated` so the policy is not evaluated for anon at all, and
-- `(select auth.uid())` so the function is evaluated once per statement
-- instead of once per row.
drop policy if exists "Users can manage their own documents" on documents;
create policy "Users can manage their own documents"
  on documents for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own study sessions" on study_sessions;
create policy "Users can manage their own study sessions"
  on study_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Data API grants. Tables created via SQL are no longer exposed automatically
-- (default for new projects since 2026-05-30, applied to existing projects on
-- 2026-10-30), so without these the app's PostgREST queries start failing.
--
-- Least privilege, matched to how the app actually queries:
--   anon           — nothing. The browser client only calls auth.* and storage.*.
--   authenticated  — reads everywhere; writes only to study_sessions. Every
--                    other write deliberately goes through the service role.
-- Move a write off the service-role client and you must add its grant here.
grant select on table public.documents to authenticated;
grant select, insert, update, delete on table public.study_sessions to authenticated;

grant select, insert, update, delete on table public.documents to service_role;
grant select, insert, update, delete on table public.study_sessions to service_role;
