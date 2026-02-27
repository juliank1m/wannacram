'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase';

interface UserProfile {
  email: string;
  displayName: string | null;
  createdAt: string;
  documentCount: number;
}

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-8 border-b border-gray-200 dark:border-gray-800 last:border-0">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Avatar({ name, email, size = 'md' }: { name: string | null; email: string; size?: 'md' | 'lg' }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase();
  const sz = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setDisplayName(data.user.displayName ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile((p) => p ? { ...p, displayName } : p);
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete account.' });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <div className="text-center py-20 text-gray-500">Failed to load profile.</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Manage your profile and account preferences.
        </p>

        {/* Profile */}
        <Section title="Profile" description="Update your display name shown across the app.">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={profile.displayName} email={profile.email} size="lg" />
            <div>
              <p className="font-medium">{profile.displayName ?? profile.email.split('@')[0]}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {profile.documentCount} document{profile.documentCount !== 1 ? 's' : ''} · Joined{' '}
                {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {profileMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingProfile || !displayName.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Choose a strong password with at least 8 characters.">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {passwordMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone">
          <div className="rounded-lg border border-red-200 dark:border-red-900 p-4">
            <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Delete account</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Permanently deletes your account and all documents, flashcards, and quiz history. This cannot be undone.
            </p>
            <p className="text-sm mb-2">
              Type <span className="font-mono font-medium">delete my account</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="delete my account"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
            />
            {deleteMsg && (
              <p className="text-sm text-red-500 mb-3">{deleteMsg.text}</p>
            )}
            <button
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== 'delete my account'}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </Section>
      </main>
    </>
  );
}
