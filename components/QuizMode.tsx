'use client';

import { useState, useEffect } from 'react';
import type { QuizQuestion, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';
import GeneratingLoader from './GeneratingLoader';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  answered: number;
  quizComplete: boolean;
  selectedAnswer: string | null;
  showExplanation: boolean;
}

function saveQuizState(topicId: string, state: QuizState) {
  fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId, mode: 'quiz', data: state }),
  }).catch(() => {});
}

export default function QuizMode({ topicId, model }: { topicId: string; model: AIModel }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions?topicId=${topicId}&mode=quiz`)
      .then((r) => r.json())
      .then((d) => {
        const saved: QuizState | undefined = d.session?.messages;
        if (Array.isArray(saved?.questions) && saved.questions.length > 0) {
          setQuestions(saved.questions);
          setCurrentIndex(saved.currentIndex ?? 0);
          setScore(saved.score ?? 0);
          setAnswered(saved.answered ?? 0);
          setQuizComplete(saved.quizComplete ?? false);
          setSelectedAnswer(saved.selectedAnswer ?? null);
          setShowExplanation(saved.showExplanation ?? false);
          setGenerated(true);
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, [topicId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, model }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setQuestions(data.questions);
      setGenerated(true);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
      setAnswered(0);
      setQuizComplete(false);
      saveQuizState(topicId, { questions: data.questions, currentIndex: 0, score: 0, answered: 0, quizComplete: false, selectedAnswer: null, showExplanation: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer) return;
    const letter = option.charAt(0);
    const isCorrect = letter === questions[currentIndex].answer;
    const newScore = isCorrect ? score + 1 : score;
    const newAnswered = answered + 1;
    setSelectedAnswer(letter);
    setShowExplanation(true);
    setScore(newScore);
    setAnswered(newAnswered);
    saveQuizState(topicId, { questions, currentIndex, score: newScore, answered: newAnswered, quizComplete: false, selectedAnswer: letter, showExplanation: true });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);
      saveQuizState(topicId, { questions, currentIndex: newIndex, score, answered, quizComplete: false, selectedAnswer: null, showExplanation: false });
    } else {
      setQuizComplete(true);
      saveQuizState(topicId, { questions, currentIndex, score, answered, quizComplete: true, selectedAnswer, showExplanation });
    }
  };

  const retry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswered(0);
    setQuizComplete(false);
    saveQuizState(topicId, { questions, currentIndex: 0, score: 0, answered: 0, quizComplete: false, selectedAnswer: null, showExplanation: false });
  };

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixelify font-semibold text-[15px] text-ink/60 pixel-cursor">Loading</p>
      </div>
    );
  }

  if (loading) {
    return <GeneratingLoader mode="quiz" />;
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="pixel-box p-0 overflow-hidden max-w-sm w-full">
          <div className="pixel-titlebar text-center">QUIZ MODE</div>
          <div className="p-8 text-center">
            <p className="font-vt323 text-xl text-ink/55 mb-6 leading-relaxed">
              Generate a quiz from your topic to test your knowledge
            </p>
            <button onClick={generate} className="pixel-btn pixel-btn-primary">
              ▶ START QUIZ
            </button>
            {error && <p className="font-pixelify font-semibold text-[14px] text-[var(--px-red)] mt-4 leading-relaxed">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? 'S' : pct >= 70 ? 'A' : pct >= 50 ? 'B' : 'C';
    const gradeColor = pct >= 70 ? 'var(--px-green)' : pct >= 50 ? 'var(--px-yellow)' : 'var(--px-red)';
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="pixel-box p-0 overflow-hidden max-w-sm w-full" style={{ boxShadow: '6px 6px 0 var(--ink)' }}>
          <div className="pixel-titlebar text-[10px] text-center">QUIZ COMPLETE!</div>
          <div className="p-8 text-center">
            <div className="font-pixel text-[48px] leading-none mb-2" style={{ color: gradeColor }}>{grade}</div>
            <p className="font-pixel text-[11px] mb-1">{score}/{questions.length}</p>
            <p className="font-vt323 text-xl text-ink/55 mb-8">{pct}% CORRECT</p>
            {/* Score bar */}
            <div className="border-[3px] border-ink h-5 w-full mb-8 overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: gradeColor }} />
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={retry} className="pixel-btn">RETRY</button>
              <button onClick={generate} disabled={loading} className="pixel-btn pixel-btn-primary">
                {loading ? '...' : '▶ NEW QUIZ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto h-full overflow-y-auto pr-1">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between font-pixelify font-semibold text-[14px] text-ink/70 mb-2">
          <span>Q{currentIndex + 1} / {questions.length}</span>
          <span>Score: {score}/{answered}</span>
        </div>
        <div className="border-[3px] border-ink h-4 w-full overflow-hidden">
          <div className="h-full bg-[var(--px-blue)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="pixel-box p-0 overflow-hidden mb-4">
        <div className="pixel-titlebar">QUESTION {currentIndex + 1}</div>
        <div className="p-4">
          <MarkdownRenderer content={q.question} className="font-inter text-[15px] leading-snug" />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {q.options.map((option) => {
          const letter = option.charAt(0);
          const isSelected = selectedAnswer === letter;
          const isCorrect = letter === q.answer;
          let bg = 'bg-surface hover:bg-[var(--surface-alt)]';
          let shadow = '3px 3px 0 var(--ink)';
          let border = 'border-ink';
          if (selectedAnswer) {
            if (isCorrect) { bg = 'bg-[var(--px-green)]/20'; border = 'border-[var(--px-green)]'; shadow = '3px 3px 0 var(--px-green)'; }
            else if (isSelected) { bg = 'bg-[var(--px-red)]/20'; border = 'border-[var(--px-red)]'; shadow = '3px 3px 0 var(--px-red)'; }
            else { bg = 'bg-surface opacity-40'; }
          }
          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
              className={`w-full text-left border-[3px] px-4 py-3 font-inter text-[15px] transition-all duration-75 ${bg} border-${border}`}
              style={{ borderColor: `var(--${border === 'border-ink' ? 'ink' : border.replace('border-', '')})`, boxShadow: shadow }}
            >
              <MarkdownRenderer content={option} />
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="pixel-box p-0 overflow-hidden mb-4"
             style={{ borderColor: selectedAnswer === q.answer ? 'var(--px-green)' : 'var(--px-red)', boxShadow: `4px 4px 0 ${selectedAnswer === q.answer ? 'var(--px-green)' : 'var(--px-red)'}` }}>
          <div className="font-pixel text-[10px] px-3 py-2 border-b-[3px] border-inherit text-surface"
               style={{ background: selectedAnswer === q.answer ? 'var(--px-green)' : 'var(--px-red)' }}>
            {selectedAnswer === q.answer ? '✓ CORRECT!' : `✗ WRONG — ANSWER: ${q.answer}`}
          </div>
          <div className="p-4">
            <MarkdownRenderer content={q.explanation} className="font-inter text-[14px] text-ink/70" />
          </div>
        </div>
      )}

      {selectedAnswer && (
        <button onClick={nextQuestion} className="pixel-btn pixel-btn-primary">
          {currentIndex < questions.length - 1 ? 'NEXT ▶' : 'SEE RESULTS ▶'}
        </button>
      )}
    </div>
  );
}
