import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const mode = searchParams.get('mode');

    if (!documentId || !mode) {
      return NextResponse.json({ error: 'Missing documentId or mode' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('study_sessions')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('document_id', documentId)
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

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { documentId, mode, data } = (await request.json()) as {
      documentId: string;
      mode: string;
      data: unknown;
    };

    if (!documentId || !mode || data === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for an existing session for this (user, document, mode)
    const { data: existing } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_id', documentId)
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
      .insert({ user_id: user.id, document_id: documentId, mode, messages: data })
      .select('id')
      .single();

    return NextResponse.json({ session: { id: inserted?.id } });
  } catch (err) {
    console.error('Sessions POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
