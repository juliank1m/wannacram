import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { readJson } from '@/lib/http';

const MAX_TITLE_LENGTH = 200;

// GET /api/topics — list the user's topics with document count
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: topics, error } = await supabase
      .from('topics')
      .select(`
        id, title, created_at,
        topic_documents(
          document:documents(id, title, file_type, created_at)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });

    return NextResponse.json({ topics });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/topics — create a new topic
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await readJson<{ title?: unknown }>(request);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data: topic, error } = await serviceClient
      .from('topics')
      .insert({ user_id: user.id, title })
      .select('id, title, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });

    return NextResponse.json({ topic });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
