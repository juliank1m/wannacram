'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import FlashcardDeck from '@/components/FlashcardDeck';
import QuizMode from '@/components/QuizMode';
import type { AIModel } from '@/types';

type Mode = 'chat' | 'flashcards' | 'quiz';

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'chat', label: 'Chat' },
  { mode: 'flashcards', label: 'Flashcards' },
  { mode: 'quiz', label: 'Quiz' },
];

const MODELS: { value: AIModel; label: string }[] = [
  { value: 'claude-sonnet', label: 'Claude Sonnet' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

export default function StudyPage({
  params,
}: {
  params: { docId: string };
}) {
  const [mode, setMode] = useState<Mode>('chat');
  const [model, setModel] = useState<AIModel>('claude-sonnet');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    fetch('/api/documents')
      .then((res) => res.json())
      .then((data) => {
        const doc = data.documents?.find(
          (d: { id: string }) => d.id === params.docId
        );
        if (doc) setTitle(doc.title);
      })
      .catch(() => {});
  }, [params.docId]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          {title ? (
            <h1 className="text-xl font-bold truncate">{title}</h1>
          ) : (
            <div />
          )}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AIModel)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
          {TABS.map(({ mode: tabMode, label }) => (
            <button
              key={tabMode}
              onClick={() => setMode(tabMode)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === tabMode
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'chat' && <ChatInterface documentId={params.docId} model={model} />}
        {mode === 'flashcards' && <FlashcardDeck documentId={params.docId} model={model} />}
        {mode === 'quiz' && <QuizMode documentId={params.docId} model={model} />}
      </main>
    </>
  );
}
