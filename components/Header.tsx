'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function PixelAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase();
  return (
    <div className="h-9 w-9 bg-[var(--px-blue)] text-white flex items-center justify-center font-pixel text-[11px] border-[3px] border-ink cursor-pointer select-none"
         style={{ boxShadow: '3px 3px 0px var(--ink)' }}>
      {initials}
    </div>
  );
}

export default function Header({ showAuthLinks = false }: { showAuthLinks?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [userInfo, setUserInfo] = useState<{ email: string; displayName: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserInfo({
          email: user.email ?? '',
          displayName: user.user_metadata?.display_name ?? null,
        });
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b-[3px] border-ink bg-[var(--surface)]"
            style={{ boxShadow: '0 3px 0px var(--ink)' }}>
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="font-pixel text-[13px] tracking-tight text-ink hover:text-[var(--px-blue)] transition-colors leading-none">
          WANNACRAM
        </Link>

        <nav className="flex items-center gap-5">
          <Link href="/dashboard"
                className="font-pixelify font-semibold text-[15px] text-ink/70 hover:text-ink transition-colors">
            Docs
          </Link>
          <Link href="/upload"
                className="font-pixelify font-semibold text-[15px] text-ink/70 hover:text-ink transition-colors">
            Upload
          </Link>

          {showAuthLinks && !userInfo && (
            <>
              <Link href="/auth/login" className="pixel-btn">
                Sign in
              </Link>
              <Link href="/auth/signup" className="pixel-btn pixel-btn-primary">
                Get started
              </Link>
            </>
          )}

          {userInfo && (
            <div ref={dropdownRef} className="relative">
              <button onClick={() => setOpen((o) => !o)} aria-label="Account menu">
                <PixelAvatar name={userInfo.displayName} email={userInfo.email} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 z-50 pixel-box bg-surface">
                  {/* Title bar */}
                  <div className="pixel-titlebar">
                    PLAYER INFO
                  </div>
                  {/* User info */}
                  <div className="px-3 py-2 border-b-[2px] border-ink/20">
                    <p className="font-pixelify font-semibold text-[15px] truncate">
                      {userInfo.displayName ?? userInfo.email.split('@')[0]}
                    </p>
                  </div>
                  {/* Menu items */}
                  <div className="py-1">
                    <Link href="/settings" onClick={() => setOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 font-pixelify font-semibold text-[15px] hover:bg-[var(--surface-alt)] transition-colors">
                      Settings
                    </Link>
                  </div>
                  <div className="border-t-[2px] border-ink/20 py-1">
                    <button onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 font-pixelify font-semibold text-[15px] text-[var(--px-red)] hover:bg-[var(--surface-alt)] transition-colors">
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
