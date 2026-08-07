import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Where the confirmation email should point. Only trusted, server-side sources
 * — request headers like x-forwarded-host are attacker-controlled, and this URL
 * ends up in an email that carries a login code.
 *
 * Deployments other than Vercel must set NEXT_PUBLIC_SITE_URL.
 */
function redirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('NEXT_PUBLIC_SITE_URL is not set — confirmation links will point at localhost.');
  }

  return 'http://localhost:3000';
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // The callback exchanges the code for a session, so the user lands signed in.
  const origin = redirectOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/dashboard')}` },
  });

  if (error) {
    const status = typeof error.status === 'number' ? error.status : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
