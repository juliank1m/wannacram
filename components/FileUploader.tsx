'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const MAX_SIZE = 20 * 1024 * 1024;

export default function FileUploader() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('INVALID FILE TYPE. USE PDF, DOCX, OR PPTX.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('FILE TOO LARGE. MAX SIZE IS 20MB.');
      return;
    }
    setUploading(true);
    setProgress('EXTRACTING TEXT...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      setProgress('DONE! REDIRECTING...');
      router.push(`/study/${data.documentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'UPLOAD FAILED');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }, [handleFile]);

  return (
    <div className="w-full max-w-lg mx-auto">
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
        <div className="pixel-titlebar text-center"
             style={{ background: dragActive ? 'var(--px-blue)' : 'var(--ink)' }}>
          {dragActive ? '[ DROP IT! ]' : '[ FILE UPLOAD ]'}
        </div>

        <div className="p-12 text-center">
          {uploading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="pixel-spinner" style={{ width: 32, height: 32, borderWidth: 5 }} />
              </div>
              <p className="font-pixel text-[10px] text-ink/70 pixel-cursor">{progress}</p>
              {/* Pixel progress bar */}
              <div className="border-[3px] border-ink h-6 w-full mt-4 overflow-hidden">
                <div className="h-full bg-[var(--px-blue)] animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <>
              {/* Pixel file icon */}
              <div className="w-12 h-14 mx-auto mb-5 border-[3px] border-ink bg-surface flex items-center justify-center"
                   style={{ boxShadow: '3px 3px 0 var(--ink)' }} aria-hidden>
                <span className="font-pixel text-[9px] text-ink/60">FILE</span>
              </div>
              <p className="font-vt323 text-xl text-ink/75 mb-5">
                Drag and drop your file here
              </p>
              <label className="pixel-btn pixel-btn-primary cursor-pointer">
                ▶ BROWSE FILES
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.pptx"
                  onChange={handleChange}
                />
              </label>
              <div className="flex justify-center gap-3 mt-6">
                {['PDF', 'DOCX', 'PPTX'].map((f) => (
                  <span key={f} className="pixel-badge">{f}</span>
                ))}
              </div>
              <p className="font-vt323 text-[18px] text-ink/60 mt-3">MAX 20MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 border-[3px] border-[var(--px-red)] px-4 py-2" style={{ boxShadow: '3px 3px 0 var(--px-red)' }}>
          <p className="font-pixel text-[11px] text-[var(--px-red)] leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
