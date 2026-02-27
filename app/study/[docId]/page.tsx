'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import FlashcardDeck from '@/components/FlashcardDeck';
import QuizMode from '@/components/QuizMode';
import type { AIModel } from '@/types';

type Mode = 'chat' | 'flashcards' | 'quiz';

const TABS: { mode: Mode; label: string; icon: string }[] = [
  { mode: 'chat',       label: 'CHAT',       icon: '💬' },
  { mode: 'flashcards', label: 'CARDS',      icon: '🗂' },
  { mode: 'quiz',       label: 'QUIZ',       icon: '✅' },
];

const MODELS: { value: AIModel; label: string }[] = [
  { value: 'claude-sonnet', label: 'CLAUDE' },
  { value: 'gpt-4o-mini',   label: 'GPT-4O' },
];

export default function StudyPage({ params }: { params: { docId: string } }) {
  const [mode, setMode] = useState<Mode>('chat');
  const [model, setModel] = useState<AIModel>(() => {
    try { return (localStorage.getItem(`model-pref-${params.docId}`) as AIModel) ?? 'claude-sonnet'; }
    catch { return 'claude-sonnet'; }
  });
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d) => {
        const doc = d.documents?.find((x: { id: string }) => x.id === params.docId);
        if (doc) setTitle(doc.title);
      })
      .catch(() => {});
  }, [params.docId]);

  // Flush transient state on page exit
  useEffect(() => {
    const docId = params.docId;
    return () => {
      try { sessionStorage.removeItem(`chat-draft-${docId}`); } catch {}
      fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [params.docId]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">

        {/* Document title + model selector */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <div className="min-w-0">
            {title && (
              <h1 className="font-pixel text-[10px] leading-loose truncate text-ink/80">{title}</h1>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="font-pixel text-[8px] text-ink/40">MODEL:</span>
            <div className="flex border-[3px] border-ink overflow-hidden" style={{ boxShadow: '3px 3px 0 var(--ink)' }}>
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setModel(m.value);
                    try { localStorage.setItem(`model-pref-${params.docId}`, m.value); } catch {}
                  }}
                  className={`font-pixel text-[8px] px-3 py-2 transition-colors ${
                    model === m.value
                      ? 'bg-ink text-surface'
                      : 'bg-surface text-ink/60 hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-[3px] border-ink mb-6 overflow-hidden" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
          {TABS.map(({ mode: tabMode, label, icon }) => (
            <button
              key={tabMode}
              onClick={() => setMode(tabMode)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 font-pixel text-[9px] transition-colors border-r-[3px] border-ink last:border-r-0 ${
                mode === tabMode
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-ink/60 hover:bg-[var(--surface-alt)]'
              }`}
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {mode === 'chat'       && <ChatInterface  documentId={params.docId} model={model} />}
        {mode === 'flashcards' && <FlashcardDeck  documentId={params.docId} model={model} />}
        {mode === 'quiz'       && <QuizMode       documentId={params.docId} model={model} />}
      </main>
    </>
  );
}
