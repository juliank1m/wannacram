import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CHAT_SYSTEM_PROMPT, streamChat, isAIModel, DEFAULT_AI_MODEL } from '@/lib/ai';
import { getTopicText } from '@/lib/topics';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import { readJson, rateLimit, AI_RATE_LIMIT } from '@/lib/http';
import type { Message } from '@/types';

// The conversation the client replays back to us on every turn.
const MAX_CONVERSATION_CHARS = 100_000;

function parseMessages(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  let total = 0;
  for (const message of value) {
    if (!message || typeof message !== 'object') return null;
    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    total += content.length;
    if (total > MAX_CONVERSATION_CHARS) return null;
  }

  return value as Message[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!rateLimit(`chat:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await readJson<{ topicId?: unknown; messages?: unknown; model?: unknown }>(request);
    const topicId = typeof body?.topicId === 'string' ? body.topicId : '';
    const messages = parseMessages(body?.messages);
    const model = isAIModel(body?.model) ? body.model : DEFAULT_AI_MODEL;

    if (!topicId || !messages) {
      return NextResponse.json({ error: 'Missing topicId or messages' }, { status: 400 });
    }

    const extractedText = await getTopicText(topicId, user.id);
    if (!extractedText) {
      return NextResponse.json({ error: 'Topic not found or has no documents' }, { status: 404 });
    }

    const readable = streamChat(model, CHAT_SYSTEM_PROMPT(extractedText), messages);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json({ error: getUserFriendlyAiError(err) }, { status: 500 });
  }
}
