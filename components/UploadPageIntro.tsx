'use client';

import { useSearchParams } from 'next/navigation';

export default function UploadPageIntro() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId');
  const isEditingTopic = Boolean(topicId);

  return (
    <div className="text-center mb-10">
      <h1 className="font-pixel text-[14px] leading-loose mb-2">
        {isEditingTopic ? 'ADD FILES' : 'CREATE TOPIC'}
      </h1>
      <p className="font-vt323 text-xl text-ink/55">
        {isEditingTopic
          ? 'Review your current docs and upload more study materials'
          : 'Name your topic and upload all related study materials'}
      </p>
    </div>
  );
}
