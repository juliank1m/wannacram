'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import type { Document } from '@/types';

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  pptx: 'PPTX',
};

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Documents</h1>
          <Link
            href="/upload"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload New
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No documents yet. Upload your first study material to get started.
            </p>
            <Link
              href="/upload"
              className="text-blue-600 hover:underline text-sm"
            >
              Upload a document
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/study/${doc.id}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-medium text-sm truncate pr-2">
                    {doc.title}
                  </h2>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded shrink-0">
                    {FILE_TYPE_LABELS[doc.file_type] || doc.file_type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
