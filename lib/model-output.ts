import type { Flashcard, QuizQuestion } from '@/types';

/**
 * Parses a JSON array out of a model response and keeps only well-formed items.
 * Returns null when nothing usable came back, so routes never hand the client a
 * shape its components will crash on — `{"questions": [...]}` parses as valid
 * JSON but is not the array the UI indexes into.
 */
export function parseModelJsonArray<T>(
  text: string,
  isValid: (item: unknown) => item is T
): T[] | null {
  // The prompts ask for a bare array, but models still wrap it in a code fence.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const items = parsed.filter(isValid);
  return items.length > 0 ? items : null;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function isFlashcard(item: unknown): item is Flashcard {
  if (!item || typeof item !== 'object') return false;
  const { front, back } = item as Record<string, unknown>;
  return isNonEmptyString(front) && isNonEmptyString(back);
}

export function isQuizQuestion(item: unknown): item is QuizQuestion {
  if (!item || typeof item !== 'object') return false;
  const { question, options, answer, explanation } = item as Record<string, unknown>;
  return (
    isNonEmptyString(question) &&
    Array.isArray(options) &&
    options.length > 0 &&
    options.every(isNonEmptyString) &&
    isNonEmptyString(answer) &&
    typeof explanation === 'string'
  );
}
