import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <span className="text-lg font-bold">WannaCram</span>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-24 pb-20 text-center">
          <div className="inline-block rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 mb-6">
            AI-powered studying
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
            Turn your notes into
            <br />
            <span className="text-blue-600">exam-ready knowledge</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
            Upload your lecture notes, slides, or past exams. WannaCram generates
            flashcards, practice quizzes, and gives you an AI tutor — all trained on
            your actual course material.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get started free
            </Link>
            <Link
              href="/auth/login"
              className="rounded-md border border-gray-300 dark:border-gray-700 px-6 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Everything you need to study effectively</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                Three study modes, all powered by AI, all built around your own material.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">AI Chat Tutor</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ask anything about your document. Get clear, concise answers grounded
                  in your course material — not generic web results.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Smart Flashcards</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Auto-generated from your notes. The most important concepts, distilled
                  into bite-sized cards you can flip through anywhere.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Practice Quizzes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Multiple-choice questions at varying difficulty levels with instant
                  feedback and explanations to reinforce understanding.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Three steps to exam confidence</h2>
            <p className="text-gray-500 dark:text-gray-400">From upload to ready in minutes.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Upload your material',
                desc: 'Drop in a PDF, DOCX, or PPTX — lecture notes, slides, or a past exam. Up to 20MB.',
              },
              {
                step: '02',
                title: 'Generate study tools',
                desc: 'With one click, get an AI tutor, a deck of flashcards, and a personalized quiz.',
              },
              {
                step: '03',
                title: 'Study and ace it',
                desc: 'Chat, flip cards, and drill quizzes. Your progress is saved as you go.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="text-3xl font-bold text-gray-200 dark:text-gray-800 shrink-0 leading-none mt-1">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Supported formats */}
        <section className="border-t border-gray-200 dark:border-gray-800">
          <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Supports</p>
            <div className="flex gap-3">
              {['PDF', 'DOCX', 'PPTX'].map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-1 text-sm font-mono font-medium"
                >
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Up to 20MB per file</p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <div className="mx-auto max-w-5xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to ace your next exam?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Free to get started. No credit card required.
            </p>
            <Link
              href="/auth/signup"
              className="rounded-md bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create a free account
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between text-sm text-gray-400">
          <span className="font-medium text-foreground">WannaCram</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>

    </div>
  );
}
