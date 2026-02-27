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

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, model }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate flashcards');
      }
      const data = await res.json();
      setFlashcards(data.flashcards);
      setGenerated(true);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFlipped(false);
  }, [currentIndex]);

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)]">
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
          Generate flashcards from your document to start studying
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Flashcards'}
        </button>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (flashcards.length === 0) {
    return <p className="text-center text-gray-500 mt-12">No flashcards generated.</p>;
  }

  const card = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center h-[calc(100vh-14rem)]">
      <div className="text-sm text-gray-500 mb-4">
        Card {currentIndex + 1} of {flashcards.length}
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFlipped(!flipped)}
        className="w-full max-w-lg min-h-64 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center text-center cursor-pointer hover:border-blue-500 transition-colors"
      >
        <div className="w-full">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            {flipped ? 'Answer' : 'Question'}
          </div>
          <MarkdownRenderer content={flipped ? card.back : card.front} className="text-lg" />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">Click card to flip</p>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-30"
        >
          Previous
        </button>
        <button
          onClick={() =>
            setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1))
          }
          disabled={currentIndex === flashcards.length - 1}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-30"
        >
          Next
        </button>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="mt-4 text-sm text-blue-600 hover:underline disabled:opacity-50"
      >
        {loading ? 'Regenerating...' : 'Regenerate'}
      </button>
    </div>
  );
}
