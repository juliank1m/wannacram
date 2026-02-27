'use client';

import { useState, useEffect } from 'react';
import type { Flashcard, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';

export default function FlashcardDeck({ documentId, model }: { documentId: string; model: AIModel }) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?documentId=${documentId}&mode=flashcards`)
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
  }, [documentId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, model }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setFlashcards(data.flashcards);
      setGenerated(true);
      setCurrentIndex(0);
      setFlipped(false);
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, mode: 'flashcards', data: { flashcards: data.flashcards } }),
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-18rem)] gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixel text-[8px] text-ink/40 pixel-cursor">LOADING</p>
      </div>
    );
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-18rem)]">
        <div className="pixel-box p-0 overflow-hidden max-w-sm w-full">
          <div className="pixel-titlebar text-[9px] text-center">FLASHCARDS</div>
          <div className="p-8 text-center">
            <p className="font-vt323 text-xl text-ink/55 mb-6 leading-relaxed">
              Generate flashcards from your document to start studying
            </p>
            <button onClick={generate} disabled={loading} className="pixel-btn pixel-btn-primary text-[9px]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="pixel-spinner" style={{ width: 12, height: 12, borderWidth: 3 }} />
                  GENERATING...
                </span>
              ) : '▶ GENERATE CARDS'}
            </button>
            {error && <p className="font-pixel text-[8px] text-[var(--px-red)] mt-4 leading-relaxed">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return <p className="font-pixel text-[9px] text-center text-ink/50 mt-12">NO CARDS GENERATED.</p>;
  }

  const card = flashcards[currentIndex];
  const progress = Math.round(((currentIndex + 1) / flashcards.length) * 100);

  return (
    <div className="flex flex-col items-center h-[calc(100vh-18rem)]">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex justify-between font-pixel text-[8px] text-ink/50 mb-2">
          <span>CARD {currentIndex + 1} OF {flashcards.length}</span>
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
        <div className="font-pixel text-[8px] px-3 py-2 border-b-[3px] border-ink text-surface"
             style={{ background: flipped ? 'var(--px-green)' : 'var(--ink)' }}>
          {flipped ? '[ ANSWER ]' : '[ QUESTION ]'}
        </div>
        <div className="p-6 flex items-center justify-center min-h-[140px] bg-surface">
          <MarkdownRenderer
            content={flipped ? card.back : card.front}
            className="font-vt323 text-xl text-center w-full"
          />
        </div>
        <div className="absolute bottom-2 right-3 font-pixel text-[7px] text-ink/30">
          {flipped ? 'CLICK TO FLIP ↺' : 'CLICK TO REVEAL →'}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="pixel-btn text-[9px]"
        >
          ◀ PREV
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1))}
          disabled={currentIndex === flashcards.length - 1}
          className="pixel-btn text-[9px]"
        >
          NEXT ▶
        </button>
        <button onClick={generate} disabled={loading} className="pixel-btn text-[9px] text-ink/50">
          {loading ? '...' : '↺ REDO'}
        </button>
      </div>
    </div>
  );
}
