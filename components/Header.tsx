'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [userInfo, setUserInfo] = useState<{ email: string; displayName: string | null } | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold">
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
          <Link
            href="/settings"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-foreground"
          >
            Settings
          </Link>
          {userInfo && (
            <Link href="/settings" title={userInfo.displayName ?? userInfo.email}>
              <UserAvatar name={userInfo.displayName} email={userInfo.email} />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-foreground"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
