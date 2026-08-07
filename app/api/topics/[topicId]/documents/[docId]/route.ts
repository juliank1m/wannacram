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

    // Confirm the document is the caller's before touching anything.
    const { data: document } = await serviceClient
      .from('documents')
      .select('id, file_path')
      .eq('id', params.docId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('topic_documents')
      .delete()
      .eq('topic_id', params.topicId)
      .eq('document_id', params.docId);

    if (error) return NextResponse.json({ error: 'Failed to remove document' }, { status: 500 });

    // Unlinking alone would strand the row (holding the whole extracted_text)
    // and its storage object, with no UI left that can reach either. Delete
    // them once no other topic still uses the document.
    const { count } = await serviceClient
      .from('topic_documents')
      .select('document_id', { count: 'exact', head: true })
      .eq('document_id', params.docId);

    if (!count) {
      if (document.file_path) {
        await serviceClient.storage.from('documents').remove([document.file_path]);
      }
      const { error: deleteError } = await serviceClient
        .from('documents')
        .delete()
        .eq('id', params.docId);

      // The unlink the caller asked for already succeeded, so don't fail the
      // request — but a legacy study_sessions.document_id reference can block
      // the row delete and that should be visible in the logs.
      if (deleteError) {
        console.error('Failed to delete orphaned document:', params.docId, deleteError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
