'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import type { Topic } from '@/types';

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'var(--px-red)',
  docx: 'var(--px-blue)',
  pptx: 'var(--px-yellow)',
};
const FILE_TYPE_LABELS: Record<string, string> = { pdf: 'PDF', docx: 'DOC', pptx: 'PPT' };

export default function DashboardPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setTopics(data.topics ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-pixel text-[14px] leading-loose">MY TOPICS</h1>
            <p className="font-vt323 text-[18px] text-ink/55 mt-1">
              {loading ? '...' : `${topics.length} topic${topics.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/upload" className="pixel-btn pixel-btn-primary">
            + NEW TOPIC
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="pixel-spinner" />
            <p className="font-pixelify font-semibold text-[15px] text-ink/60 pixel-cursor">Loading</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="pixel-box p-0 max-w-md mx-auto overflow-hidden">
            <div className="pixel-titlebar">INVENTORY EMPTY</div>
            <div className="p-8 text-center">
              <p className="font-vt323 text-xl text-ink/60 mb-6 leading-relaxed">
                No topics yet.<br />
                Create your first topic to begin studying.
              </p>
              <Link href="/upload" className="pixel-btn pixel-btn-primary">
                CREATE TOPIC
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => {
              const docs = topic.topic_documents ?? [];
              return (
                <div key={topic.id} className="pixel-box overflow-hidden group"
                     style={{ boxShadow: '4px 4px 0px var(--ink)' }}
                     onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '6px 6px 0px var(--ink)')}
                     onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '4px 4px 0px var(--ink)')}>
                  <div className="h-1.5 w-full bg-[var(--px-blue)]" />
                  <div className="p-4">
                    <h2 className="font-pixelify font-bold text-[14px] leading-snug mb-3 line-clamp-2">
                      {topic.title}
                    </h2>
                    {/* File type badges */}
                    {docs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {docs.map((td) => {
                          const doc = (td as { document: { id: string; file_type: string } }).document;
                          return (
                            <span
                              key={doc.id}
                              className="pixel-badge text-[9px]"
                              style={{ background: FILE_TYPE_COLORS[doc.file_type] ?? 'var(--ink)', color: 'white', borderColor: 'var(--ink)' }}
                            >
                              {FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="font-vt323 text-[17px] text-ink/50 mb-4">
                      {docs.length} file{docs.length !== 1 ? 's' : ''} · {new Date(topic.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/study/topic/${topic.id}`}
                        className="pixel-btn pixel-btn-primary text-[13px] flex-1 text-center"
                      >
                        STUDY ▶
                      </Link>
                      <Link
                        href={`/upload?topicId=${topic.id}`}
                        className="pixel-btn text-[13px]"
                      >
                        + FILES
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
