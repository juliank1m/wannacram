import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import anthropic, { FLASHCARD_PROMPT } from '@/lib/anthropic';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = (await request.json()) as { documentId: string };

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId' },
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: FLASHCARD_PROMPT(extractedText) },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const flashcards = JSON.parse(text);
      return NextResponse.json({ flashcards });
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse flashcard response' },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
