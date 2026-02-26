'use client';

import { useState } from 'react';
import type { QuizQuestion, AIModel } from '@/types';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer) return;
    const letter = option.charAt(0);
    setSelectedAnswer(letter);
    setShowExplanation(true);
    setAnswered((a) => a + 1);
    if (letter === questions[currentIndex].answer) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
    }
  };

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
            onClick={() => {
              setCurrentIndex(0);
              setSelectedAnswer(null);
              setShowExplanation(false);
              setScore(0);
              setAnswered(0);
              setQuizComplete(false);
            }}
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

      <h2 className="text-lg font-medium mb-4">{q.question}</h2>

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
          <p className="text-gray-600 dark:text-gray-400">{q.explanation}</p>
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
