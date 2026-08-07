import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { readJson } from '@/lib/http';

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const MODES = ['chat', 'flashcards', 'quiz'] as const;

const isMode = (value: unknown): value is (typeof MODES)[number] =>
  typeof value === 'string' && (MODES as readonly string[]).includes(value);

/** topicId comes from the client, so confirm the caller owns it before writing. */
async function ownsTopic(supabase: SupabaseClient, topicId: string, userId: string) {
  const { data } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data);
}

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

    const body = await readJson<{ topicId?: unknown }>(request);
    const topicId = typeof body?.topicId === 'string' ? body.topicId : '';
    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    // Without order+limit this throws PGRST116 as soon as two rows exist for the
    // same (user, topic, quiz), which the old code swallowed.
    const { data: existing } = await supabase
      .from('study_sessions')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('topic_id', topicId)
      .eq('mode', 'quiz')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Only reset progress if the quiz wasn't completed — completed results are kept forever
    if (existing?.messages?.questions && !existing.messages.quizComplete) {
      const { error } = await supabase
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

      if (error) {
        console.error('Sessions PATCH update error:', error);
        return NextResponse.json({ error: 'Failed to reset quiz progress' }, { status: 500 });
      }
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

    const body = await readJson<{ topicId?: unknown; mode?: unknown; data?: unknown }>(request);
    const topicId = typeof body?.topicId === 'string' ? body.topicId : '';
    const { mode, data } = body ?? {};

    if (!topicId || !isMode(mode) || data === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!(await ownsTopic(supabase, topicId, user.id))) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
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
      const { error } = await supabase
        .from('study_sessions')
        .update({ messages: data })
        .eq('id', existing.id);

      if (error) {
        console.error('Sessions POST update error:', error);
        return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
      }

      return NextResponse.json({ session: { id: existing.id } });
    }

    const { data: inserted, error } = await supabase
      .from('study_sessions')
      .insert({ user_id: user.id, topic_id: topicId, mode, messages: data })
      .select('id')
      .single();

    if (error || !inserted) {
      console.error('Sessions POST insert error:', error);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    return NextResponse.json({ session: { id: inserted.id } });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await readJson<{ topicId?: unknown }>(request);
    const topicId = typeof body?.topicId === 'string' ? body.topicId : '';
    if (!topicId) {
      return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('topic_id', topicId);

    if (error) {
      return NextResponse.json({ error: 'Failed to reset study sessions' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sessions DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
