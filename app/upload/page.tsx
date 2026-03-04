import { Suspense } from 'react';
import Header from '@/components/Header';
import TopicUploader from '@/components/TopicUploader';

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-pixel text-[14px] leading-loose mb-2">CREATE TOPIC</h1>
          <p className="font-vt323 text-xl text-ink/55">
            Name your topic and upload all related study materials
          </p>
        </div>
        <Suspense>
          <TopicUploader />
        </Suspense>
      </main>
    </>
  );
}
