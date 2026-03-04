-- Topics: named study collections owned by a user
create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  created_at timestamptz default now()
);

alter table topics enable row level security;

create policy "Users can manage their own topics"
  on topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Join table: links topics to documents (many-to-many)
create table topic_documents (
  topic_id uuid references topics(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade not null,
  added_at timestamptz default now(),
  primary key (topic_id, document_id)
);

alter table topic_documents enable row level security;

create policy "Users can manage their own topic_documents"
  on topic_documents for all
  using (
    exists (
      select 1 from topics
      where topics.id = topic_documents.topic_id
        and topics.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from topics
      where topics.id = topic_documents.topic_id
        and topics.user_id = auth.uid()
    )
  );

-- Migrate study_sessions: replace document_id with topic_id
alter table study_sessions add column topic_id uuid references topics(id) on delete cascade;
alter table study_sessions alter column document_id drop not null;
