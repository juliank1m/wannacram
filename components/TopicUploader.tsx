'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { notifyTopicDocumentsChanged, resetTopicStudySessions } from '@/lib/topic-context';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE = 20 * 1024 * 1024;

interface UploadedDoc {
  id: string;
  title: string;
  file_type: string;
}

function mapTopicDocuments(topicDocuments: unknown[]): UploadedDoc[] {
  return topicDocuments
    .map((topicDocument) => {
      const document = (topicDocument as { document?: UploadedDoc | null }).document;
      return document ?? null;
    })
    .filter((document): document is UploadedDoc => Boolean(document));
}

export default function TopicUploader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingTopicId = searchParams.get('topicId');

  // Step 1: naming
  const [topicTitle, setTopicTitle] = useState('');
  const [topicId, setTopicId] = useState<string | null>(existingTopicId);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [loadingExistingTopic, setLoadingExistingTopic] = useState(Boolean(existingTopicId));
  const [loadingExistingTopicError, setLoadingExistingTopicError] = useState<string | null>(null);

  // Step 2: uploading files
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!existingTopicId) {
      setTopicId(null);
      setTopicTitle('');
      setUploadedDocs([]);
      setLoadingExistingTopic(false);
      setLoadingExistingTopicError(null);
      return;
    }

    let cancelled = false;
    setLoadingExistingTopic(true);
    setLoadingExistingTopicError(null);

    fetch(`/api/topics/${existingTopicId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Failed to load topic');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setTopicId(data.topic.id);
        setTopicTitle(data.topic.title ?? '');
        setUploadedDocs(mapTopicDocuments(data.topic.topic_documents ?? []));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadingExistingTopicError(
          err instanceof Error ? err.message.toUpperCase() : 'FAILED TO LOAD TOPIC'
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingExistingTopic(false);
      });

    return () => {
      cancelled = true;
    };
  }, [existingTopicId]);

  const handleCreateTopic = async () => {
    if (!topicTitle.trim()) return;
    setCreatingTopic(true);
    setTopicError(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: topicTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create topic');
      }
      const data = await res.json();
      setTopicId(data.topic.id);
    } catch (err) {
      setTopicError(err instanceof Error ? err.message.toUpperCase() : 'FAILED TO CREATE TOPIC');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!topicId) return;
    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('INVALID FILE TYPE. USE PDF, DOCX, OR PPTX.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError('FILE TOO LARGE. MAX SIZE IS 20MB.');
      return;
    }
    setUploading(true);

    const supabase = createClient();
    let filePath: string | null = null;

    try {
      // 1. Get the current user's ID for the storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Upload directly from browser to Supabase Storage (bypasses Vercel size limits)
      filePath = `${user.id}/${Date.now()}-${file.name}`;
      setUploadProgress(`UPLOADING ${file.name.toUpperCase()}...`);
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { contentType: file.type });
      if (storageError) throw new Error(storageError.message || 'Storage upload failed');

      // 3. Tell the API to extract text and save metadata (tiny JSON payload)
      setUploadProgress(`PROCESSING ${file.name.toUpperCase()}...`);
      const res = await fetch(`/api/topics/${topicId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          fileName: file.name,
          fileType: file.type,
        }),
      });
      if (!res.ok) {
        let msg = 'Processing failed';
        try { const data = await res.json(); msg = data.error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setUploadedDocs((prev) => (
        prev.some((doc) => doc.id === data.document.id) ? prev : [...prev, data.document]
      ));
      await resetTopicStudySessions(topicId).catch(() => {});
      notifyTopicDocumentsChanged(topicId);
    } catch (err) {
      // Clean up orphaned storage file if API call failed after upload succeeded
      if (filePath) {
        const supabaseCleanup = createClient();
        supabaseCleanup.storage.from('documents').remove([filePath]).catch(() => {});
      }
      setUploadError(err instanceof Error ? err.message.toUpperCase() : 'UPLOAD FAILED');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [topicId]);

  const handleRemove = async (docId: string) => {
    if (!topicId) return;
    const res = await fetch(`/api/topics/${topicId}/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) {
      let msg = 'Failed to remove file';
      try { const data = await res.json(); msg = data.error || msg; } catch {}
      setUploadError(msg.toUpperCase());
      return;
    }

    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
    await resetTopicStudySessions(topicId).catch(() => {});
    notifyTopicDocumentsChanged(topicId);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) { await handleFile(f); }
  }, [handleFile]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const f of files) { await handleFile(f); }
  }, [handleFile]);

  const FILE_TYPE_COLORS: Record<string, string> = {
    pdf: 'var(--px-red)',
    docx: 'var(--px-blue)',
    pptx: 'var(--px-yellow)',
  };

  if (loadingExistingTopic) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="pixel-box p-0 overflow-hidden" style={{ boxShadow: '4px 4px 0px var(--ink)' }}>
          <div className="pixel-titlebar text-center">[ LOADING TOPIC ]</div>
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
            <p className="font-pixelify font-semibold text-[14px] text-ink/60">
              FETCHING CURRENT FILES...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingExistingTopicError) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="pixel-box p-0 overflow-hidden" style={{ boxShadow: '4px 4px 0px var(--px-red)' }}>
          <div className="pixel-titlebar text-center" style={{ background: 'var(--px-red)' }}>
            [ TOPIC ERROR ]
          </div>
          <div className="p-8 text-center space-y-5">
            <p className="font-pixelify font-semibold text-[14px] text-[var(--px-red)]">
              {loadingExistingTopicError}
            </p>
            <button onClick={() => router.push('/dashboard')} className="pixel-btn">
              BACK TO TOPICS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Name the topic ──
  if (!topicId) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="pixel-box p-0 overflow-hidden" style={{ boxShadow: '4px 4px 0px var(--ink)' }}>
          <div className="pixel-titlebar text-center">[ NEW TOPIC ]</div>
          <div className="p-10 text-center space-y-6">
            <p className="font-vt323 text-xl text-ink/70">
              Give your study topic a name (e.g. &ldquo;Intro to CS&rdquo;)
            </p>
            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
              placeholder="Topic name..."
              className="pixel-input w-full text-center"
              autoFocus
            />
            <button
              onClick={handleCreateTopic}
              disabled={creatingTopic || !topicTitle.trim()}
              className="pixel-btn pixel-btn-primary"
            >
              {creatingTopic ? 'CREATING...' : 'CREATE ▶'}
            </button>
            {topicError && (
              <p className="font-pixelify font-semibold text-[14px] text-[var(--px-red)]">{topicError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Add files ──
  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {topicTitle && (
        <div className="pixel-box p-0 overflow-hidden" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
          <div className="pixel-titlebar">TOPIC</div>
          <div className="px-4 py-4 bg-surface">
            <p className="font-pixelify font-semibold text-[15px] text-ink">{topicTitle}</p>
            <p className="font-vt323 text-lg text-ink/60 mt-1">
              Current files stay here. Add more anytime.
            </p>
          </div>
        </div>
      )}

      <div className="pixel-box p-0 overflow-hidden" style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
        <div className="pixel-titlebar">FILES ADDED ({uploadedDocs.length})</div>
        {uploadedDocs.length === 0 ? (
          <div className="px-4 py-6 text-center bg-surface">
            <p className="font-pixelify font-semibold text-[13px] text-ink/50">
              No files uploaded yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y-[3px] divide-ink">
            {uploadedDocs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="pixel-badge text-[9px] shrink-0"
                    style={{ background: FILE_TYPE_COLORS[doc.file_type] ?? 'var(--ink)', color: 'white', borderColor: 'var(--ink)' }}
                  >
                    {doc.file_type.toUpperCase()}
                  </span>
                  <span className="font-pixelify font-semibold text-[13px] truncate">{doc.title}</span>
                </div>
                <button
                  onClick={() => handleRemove(doc.id)}
                  className="font-pixelify font-semibold text-[13px] text-[var(--px-red)] shrink-0"
                >
                  ✕ REMOVE
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className="pixel-box overflow-hidden"
        style={{
          boxShadow: dragActive ? '6px 6px 0px var(--px-blue)' : '4px 4px 0px var(--ink)',
          borderColor: dragActive ? 'var(--px-blue)' : 'var(--ink)',
        }}
      >
        <div
          className="pixel-titlebar text-center"
          style={{ background: dragActive ? 'var(--px-blue)' : 'var(--ink)' }}
        >
          {dragActive ? '[ DROP IT! ]' : '[ ADD FILES ]'}
        </div>
        <div className="p-10 text-center">
          {uploading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="pixel-spinner" style={{ width: 32, height: 32, borderWidth: 5 }} />
              </div>
              <p className="font-pixelify font-semibold text-[15px] text-ink/70 pixel-cursor">{uploadProgress}</p>
              <div className="border-[3px] border-ink h-6 w-full overflow-hidden">
                <div className="h-full bg-[var(--px-blue)] animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <>
              <p className="font-vt323 text-xl text-ink/75 mb-2">
                Drag and drop files here, or browse
              </p>
              <p className="font-vt323 text-lg text-ink/55 mb-5">
                New uploads are added to the list above.
              </p>
              <label className="pixel-btn pixel-btn-primary cursor-pointer">
                ▶ BROWSE FILES
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.pptx"
                  multiple
                  onChange={handleChange}
                />
              </label>
              <div className="flex justify-center gap-3 mt-6">
                {['PDF', 'DOCX', 'PPTX'].map((f) => (
                  <span key={f} className="pixel-badge">{f}</span>
                ))}
              </div>
              <p className="font-vt323 text-[18px] text-ink/60 mt-3">MAX 20MB PER FILE</p>
            </>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="border-[3px] border-[var(--px-red)] px-4 py-2" style={{ boxShadow: '3px 3px 0 var(--px-red)' }}>
          <p className="font-pixelify font-semibold text-[14px] text-[var(--px-red)]">{uploadError}</p>
        </div>
      )}

      {/* Start studying CTA */}
      {uploadedDocs.length > 0 && (
        <button
          onClick={() => router.push(`/study/topic/${topicId}`)}
          className="pixel-btn pixel-btn-primary w-full"
        >
          START STUDYING ▶
        </button>
      )}
    </div>
  );
}
