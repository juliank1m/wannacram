import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="border-b-[3px] border-ink bg-surface" style={{ boxShadow: '0 3px 0px var(--ink)' }}>
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <span className="font-pixel text-[13px] tracking-tight leading-none">WANNACRAM</span>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="pixel-btn pixel-btn-primary text-[9px]">
                ▶ DASHBOARD
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="pixel-btn text-[9px]">
                  SIGN IN
                </Link>
                <Link href="/auth/signup" className="pixel-btn pixel-btn-primary text-[9px]">
                  GET STARTED
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
          {/* Pixel badge */}
          <div className="inline-block pixel-badge text-[8px] bg-[var(--px-yellow)] text-white border-ink mb-8">
            ★ AI-POWERED STUDYING ★
          </div>

          {/* Big pixel title */}
          <h1 className="font-pixel leading-loose mb-6" style={{ fontSize: 'clamp(18px, 4vw, 36px)' }}>
            LEVEL UP YOUR<br />
            <span className="text-[var(--px-blue)]">STUDY GAME</span>
          </h1>

          <p className="font-vt323 text-2xl text-ink/70 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload your lecture notes, slides, or past exams.
            WannaCram generates flashcards, quizzes, and
            an AI tutor trained on your actual course material.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup" className="pixel-btn pixel-btn-primary text-[10px]">
              ▶ START FOR FREE
            </Link>
            <Link href="/auth/login" className="pixel-btn text-[10px]">
              SIGN IN
            </Link>
          </div>

          {/* Pixel decorations */}
          <div className="flex justify-center gap-6 mt-14 opacity-20 font-pixel text-[8px] select-none">
            <span>■ ■ ■</span>
            <span>▲ ▲ ▲</span>
            <span>● ● ●</span>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section className="border-y-[3px] border-ink bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="text-center mb-12">
              <h2 className="font-pixel text-[14px] leading-loose mb-3">3 WAYS TO STUDY</h2>
              <p className="font-vt323 text-xl text-ink/60">All powered by AI. All built from your own material.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: '💬',
                  tag: 'MODE 1',
                  title: 'AI TUTOR',
                  desc: 'Ask anything about your document. Get answers grounded in your course material — not generic search results.',
                  color: 'var(--px-blue)',
                },
                {
                  icon: '🗂',
                  tag: 'MODE 2',
                  title: 'FLASHCARDS',
                  desc: 'Auto-generated from your notes. Key concepts distilled into cards you can flip through anywhere.',
                  color: 'var(--px-yellow)',
                },
                {
                  icon: '✅',
                  tag: 'MODE 3',
                  title: 'PRACTICE QUIZ',
                  desc: 'Multiple-choice questions at varying difficulty. Instant feedback and explanations to lock in knowledge.',
                  color: 'var(--px-green)',
                },
              ].map(({ icon, tag, title, desc, color }) => (
                <div key={title} className="pixel-box p-0 overflow-hidden">
                  <div className="font-pixel text-[8px] px-4 py-2 border-b-[3px] border-ink text-white"
                       style={{ background: color }}>
                    {tag}
                  </div>
                  <div className="p-5">
                    <div className="text-3xl mb-3">{icon}</div>
                    <h3 className="font-pixel text-[10px] mb-3 leading-loose">{title}</h3>
                    <p className="font-vt323 text-[18px] text-ink/65 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="font-pixel text-[14px] leading-loose mb-3">HOW TO PLAY</h2>
            <p className="font-vt323 text-xl text-ink/60">From upload to ready in minutes.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '01', title: 'UPLOAD', desc: 'Drop in a PDF, DOCX, or PPTX — lecture notes, slides, or a past exam. Up to 20MB.' },
              { step: '02', title: 'GENERATE', desc: 'One click to create your AI tutor, flashcard deck, and a personalized quiz.' },
              { step: '03', title: 'STUDY', desc: 'Chat, flip cards, and drill quizzes. Progress is auto-saved as you go.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="font-pixel text-[28px] leading-none text-ink/15 shrink-0 mt-1">{step}</div>
                <div className="pixel-box p-4 flex-1">
                  <h3 className="font-pixel text-[9px] mb-2 leading-loose">{title}</h3>
                  <p className="font-vt323 text-[18px] text-ink/65 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Formats bar ────────────────────────────────────── */}
        <section className="border-y-[3px] border-ink bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-center gap-8 flex-wrap">
            <span className="font-pixel text-[9px] text-ink/50">ACCEPTS</span>
            {['PDF', 'DOCX', 'PPTX'].map((f) => (
              <span key={f} className="pixel-badge font-pixel text-[9px]">{f}</span>
            ))}
            <span className="font-pixel text-[9px] text-ink/50">MAX 20MB</span>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <div className="pixel-box p-10 max-w-xl mx-auto" style={{ boxShadow: '6px 6px 0px var(--ink)' }}>
            <div className="pixel-titlebar text-[10px] -mx-[3px] -mt-[3px] mb-6">
              ★ READY TO PLAY? ★
            </div>
            <p className="font-vt323 text-xl text-ink/70 mb-8 leading-relaxed">
              Free to get started. No credit card required.<br />
              Your next exam isn't going to ace itself.
            </p>
            <Link href="/auth/signup" className="pixel-btn pixel-btn-primary text-[10px]">
              ▶ CREATE FREE ACCOUNT
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t-[3px] border-ink bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
          <span className="font-pixel text-[10px]">WANNACRAM</span>
          <span className="font-vt323 text-[18px] text-ink/50">© {new Date().getFullYear()}</span>
        </div>
      </footer>

    </div>
  );
}
