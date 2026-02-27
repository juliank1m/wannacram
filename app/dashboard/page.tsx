'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import type { Document } from '@/types';

const FILE_TYPE_LABELS: Record<string, string> = { pdf: 'PDF', docx: 'DOC', pptx: 'PPT' };
const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'var(--px-red)',
  docx: 'var(--px-blue)',
  pptx: 'var(--px-yellow)',
};

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setDocuments(data.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-pixel text-[14px] leading-loose">MY DOCUMENTS</h1>
            <p className="font-vt323 text-[18px] text-ink/55 mt-1">
              {loading ? '...' : `${documents.length} file${documents.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <Link href="/upload" className="pixel-btn pixel-btn-primary text-[9px]">
            + UPLOAD
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="pixel-spinner" />
            <p className="font-pixel text-[9px] text-ink/50 pixel-cursor">LOADING</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="pixel-box p-0 max-w-md mx-auto overflow-hidden">
            <div className="pixel-titlebar text-[9px]">INVENTORY EMPTY</div>
            <div className="p-8 text-center">
              <p className="font-vt323 text-xl text-ink/60 mb-6 leading-relaxed">
                No documents yet.<br />
                Upload your first study material to begin.
              </p>
              <Link href="/upload" className="pixel-btn pixel-btn-primary text-[9px]">
                ▶ UPLOAD NOW
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Link key={doc.id} href={`/study/${doc.id}`} className="block group">
                <div className="pixel-box overflow-hidden transition-all duration-75 group-hover:-translate-y-[2px]"
                     style={{ boxShadow: '4px 4px 0px var(--ink)' }}
                     onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0px var(--ink)')}
                     onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0px var(--ink)')}>
                  {/* Color bar by type */}
                  <div className="h-1.5 w-full" style={{ background: FILE_TYPE_COLORS[doc.file_type] ?? 'var(--ink)' }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h2 className="font-pixel text-[9px] leading-relaxed line-clamp-2 flex-1">
                        {doc.title}
                      </h2>
                      <span className="pixel-badge text-[9px] shrink-0"
                            style={{ background: FILE_TYPE_COLORS[doc.file_type], color: 'white', borderColor: 'var(--ink)' }}>
                        {FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-vt323 text-[18px] text-ink/65">
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <span className="font-pixel text-[10px] text-[var(--px-blue)] group-hover:text-ink transition-colors">
                        STUDY ▶
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
