'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold">
          ExamPrep AI
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
