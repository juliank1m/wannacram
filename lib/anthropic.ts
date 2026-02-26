import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default anthropic;

export const CHAT_SYSTEM_PROMPT = (extractedText: string) => `You are a study assistant helping a student prepare for an exam.
You have been given the content of their course material below.
Answer questions clearly and concisely. When helpful, reference specific
parts of the material. If asked, generate practice questions or summaries.

COURSE MATERIAL:
${extractedText}`;

export const FLASHCARD_PROMPT = (extractedText: string) => `Based on the following course material, generate 15 flashcards covering
the most important concepts a student should know for an exam.

Respond ONLY with a JSON array in this format (no markdown, no extra text):
[{"front": "question or term", "back": "answer or definition"}, ...]

COURSE MATERIAL:
${extractedText}`;

export const QUIZ_PROMPT = (extractedText: string) => `Based on the following course material, generate 10 multiple choice questions
for exam practice. Cover a range of difficulty levels.

Respond ONLY with a JSON array in this format (no markdown, no extra text):
[{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "explanation": "..."
}]

COURSE MATERIAL:
${extractedText}`;
