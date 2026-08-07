import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIModel, Message } from '@/types';
import { getUserFriendlyAiError } from '@/lib/error-messages';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { anthropic, openai };

export const AI_MODELS = ['claude-sonnet', 'gpt-4o-mini', 'gpt-5-mini'] as const;

export function isAIModel(value: unknown): value is AIModel {
  return typeof value === 'string' && (AI_MODELS as readonly string[]).includes(value);
}

const OPENAI_MODEL_IDS = {
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-5-mini': 'gpt-5-mini',
} satisfies Partial<Record<AIModel, string>>;

function getOpenAIModelId(model: AIModel) {
  // hasOwnProperty, not `in` — `in` walks the prototype chain, so a model of
  // "constructor" would resolve to Object and be sent as the model id.
  return Object.prototype.hasOwnProperty.call(OPENAI_MODEL_IDS, model)
    ? OPENAI_MODEL_IDS[model as keyof typeof OPENAI_MODEL_IDS]
    : null;
}

// -- Prompt templates (shared across providers) --

export const CHAT_SYSTEM_PROMPT = (extractedText: string) => `You are a study assistant helping a student prepare for an exam.
You have been given the content of their course material below.
Answer questions clearly and concisely. When helpful, reference specific
parts of the material. If asked, generate practice questions or summaries.

Use markdown formatting to improve clarity: headers (##, ###) to organize long responses,
**bold** for key terms, *italics* for emphasis, bullet or numbered lists for enumerations,
and fenced code blocks for any code or technical syntax — always include the language
identifier (e.g. \`\`\`python, \`\`\`java, \`\`\`sql). For mathematical expressions, use
LaTeX math notation: $...$ for inline math and $$...$$ for display equations. Keep responses focused.

COURSE MATERIAL:
${extractedText}`;

export const FLASHCARD_PROMPT = (extractedText: string) => `Based on the following course material, generate 15 flashcards covering
the most important concepts a student should know for an exam.

Respond ONLY with a valid JSON array — no surrounding text, no markdown code fences.
You may use basic markdown (bold, lists, fenced code blocks with language tags like \`\`\`python) within the "front" and "back" string values to improve clarity.
For mathematical expressions, use LaTeX math notation: $...$ for inline math and $$...$$ for display equations.
Format: [{"front": "question or term", "back": "answer or definition"}, ...]
Each answer should flow naturally from the question. For yes/no questions, lead with the answer then explain.

COURSE MATERIAL:
${extractedText}`;

export const QUIZ_PROMPT = (extractedText: string) => `Based on the following course material, generate 10 multiple choice questions
for exam practice. Cover a range of difficulty levels.

Respond ONLY with a valid JSON array — no surrounding text, no markdown code fences.
You may use basic markdown (bold, lists, fenced code blocks with language tags like \`\`\`python) within string values to improve clarity.
For mathematical expressions, use LaTeX math notation: $...$ for inline math and $$...$$ for display equations.
Format:
[{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "explanation": "..."
}]

COURSE MATERIAL:
${extractedText}`;

// -- Streaming chat --

export function streamChat(
  model: AIModel,
  systemPrompt: string,
  messages: Message[]
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const openaiModel = getOpenAIModelId(model);

  // Set once the provider stream exists, so cancel() can stop it. Without this
  // the provider keeps generating (and billing) after the client disconnects.
  let abortProvider: (() => void) | null = null;

  const sendError = (controller: ReadableStreamDefaultController, err: unknown) => {
    console.error('streamChat error:', err);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ error: getUserFriendlyAiError(err) })}\n\n`)
    );
    controller.close();
  };

  if (openaiModel) {
    return new ReadableStream({
      async start(controller) {
        try {
          const stream = await openai.chat.completions.create({
            model: openaiModel,
            max_completion_tokens: 4096,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ],
          });
          abortProvider = () => stream.controller.abort();

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          sendError(controller, err);
        }
      },
      cancel() {
        abortProvider?.();
      },
    });
  }

  // Default: Claude Sonnet
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });
        abortProvider = () => stream.abort();

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        sendError(controller, err);
      }
    },
    cancel() {
      abortProvider?.();
    },
  });
}

// -- One-shot completion (for flashcards/quiz) --

export async function generateCompletion(
  model: AIModel,
  prompt: string
): Promise<string> {
  const openaiModel = getOpenAIModelId(model);

  if (openaiModel) {
    const response = await openai.chat.completions.create({
      model: openaiModel,
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message?.content ?? '';
  }

  // Default: Claude Sonnet
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
