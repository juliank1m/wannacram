import { createServerSupabaseClient } from '@/lib/supabase-server';

export const MAX_TOPIC_CONTEXT_CHARS = 150_000;

/**
 * Fetches and concatenates extracted_text from all documents in a topic.
 * Returns null if the topic doesn't exist, doesn't belong to the user, or has
 * no documents. Throws if the lookup itself fails, so callers answer 500 rather
 * than reporting a transient database error as "topic not found".
 * Stops concatenating at MAX_TOPIC_CONTEXT_CHARS.
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

  if (docsError) throw docsError;
  if (!rows || rows.length === 0) return null;

  // Build up to the budget instead of concatenating everything and slicing —
  // a topic with many large documents would otherwise materialise the whole
  // corpus in memory on every chat/quiz/flashcard call.
  const SEPARATOR = '\n\n';
  const parts: string[] = [];
  let used = 0;

  for (const row of rows) {
    const doc = row.document as unknown as { title: string; extracted_text: string } | null;
    if (!doc) continue;

    const separatorCost = parts.length > 0 ? SEPARATOR.length : 0;
    const remaining = MAX_TOPIC_CONTEXT_CHARS - used - separatorCost;
    if (remaining <= 0) break;

    const part = `--- ${doc.title} ---${SEPARATOR}${doc.extracted_text}`;
    const slice = part.length > remaining ? part.slice(0, remaining) : part;

    parts.push(slice);
    used += slice.length + separatorCost;
  }

  if (parts.length === 0) return null;

  return parts.join(SEPARATOR);
}
