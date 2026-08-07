'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="pixel-box p-0 overflow-hidden max-w-sm w-full"
           style={{ boxShadow: '6px 6px 0 var(--px-red)', borderColor: 'var(--px-red)' }}>
        <div className="pixel-titlebar text-center"
             style={{ background: 'var(--px-red)', borderBottomColor: 'var(--px-red)' }}>
          GAME OVER
        </div>
        <div className="p-8 text-center">
          <p className="font-vt323 text-xl text-ink/70 mb-6 leading-relaxed">
            Something broke while rendering this page.
          </p>
          <button onClick={reset} className="pixel-btn pixel-btn-primary">
            ▶ TRY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}
