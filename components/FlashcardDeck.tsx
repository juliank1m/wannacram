'use client';

import { useState, useEffect } from 'react';
import type { Flashcard, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';
import GeneratingLoader from './GeneratingLoader';

export default function FlashcardDeck({ topicId, model }: { topicId: string; model: AIModel }) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?topicId=${topicId}&mode=flashcards`)
      .then((r) => r.json())
      .then((d) => {
        const saved = d.session?.messages?.flashcards;
        if (Array.isArray(saved) && saved.length > 0) {
          setFlashcards(saved);
          setGenerated(true);
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, [topicId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setFlipped(false);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, model }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setFlashcards(data.flashcards);
      setGenerated(true);
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, mode: 'flashcards', data: { flashcards: data.flashcards } }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setFlipped(false); }, [currentIndex]);

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixelify font-semibold text-[15px] text-ink/60 pixel-cursor">Loading</p>
      </div>
    );
  }

  if (loading) {
    return <GeneratingLoader mode="flashcards" />;
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="pixel-box p-0 overflow-hidden max-w-sm w-full">
          <div className="pixel-titlebar text-center">FLASHCARDS</div>
          <div className="p-8 text-center">
            <p className="font-vt323 text-xl text-ink/55 mb-6 leading-relaxed">
              Generate flashcards from your topic to start studying
            </p>
            <button onClick={generate} className="pixel-btn pixel-btn-primary">
              ▶ GENERATE CARDS
            </button>
            {error && <p className="font-pixelify font-semibold text-[14px] text-[var(--px-red)] mt-4 leading-relaxed">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return <p className="font-pixelify font-semibold text-[15px] text-center text-ink/60 mt-12">No cards generated.</p>;
  }

  const card = flashcards[currentIndex];
  const progress = Math.round(((currentIndex + 1) / flashcards.length) * 100);

  return (
    <div className="flex flex-col items-center h-full">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex justify-between font-pixelify font-semibold text-[14px] text-ink/70 mb-2">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="border-[3px] border-ink h-4 w-full overflow-hidden">
          <div
            className="h-full bg-[var(--px-blue)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFlipped(!flipped)}
        className="w-full max-w-lg flex-1 max-h-64 cursor-pointer relative overflow-hidden"
        style={{
          border: '3px solid var(--ink)',
          boxShadow: flipped ? '4px 4px 0 var(--px-green)' : '4px 4px 0 var(--ink)',
          borderColor: flipped ? 'var(--px-green)' : 'var(--ink)',
        }}
      >
        {/* Title bar */}
        <div className="pixel-titlebar text-center"
             style={{ background: flipped ? 'var(--px-green)' : 'var(--ink)', borderBottomColor: flipped ? 'var(--px-green)' : 'var(--ink)' }}>
          {flipped ? '[ ANSWER ]' : '[ QUESTION ]'}
        </div>
        <div className="p-6 flex items-center justify-center min-h-[140px] bg-surface">
          <MarkdownRenderer
            content={flipped ? card.back : card.front}
            className="font-inter text-[15px] text-center w-full"
          />
        </div>
        <div className="absolute bottom-2 right-3 font-pixelify text-[13px] text-ink/50">
          {flipped ? 'Click to flip' : 'Click to reveal'}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="pixel-btn"
        >
          PREV
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1))}
          disabled={currentIndex === flashcards.length - 1}
          className="pixel-btn"
        >
          NEXT
        </button>
        <button onClick={generate} disabled={loading} className="pixel-btn text-ink/60">
          {loading ? '...' : '↺ REDO'}
        </button>
      </div>
    </div>
  );
}
