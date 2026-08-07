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

drop policy if exists "Users can manage their own documents" on documents;
create policy "Users can manage their own documents"
  on documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own study sessions" on study_sessions;
create policy "Users can manage their own study sessions"
  on study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
