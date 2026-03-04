import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CHAT_SYSTEM_PROMPT, streamChat } from '@/lib/ai';
import { getTopicText } from '@/lib/topics';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import type { Message, AIModel } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topicId, messages, model = 'claude-sonnet' } = (await request.json()) as {
      topicId: string;
      messages: Message[];
      model?: AIModel;
    };

    if (!topicId || !messages?.length) {
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
