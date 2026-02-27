'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0 cursor-pointer">
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

  // Close dropdown when clicking outside
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
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          WannaCram
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-foreground"
          >
            Upload
          </Link>

          {userInfo && (
            <div ref={dropdownRef} className="relative">
              <button onClick={() => setOpen((o) => !o)}>
                <UserAvatar name={userInfo.displayName} email={userInfo.email} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 py-1">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium truncate">
                      {userInfo.displayName ?? userInfo.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{userInfo.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Settings
                  </Link>
                  <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Logout
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
