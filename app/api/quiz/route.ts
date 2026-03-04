import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { QUIZ_PROMPT, generateCompletion } from '@/lib/ai';
import { getTopicText } from '@/lib/topics';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import type { AIModel } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topicId, model = 'claude-sonnet' } = (await request.json()) as {
      topicId: string;
      model?: AIModel;
    };

    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    const extractedText = await getTopicText(topicId, user.id);
    if (!extractedText) {
      return NextResponse.json({ error: 'Topic not found or has no documents' }, { status: 404 });
    }

    const text = await generateCompletion(model, QUIZ_PROMPT(extractedText));

    try {
      const questions = JSON.parse(text);
      return NextResponse.json({ questions });
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz response' }, { status: 500 });
    }
  } catch (err) {
    console.error('Quiz route error:', err);
    return NextResponse.json({ error: getUserFriendlyAiError(err) }, { status: 500 });
  }
}
