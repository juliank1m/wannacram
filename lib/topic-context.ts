export const TOPIC_DOCUMENTS_CHANGED_EVENT = 'topic-documents-changed';

export async function resetTopicStudySessions(topicId: string) {
  await fetch('/api/sessions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId }),
  });
}

export function notifyTopicDocumentsChanged(topicId: string) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(TOPIC_DOCUMENTS_CHANGED_EVENT, {
      detail: { topicId },
    })
  );
}
