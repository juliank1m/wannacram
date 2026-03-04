import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/topics/[topicId] — get topic details + documents list
export async function GET(
  _request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: topic, error } = await supabase
      .from('topics')
      .select(`
        id, title, created_at,
        topic_documents(
          added_at,
          document:documents(id, title, file_type, created_at)
        )
      `)
      .eq('id', params.topicId)
      .eq('user_id', user.id)
      .single();

    if (error || !topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    return NextResponse.json({ topic });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
