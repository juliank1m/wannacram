import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    const mode = searchParams.get('mode');

    if (!topicId || !mode) {
      return NextResponse.json({ error: 'Missing topicId or mode' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('study_sessions')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('mode', mode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ session: session ?? null });
  } catch (err) {
    console.error('Sessions GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH: reset quiz progress for a topic (keep questions, reset position/score)
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topicId } = (await request.json()) as { topicId: string };
    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('study_sessions')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('mode', 'quiz')
      .maybeSingle();

    // Only reset progress if the quiz wasn't completed — completed results are kept forever
    if (existing?.messages?.questions && !existing.messages.quizComplete) {
      await supabase
        .from('study_sessions')
        .update({
          messages: {
            questions: existing.messages.questions,
            currentIndex: 0,
            score: 0,
            answered: 0,
            quizComplete: false,
            selectedAnswer: null,
            showExplanation: false,
          },
        })
        .eq('id', existing.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sessions PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topicId, mode, data } = (await request.json()) as {
      topicId: string;
      mode: string;
      data: unknown;
    };

    if (!topicId || !mode || data === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('mode', mode)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('study_sessions')
        .update({ messages: data })
        .eq('id', existing.id);
      return NextResponse.json({ session: { id: existing.id } });
    }

    const { data: inserted } = await supabase
      .from('study_sessions')
      .insert({ user_id: user.id, topic_id: topicId, mode, messages: data })
      .select('id')
      .single();

    return NextResponse.json({ session: { id: inserted?.id } });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
