import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-lg">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">WannaCram</h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Upload your lecture notes, slides, or past exams and let AI help you
            study with summaries, flashcards, and practice questions.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl mb-1">💬</div>
            <div className="font-medium">Chat</div>
            <div className="text-xs text-gray-400 mt-1">Ask questions about your material</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl mb-1">🗂</div>
            <div className="font-medium">Flashcards</div>
            <div className="text-xs text-gray-400 mt-1">Auto-generated study cards</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-medium">Quiz</div>
            <div className="text-xs text-gray-400 mt-1">Test your knowledge</div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md border border-gray-300 dark:border-gray-700 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
