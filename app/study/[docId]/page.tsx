'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import FlashcardDeck from '@/components/FlashcardDeck';
import QuizMode from '@/components/QuizMode';

type Mode = 'chat' | 'flashcards' | 'quiz';

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'chat', label: 'Chat' },
  { mode: 'flashcards', label: 'Flashcards' },
  { mode: 'quiz', label: 'Quiz' },
];

export default function StudyPage({
  params,
}: {
  params: { docId: string };
}) {
  const [mode, setMode] = useState<Mode>('chat');
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
        {title && (
          <h1 className="text-xl font-bold mb-4 truncate">{title}</h1>
        )}

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

        {mode === 'chat' && <ChatInterface documentId={params.docId} />}
        {mode === 'flashcards' && <FlashcardDeck documentId={params.docId} />}
        {mode === 'quiz' && <QuizMode documentId={params.docId} />}
      </main>
    </>
  );
}
