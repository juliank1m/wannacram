import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FLASHCARD_PROMPT, generateCompletion, isAIModel, DEFAULT_AI_MODEL } from '@/lib/ai';
import { isFlashcard, parseModelJsonArray } from '@/lib/model-output';
import { getTopicText } from '@/lib/topics';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import { readJson, rateLimit, AI_RATE_LIMIT } from '@/lib/http';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!rateLimit(`flashcards:${user.id}`, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await readJson<{ topicId?: unknown; model?: unknown }>(request);
    const topicId = typeof body?.topicId === 'string' ? body.topicId : '';
    const model = isAIModel(body?.model) ? body.model : DEFAULT_AI_MODEL;

    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    const extractedText = await getTopicText(topicId, user.id);
    if (!extractedText) {
      return NextResponse.json({ error: 'Topic not found or has no documents' }, { status: 404 });
    }

    const text = await generateCompletion(model, FLASHCARD_PROMPT(extractedText));
    const flashcards = parseModelJsonArray(text, isFlashcard);

    if (!flashcards) {
      return NextResponse.json({ error: 'Failed to parse flashcard response' }, { status: 500 });
    }

    return NextResponse.json({ flashcards });
  } catch (err) {
    console.error('Flashcards route error:', err);
    return NextResponse.json({ error: getUserFriendlyAiError(err) }, { status: 500 });
  }
}
