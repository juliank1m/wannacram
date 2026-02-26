import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import anthropic, { CHAT_SYSTEM_PROMPT } from '@/lib/anthropic';
import type { Message } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, messages } = (await request.json()) as {
      documentId: string;
      messages: Message[];
    };

    if (!documentId || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing documentId or messages' },
        { status: 400 }
      );
    }

    // Fetch document
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

    // Stream response from Claude
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: CHAT_SYSTEM_PROMPT(extractedText),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
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

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
