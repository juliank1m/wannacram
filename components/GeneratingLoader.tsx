'use client';

import { useState, useEffect } from 'react';

const FLASHCARD_MESSAGES = [
  'READING YOUR NOTES...',
  'FINDING KEY CONCEPTS...',
  'CRAFTING QUESTIONS...',
  'WRITING ANSWERS...',
  'ALMOST THERE...',
];

const QUIZ_MESSAGES = [
  'READING YOUR NOTES...',
  'IDENTIFYING KEY TOPICS...',
  'WRITING QUESTIONS...',
  'CREATING ANSWER CHOICES...',
  'ALMOST THERE...',
];

export default function GeneratingLoader({ mode }: { mode: 'flashcards' | 'quiz' }) {
  const messages = mode === 'flashcards' ? FLASHCARD_MESSAGES : QUIZ_MESSAGES;
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // Simulate progress: fast at first, slows down, caps at 90%
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        const increment = prev < 30 ? 4 : prev < 60 ? 2 : 0.5;
        return Math.min(90, prev + increment);
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="pixel-box p-0 overflow-hidden max-w-sm w-full" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
        <div className="pixel-titlebar text-center">
          {mode === 'flashcards' ? '[ GENERATING CARDS ]' : '[ GENERATING QUIZ ]'}
        </div>
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
          </div>

          <p className="font-pixelify font-semibold text-[14px] text-ink/70 transition-opacity duration-300">
            {messages[msgIndex]}
          </p>

          {/* Progress bar */}
          <div>
            <div className="border-[3px] border-ink h-5 w-full overflow-hidden">
              <div
                className="h-full bg-[var(--px-blue)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-pixelify font-semibold text-[13px] text-ink/50 mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
