-- Baseline schema: documents and study_sessions.
--
-- These tables predate the migrations directory, so nothing here created them
-- and `supabase db reset` aborted on 20260303_topics.sql, which references
-- documents and alters study_sessions.
--
-- On the existing project this file is a reconstruction of what is already
-- there — mark it applied with `supabase migration repair` rather than running
-- it (see supabase/README.md). It is idempotent either way. Policy tuning and
-- Data API grants live in 20260807_data_api_grants.sql so they apply to the
-- existing project too.

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

-- Baseline policies so a freshly reset database is never left open between
-- this migration and 20260807_data_api_grants.sql, which replaces them.
drop policy if exists documents_all_own on documents;
create policy documents_all_own
  on documents for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists study_sessions_all_own on study_sessions;
create policy study_sessions_all_own
  on study_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
