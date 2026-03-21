import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIModel, Message } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { anthropic, openai };

const OPENAI_MODEL_IDS = {
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-5-mini': 'gpt-5-mini',
} satisfies Partial<Record<AIModel, string>>;

function getOpenAIModelId(model: AIModel) {
  return model in OPENAI_MODEL_IDS
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
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`
            )
          );
          controller.close();
        }
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
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`
          )
        );
        controller.close();
      }
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

export const MODEL_LABELS: Record<AIModel, string> = {
  'claude-sonnet': 'Claude Sonnet',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-5-mini': 'GPT-5 Mini',
};
