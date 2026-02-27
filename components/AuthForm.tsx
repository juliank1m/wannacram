'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setError('CHECK YOUR EMAIL FOR A CONFIRMATION LINK.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : 'AN ERROR OCCURRED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Title card */}
        <div className="pixel-box overflow-hidden mb-0">
          <div className="pixel-titlebar text-[10px] text-center">
            WANNACRAM
          </div>
          <div className="p-8">
            <h1 className="font-pixel text-[11px] leading-loose mb-1 text-center">
              {mode === 'login' ? 'SIGN IN' : 'NEW PLAYER'}
            </h1>
            <p className="font-vt323 text-[18px] text-ink/55 text-center mb-7">
              {mode === 'login' ? 'Enter your credentials to continue' : 'Create your WannaCram account'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="pixel-label">EMAIL ADDRESS</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pixel-input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="pixel-label">PASSWORD</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pixel-input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="border-[3px] border-[var(--px-yellow)] bg-[var(--px-yellow)]/10 px-3 py-2">
                  <p className="font-pixel text-[8px] text-[var(--px-yellow)] leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="pixel-btn pixel-btn-primary w-full text-[10px] justify-center"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="pixel-spinner" style={{ width: 14, height: 14, borderWidth: 3 }} />
                    LOADING...
                  </span>
                ) : mode === 'login' ? '▶ SIGN IN' : '▶ CREATE ACCOUNT'}
              </button>
            </form>

            <hr className="pixel-divider mt-6 mb-5" />

            <p className="font-vt323 text-[18px] text-center text-ink/55">
              {mode === 'login' ? (
                <>No account?{' '}
                  <Link href="/auth/signup" className="text-[var(--px-blue)] hover:underline">Sign up</Link>
                </>
              ) : (
                <>Have an account?{' '}
                  <Link href="/auth/login" className="text-[var(--px-blue)] hover:underline">Sign in</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
