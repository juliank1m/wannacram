import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

// DELETE /api/topics/[topicId]/documents/[docId] — unlink a document from a topic
export async function DELETE(
  _request: Request,
  { params }: { params: { topicId: string; docId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify topic ownership
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id')
      .eq('id', params.topicId)
      .eq('user_id', user.id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from('topic_documents')
      .delete()
      .eq('topic_id', params.topicId)
      .eq('document_id', params.docId);

    if (error) return NextResponse.json({ error: 'Failed to remove document' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
