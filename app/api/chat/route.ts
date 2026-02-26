import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CHAT_SYSTEM_PROMPT, streamChat } from '@/lib/ai';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import type { Message, AIModel } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, messages, model = 'claude-sonnet' } = (await request.json()) as {
      documentId: string;
      messages: Message[];
      model?: AIModel;
    };

    if (!documentId || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing documentId or messages' },
        { status: 400 }
      );
    }

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .select('extracted_text')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    let extractedText = doc.extracted_text;
    if (extractedText.length > 150000) {
      extractedText = extractedText.slice(0, 150000);
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
    return NextResponse.json(
      { error: getUserFriendlyAiError(err) },
      { status: 500 }
    );
  }
}
