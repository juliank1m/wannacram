import { Suspense } from 'react';
import Header from '@/components/Header';
import UploadPageIntro from '@/components/UploadPageIntro';
import TopicUploader from '@/components/TopicUploader';

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Suspense>
          <UploadPageIntro />
        </Suspense>
        <Suspense>
          <TopicUploader />
        </Suspense>
      </main>
    </>
  );
}
