'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import FlashcardDeck from '@/components/FlashcardDeck';
import QuizMode from '@/components/QuizMode';
import type { AIModel } from '@/types';

type Mode = 'chat' | 'flashcards' | 'quiz';

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'chat',       label: 'CHAT'  },
  { mode: 'flashcards', label: 'CARDS' },
  { mode: 'quiz',       label: 'QUIZ'  },
];

const MODELS: { value: AIModel; label: string }[] = [
  { value: 'claude-sonnet', label: 'CLAUDE' },
  { value: 'gpt-4o-mini',   label: 'GPT-4O' },
];

export default function TopicStudyPage({ params }: { params: { topicId: string } }) {
  const [mode, setMode] = useState<Mode>('chat');
  const [model, setModel] = useState<AIModel>('claude-sonnet');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`model-pref-topic-${params.topicId}`) as AIModel;
      if (saved) setModel(saved);
    } catch {}
  }, [params.topicId]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetch(`/api/topics/${params.topicId}`)
      .then((r) => r.json())
      .then((d) => { if (d.topic?.title) setTitle(d.topic.title); })
      .catch(() => {});
  }, [params.topicId]);

  useEffect(() => {
    const topicId = params.topicId;
    return () => {
      try { sessionStorage.removeItem(`chat-draft-${topicId}`); } catch {}
      fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [params.topicId]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <Header />
      <main className="flex-1 min-h-0 flex flex-col mx-auto w-full max-w-5xl px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5 gap-4 shrink-0">
          <div className="min-w-0">
            {title && (
              <h1 className="font-pixelify font-bold text-[16px] truncate text-ink/85">{title}</h1>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="font-pixelify font-semibold text-[14px] text-ink/60">Model:</span>
            <div className="flex border-[3px] border-ink overflow-hidden" style={{ boxShadow: '3px 3px 0 var(--ink)' }}>
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setModel(m.value);
                    try { localStorage.setItem(`model-pref-topic-${params.topicId}`, m.value); } catch {}
                  }}
                  className={`font-pixelify font-semibold text-[14px] px-3 py-2 transition-colors ${
                    model === m.value
                      ? 'bg-ink text-surface'
                      : 'bg-surface text-ink/70 hover:bg-[var(--surface-alt)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex border-[3px] border-ink mb-6 overflow-hidden shrink-0" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
          {TABS.map(({ mode: tabMode, label }) => (
            <button
              key={tabMode}
              onClick={() => setMode(tabMode)}
              className={`flex-1 flex items-center justify-center py-3 font-pixelify font-bold text-[15px] transition-colors border-r-[3px] border-ink last:border-r-0 ${
                mode === tabMode
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-ink/70 hover:bg-[var(--surface-alt)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mode === 'chat'       && <ChatInterface  topicId={params.topicId} model={model} />}
          {mode === 'flashcards' && <FlashcardDeck  topicId={params.topicId} model={model} />}
          {mode === 'quiz'       && <QuizMode       topicId={params.topicId} model={model} />}
        </div>
      </main>
    </div>
  );
}
