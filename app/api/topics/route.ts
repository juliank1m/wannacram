import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

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

    const { title } = (await request.json()) as { title: string };
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: topic, error } = await serviceClient
      .from('topics')
      .insert({ user_id: user.id, title: title.trim() })
      .select('id, title, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });

    return NextResponse.json({ topic });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
