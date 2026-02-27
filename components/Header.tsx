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

export default function Header() {
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
    router.push('/auth/login');
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
                className="font-pixel text-[11px] text-ink/70 hover:text-ink transition-colors tracking-wide">
            DOCS
          </Link>
          <Link href="/upload"
                className="font-pixel text-[11px] text-ink/70 hover:text-ink transition-colors tracking-wide">
            UPLOAD
          </Link>

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
                  <div className="px-3 py-2 border-b-[2px] border-ink/30">
                    <p className="font-pixel text-[11px] truncate leading-relaxed">
                      {userInfo.displayName ?? userInfo.email.split('@')[0]}
                    </p>
                    <p className="font-vt323 text-[17px] text-ink/70 truncate">{userInfo.email}</p>
                  </div>
                  {/* Menu items */}
                  <div className="py-1">
                    <Link href="/settings" onClick={() => setOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 font-pixel text-[11px] hover:bg-[var(--surface-alt)] transition-colors">
                      PROFILE
                    </Link>
                    <Link href="/settings" onClick={() => setOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 font-pixel text-[11px] hover:bg-[var(--surface-alt)] transition-colors">
                      SETTINGS
                    </Link>
                  </div>
                  <div className="border-t-[2px] border-ink/30 py-1">
                    <button onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 font-pixel text-[11px] text-[var(--px-red)] hover:bg-[var(--surface-alt)] transition-colors">
                      LOGOUT
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
