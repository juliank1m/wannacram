// Checks for the pure logic guarding trust boundaries and model output.
// Run: npm test   (node's built-in runner, TypeScript stripped at load)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isOwnedStoragePath, safeRedirectPath, rateLimit } from './http.ts';
import { parseModelJsonArray, isFlashcard, isQuizQuestion } from './model-output.ts';

const USER = '11111111-1111-1111-1111-111111111111';
const VICTIM = '22222222-2222-2222-2222-222222222222';

test('isOwnedStoragePath accepts only <own id>/<file>', () => {
  assert.equal(isOwnedStoragePath(`${USER}/1700000000-notes.pdf`, USER), true);

  // The traversal that a startsWith check let through.
  assert.equal(isOwnedStoragePath(`${USER}/../${VICTIM}/notes.pdf`, USER), false);
  assert.equal(isOwnedStoragePath(`${VICTIM}/notes.pdf`, USER), false);
  assert.equal(isOwnedStoragePath(`${USER}/sub/notes.pdf`, USER), false);
  assert.equal(isOwnedStoragePath(`${USER}/`, USER), false);
  assert.equal(isOwnedStoragePath(`${USER}extra/notes.pdf`, USER), false);
  assert.equal(isOwnedStoragePath(`/${USER}/notes.pdf`, USER), false);
  assert.equal(isOwnedStoragePath(null, USER), false);
  assert.equal(isOwnedStoragePath({}, USER), false);
});

test('safeRedirectPath keeps redirects same-origin', () => {
  assert.equal(safeRedirectPath('/dashboard'), '/dashboard');
  assert.equal(safeRedirectPath('/study/topic/abc?x=1'), '/study/topic/abc?x=1');

  assert.equal(safeRedirectPath('@evil.com'), '/dashboard');
  assert.equal(safeRedirectPath('//evil.com'), '/dashboard');
  assert.equal(safeRedirectPath('https://evil.com'), '/dashboard');
  assert.equal(safeRedirectPath('/\\evil.com'), '/dashboard');
  assert.equal(safeRedirectPath(null), '/dashboard');
});

test('rateLimit allows up to the limit then blocks', () => {
  const key = `test-${process.pid}`;
  for (let i = 0; i < 3; i++) {
    assert.equal(rateLimit(key, 3, 60_000), true, `call ${i + 1} should pass`);
  }
  assert.equal(rateLimit(key, 3, 60_000), false);

  // A different caller is unaffected.
  assert.equal(rateLimit(`${key}-other`, 3, 60_000), true);
});

test('parseModelJsonArray rejects anything the UI would crash on', () => {
  const cards = '[{"front":"Q","back":"A"}]';
  assert.deepEqual(parseModelJsonArray(cards, isFlashcard), [{ front: 'Q', back: 'A' }]);

  // Valid JSON, wrong shape — this is what white-screened the page.
  assert.equal(parseModelJsonArray('{"flashcards":[{"front":"Q","back":"A"}]}', isFlashcard), null);
  assert.equal(parseModelJsonArray('not json', isFlashcard), null);
  assert.equal(parseModelJsonArray('[]', isFlashcard), null);
  assert.equal(parseModelJsonArray('[{"front":"Q"}]', isFlashcard), null);

  // Models wrap the array in a code fence despite the prompt saying not to.
  assert.deepEqual(
    parseModelJsonArray('```json\n[{"front":"Q","back":"A"}]\n```', isFlashcard),
    [{ front: 'Q', back: 'A' }]
  );

  // Malformed items are dropped, good ones kept.
  const mixed = '[{"front":"Q","back":"A"},{"front":"","back":"A"},{"nope":1}]';
  assert.equal(parseModelJsonArray(mixed, isFlashcard).length, 1);
});

test('isQuizQuestion requires every field the quiz UI reads', () => {
  const ok = { question: 'Q', options: ['A. x', 'B. y'], answer: 'A', explanation: 'because' };
  assert.equal(isQuizQuestion(ok), true);
  assert.equal(isQuizQuestion({ ...ok, explanation: undefined }), false);
  assert.equal(isQuizQuestion({ ...ok, options: [] }), false);
  assert.equal(isQuizQuestion({ ...ok, options: 'A. x' }), false);
  assert.equal(isQuizQuestion({ ...ok, options: [1, 2] }), false);
  assert.equal(isQuizQuestion(null), false);
});
