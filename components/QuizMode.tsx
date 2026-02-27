'use client';

import { useState, useEffect } from 'react';
import type { QuizQuestion, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  answered: number;
  quizComplete: boolean;
  selectedAnswer: string | null;
  showExplanation: boolean;
}

function saveQuizState(documentId: string, state: QuizState) {
  fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, mode: 'quiz', data: state }),
  }).catch(() => {});
}

export default function QuizMode({ documentId, model }: { documentId: string; model: AIModel }) {
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
    fetch(`/api/sessions?documentId=${documentId}&mode=quiz`)
      .then((res) => res.json())
      .then((data) => {
        const saved: QuizState | undefined = data.session?.messages;
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
  }, [documentId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, model }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate quiz');
      }
      const data = await res.json();
      setQuestions(data.questions);
      setGenerated(true);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
      setAnswered(0);
      setQuizComplete(false);

      saveQuizState(documentId, {
        questions: data.questions,
        currentIndex: 0,
        score: 0,
        answered: 0,
        quizComplete: false,
        selectedAnswer: null,
        showExplanation: false,
      });
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

    saveQuizState(documentId, {
      questions,
      currentIndex,
      score: newScore,
      answered: newAnswered,
      quizComplete: false,
      selectedAnswer: letter,
      showExplanation: true,
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);

      saveQuizState(documentId, {
        questions,
        currentIndex: newIndex,
        score,
        answered,
        quizComplete: false,
        selectedAnswer: null,
        showExplanation: false,
      });
    } else {
      setQuizComplete(true);

      saveQuizState(documentId, {
        questions,
        currentIndex,
        score,
        answered,
        quizComplete: true,
        selectedAnswer,
        showExplanation,
      });
    }
  };

  const retry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswered(0);
    setQuizComplete(false);

    saveQuizState(documentId, {
      questions,
      currentIndex: 0,
      score: 0,
      answered: 0,
      quizComplete: false,
      selectedAnswer: null,
      showExplanation: false,
    });
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)]">
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
          Generate a quiz from your document to test your knowledge
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Quiz'}
        </button>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)]">
        <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-4xl font-bold mb-1">
          {score}/{questions.length}
        </p>
        <p className="text-gray-500 mb-6">{percentage}% correct</p>
        <div className="flex gap-3">
          <button
            onClick={retry}
            className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Retry
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'New Quiz'}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span>
          Score: {score}/{answered}
        </span>
      </div>

      <MarkdownRenderer content={q.question} className="text-lg font-medium mb-4" />

      <div className="space-y-2">
        {q.options.map((option) => {
          const letter = option.charAt(0);
          const isSelected = selectedAnswer === letter;
          const isCorrect = letter === q.answer;
          let style = 'border-gray-200 dark:border-gray-700 hover:border-blue-500';
          if (selectedAnswer) {
            if (isCorrect) {
              style = 'border-green-500 bg-green-50 dark:bg-green-950';
            } else if (isSelected && !isCorrect) {
              style = 'border-red-500 bg-red-50 dark:bg-red-950';
            } else {
              style = 'border-gray-200 dark:border-gray-700 opacity-50';
            }
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
              className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-colors ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-sm">
          <p className="font-medium mb-1">
            {selectedAnswer === q.answer ? 'Correct!' : `Incorrect. The answer is ${q.answer}.`}
          </p>
          <MarkdownRenderer content={q.explanation} className="text-gray-600 dark:text-gray-400" />
        </div>
      )}

      {selectedAnswer && (
        <button
          onClick={nextQuestion}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
        </button>
      )}
    </div>
  );
}
