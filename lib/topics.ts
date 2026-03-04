import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Fetches and concatenates extracted_text from all documents in a topic.
 * Returns null if the topic doesn't exist or doesn't belong to the user.
 * Truncates combined text to 150,000 characters.
 */
export async function getTopicText(topicId: string, userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  // Verify topic belongs to user
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .eq('user_id', userId)
    .single();

  if (topicError || !topic) return null;

  // Fetch all linked documents with their text
  const { data: rows, error: docsError } = await supabase
    .from('topic_documents')
    .select('document:documents(title, extracted_text)')
    .eq('topic_id', topicId);

  if (docsError || !rows || rows.length === 0) return null;

  const combined = rows
    .map((row) => {
      const doc = row.document as unknown as { title: string; extracted_text: string } | null;
      if (!doc) return '';
      return `--- ${doc.title} ---\n\n${doc.extracted_text}`;
    })
    .filter(Boolean)
    .join('\n\n');

  return combined.length > 150000 ? combined.slice(0, 150000) : combined;
}
