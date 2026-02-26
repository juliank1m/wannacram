# ExamPrep AI — Project Description

## What This App Does

A web app where students upload lecture notes, slides, or past exams (PDF/PPTX/DOCX), and an AI helps them study by generating summaries, flashcards, and practice questions based on their own course material.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage
- **LLM:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Document Parsing:** `pdf-parse`, `mammoth` (DOCX), `officegen` (PPTX)
- **Package Manager:** npm

---

## Project Structure

```
/app
  /api
    /upload        → handles file upload + text extraction
    /chat          → streams Claude responses
    /documents     → CRUD for user documents
  /dashboard       → lists uploaded documents
  /study/[docId]   → study interface (chat, flashcards, quiz)
  /upload          → upload page
/components
  FileUploader.tsx
  ChatInterface.tsx
  FlashcardDeck.tsx
  QuizMode.tsx
/lib
  supabase.ts      → supabase client
  anthropic.ts     → claude client + prompt templates
  parsers.ts       → PDF/DOCX/PPTX text extraction
/types
  index.ts
```

---

## Database Schema

```sql
-- Users handled by Supabase Auth

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  file_path text not null,        -- path in Supabase Storage
  extracted_text text not null,   -- raw text for LLM context
  file_type text not null,        -- 'pdf' | 'docx' | 'pptx'
  created_at timestamptz default now()
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  document_id uuid references documents not null,
  mode text not null,             -- 'chat' | 'flashcards' | 'quiz'
  messages jsonb default '[]',    -- chat history
  created_at timestamptz default now()
);

-- Row Level Security: users can only see their own rows
alter table documents enable row level security;
alter table study_sessions enable row level security;
```

---

## Core Features & How They Work

### 1. Document Upload (`/app/api/upload`)
- Accept PDF, DOCX, PPTX (max 20MB)
- Extract text server-side using parsers
- Save file to Supabase Storage, save extracted text to `documents` table
- Return `document_id` to client

### 2. Chat with Document (`/app/api/chat`)
- Load `extracted_text` from DB by `document_id`
- Pass as context to Claude with a system prompt
- Stream response back using Vercel AI SDK or native fetch streaming

### 3. Flashcard Generation
- One-shot Claude call with the extracted text
- Prompt asks for JSON array: `[{ front: string, back: string }]`
- Render as flippable card UI

### 4. Quiz Mode
- One-shot Claude call asking for multiple-choice questions
- Prompt asks for JSON: `[{ question, options: string[], answer: string, explanation: string }]`
- Render interactive quiz with score tracking

---

## Claude Prompt Templates

### System Prompt (Chat mode)
```
You are a study assistant helping a student prepare for an exam.
You have been given the content of their course material below.
Answer questions clearly and concisely. When helpful, reference specific 
parts of the material. If asked, generate practice questions or summaries.

COURSE MATERIAL:
{extracted_text}
```

### Flashcard Generation Prompt
```
Based on the following course material, generate 15 flashcards covering 
the most important concepts a student should know for an exam.

Respond ONLY with a JSON array in this format (no markdown, no extra text):
[{"front": "question or term", "back": "answer or definition"}, ...]

COURSE MATERIAL:
{extracted_text}
```

### Quiz Generation Prompt
```
Based on the following course material, generate 10 multiple choice questions 
for exam practice. Cover a range of difficulty levels.

Respond ONLY with a JSON array in this format (no markdown, no extra text):
[{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "explanation": "..."
}]

COURSE MATERIAL:
{extracted_text}
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Key Implementation Notes

- **Text chunking:** If `extracted_text` exceeds ~150k characters, chunk it and either summarize first or use the most relevant sections (retrieve by keyword match)
- **File size limit:** Enforce 20MB on the client AND server side
- **Streaming:** Use streaming for chat responses so users don't wait for full reply
- **RLS:** Always use the Supabase service role key server-side; never expose it to the client
- **Error handling:** If text extraction fails (e.g. scanned PDF with no text layer), return a clear error message to the user
- **Loading states:** Show extraction progress on upload — it can take a few seconds for large files

---

## MVP Build Order

1. Set up Next.js + Supabase + Tailwind
2. Auth (sign up / login pages)
3. File upload + text extraction pipeline
4. Document dashboard (list uploaded docs)
5. Chat interface with Claude
6. Flashcard generator
7. Quiz mode
8. Polish UI
