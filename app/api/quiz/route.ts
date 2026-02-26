import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { QUIZ_PROMPT, generateCompletion } from '@/lib/ai';
import { getUserFriendlyAiError } from '@/lib/error-messages';
import type { AIModel } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, model = 'claude-sonnet' } = (await request.json()) as {
      documentId: string;
      model?: AIModel;
    };

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

    const text = await generateCompletion(model, QUIZ_PROMPT(extractedText));

    try {
      const questions = JSON.parse(text);
      return NextResponse.json({ questions });
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse quiz response' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Quiz route error:', err);
    return NextResponse.json(
      { error: getUserFriendlyAiError(err) },
      { status: 500 }
    );
  }
}
