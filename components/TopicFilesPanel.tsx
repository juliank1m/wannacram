'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE = 20 * 1024 * 1024;

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'var(--px-red)',
  docx: 'var(--px-blue)',
  pptx: 'var(--px-yellow)',
};

interface DocEntry {
  id: string;
  title: string;
  file_type: string;
}

export default function TopicFilesPanel({
  topicId,
  isOpen,
  onClose,
}: {
  topicId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocs = useCallback(() => {
    setLoading(true);
    fetch(`/api/topics/${topicId}`)
      .then((r) => r.json())
      .then((d) => {
        const entries: DocEntry[] = (d.topic?.topic_documents ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (td: any) => td.document
        ).filter(Boolean);
        setDocs(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId]);

  useEffect(() => {
    if (isOpen) fetchDocs();
  }, [isOpen, fetchDocs]);

  const handleDelete = async (docId: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    await fetch(`/api/topics/${topicId}/documents/${docId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('INVALID FILE TYPE');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('FILE TOO LARGE (MAX 20MB)');
      return;
    }
    setUploading(true);

    const supabase = createClient();
    let filePath: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      filePath = `${user.id}/${Date.now()}-${file.name}`;
      setUploadProgress(`UPLOADING ${file.name.toUpperCase()}...`);
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { contentType: file.type });
      if (storageError) throw new Error(storageError.message || 'Storage upload failed');

      setUploadProgress(`PROCESSING ${file.name.toUpperCase()}...`);
      const res = await fetch(`/api/topics/${topicId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, fileName: file.name, fileType: file.type }),
      });
      if (!res.ok) {
        let msg = 'Processing failed';
        try { const data = await res.json(); msg = data.error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setDocs((prev) => [...prev, data.document]);
    } catch (err) {
      if (filePath) {
        createClient().storage.from('documents').remove([filePath]).catch(() => {});
      }
      setError(err instanceof Error ? err.message.toUpperCase() : 'UPLOAD FAILED');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [topicId]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/30 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-background border-l-[3px] border-ink z-50 flex flex-col transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="pixel-titlebar flex items-center justify-between px-4">
          <span>[ TOPIC FILES ]</span>
          <button onClick={onClose} className="text-surface font-pixel text-[10px] hover:opacity-70">
            ✕
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center pt-12 gap-3">
              <div className="pixel-spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <p className="font-pixelify font-semibold text-[14px] text-ink/60">Loading files</p>
            </div>
          ) : docs.length === 0 ? (
            <p className="font-pixelify font-semibold text-[14px] text-ink/50 text-center pt-12">
              No files yet. Add some below.
            </p>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="border-[3px] border-ink px-3 py-2 flex items-center justify-between gap-2 bg-surface"
                style={{ boxShadow: '2px 2px 0 var(--ink)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="pixel-badge text-[9px] shrink-0"
                    style={{
                      background: FILE_TYPE_COLORS[doc.file_type] ?? 'var(--ink)',
                      color: 'white',
                      borderColor: 'var(--ink)',
                    }}
                  >
                    {doc.file_type.toUpperCase()}
                  </span>
                  <span className="font-pixelify font-semibold text-[13px] truncate">
                    {doc.title}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="font-pixelify font-semibold text-[12px] text-[var(--px-red)] shrink-0 hover:opacity-70"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Upload area */}
        <div className="border-t-[3px] border-ink p-4">
          {error && (
            <p className="font-pixelify font-semibold text-[13px] text-[var(--px-red)] mb-3">
              {error}
            </p>
          )}

          {uploading ? (
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="pixel-spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
              </div>
              <p className="font-pixelify font-semibold text-[13px] text-ink/70">
                {uploadProgress}
              </p>
              <div className="border-[3px] border-ink h-4 w-full overflow-hidden">
                <div className="h-full bg-[var(--px-blue)] animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className="border-[3px] border-dashed px-4 py-5 text-center transition-colors"
              style={{
                borderColor: dragActive ? 'var(--px-blue)' : 'var(--ink)',
                background: dragActive ? 'var(--surface-alt)' : 'transparent',
              }}
            >
              <p className="font-pixelify font-semibold text-[13px] text-ink/60 mb-3">
                Drop files or browse
              </p>
              <label className="pixel-btn text-[11px] cursor-pointer">
                + ADD FILES
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.pptx"
                  multiple
                  onChange={handleChange}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
