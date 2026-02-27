'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase';

interface UserProfile { email: string; displayName: string | null; createdAt: string; documentCount: number; }

function PixelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pixel-box p-0 overflow-hidden mb-6">
      <div className="pixel-titlebar">{title}</div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Msg({ type, text }: { type: 'success' | 'error' | 'info'; text: string }) {
  const color = type === 'success' ? 'var(--px-green)' : type === 'error' ? 'var(--px-red)' : 'var(--px-yellow)';
  return (
    <div className="border-[3px] px-3 py-2 mt-3" style={{ borderColor: color, background: `${color}18` }}>
      <p className="font-pixel text-[11px] leading-relaxed" style={{ color }}>{text.toUpperCase()}</p>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/user').then((r) => r.json()).then((d) => {
      if (d.user) { setProfile(d.user); setDisplayName(d.user.displayName ?? ''); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setProfile((p) => p ? { ...p, displayName } : p);
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed.' });
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg({ type: 'error', text: 'Min 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword(''); setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed.' });
    } finally { setSavingPassword(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch('/api/user', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed.' });
      setDeleting(false);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixelify font-semibold text-[15px] text-ink/60 pixel-cursor">Loading</p>
      </div>
    </>
  );

  if (!profile) return (
    <>
      <Header />
      <div className="text-center py-20 font-pixelify font-semibold text-[16px] text-ink/60">Failed to load profile</div>
    </>
  );

  const initials = profile.displayName
    ? profile.displayName.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : profile.email[0].toUpperCase();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-pixel text-[14px] leading-loose mb-1">SETTINGS</h1>
        <p className="font-vt323 text-xl text-ink/75 mb-7">Manage your profile and account.</p>

        {/* Profile */}
        <PixelSection title="▶ PLAYER PROFILE">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 bg-[var(--px-blue)] text-white flex items-center justify-center font-pixel text-[16px] border-[3px] border-ink shrink-0"
                 style={{ boxShadow: '4px 4px 0 var(--ink)' }}>
              {initials}
            </div>
            <div>
              <p className="font-pixel text-[10px] leading-loose">{profile.displayName ?? profile.email.split('@')[0]}</p>
              <p className="font-vt323 text-[18px] text-ink/70">{profile.email}</p>
              <p className="font-vt323 text-[16px] text-ink/60 mt-1">
                {profile.documentCount} doc{profile.documentCount !== 1 ? 's' : ''} · joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="pixel-label">DISPLAY NAME</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="pixel-input" />
            </div>
            <div>
              <label className="pixel-label">EMAIL</label>
              <input type="email" value={profile.email} disabled className="pixel-input" />
              <p className="font-vt323 text-[16px] text-ink/60 mt-1">Email cannot be changed.</p>
            </div>
            {profileMsg && <Msg type={profileMsg.type} text={profileMsg.text} />}
            <button type="submit" disabled={savingProfile || !displayName.trim()} className="pixel-btn pixel-btn-primary">
              {savingProfile ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </form>
        </PixelSection>

        {/* Password */}
        <PixelSection title="▶ CHANGE PASSWORD">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="pixel-label">NEW PASSWORD</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="pixel-input" />
            </div>
            <div>
              <label className="pixel-label">CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm" className="pixel-input" />
            </div>
            {passwordMsg && <Msg type={passwordMsg.type} text={passwordMsg.text} />}
            <button type="submit" disabled={savingPassword || !newPassword || !confirmPassword} className="pixel-btn pixel-btn-primary">
              {savingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        </PixelSection>

        {/* Danger zone */}
        <div className="border-[3px] border-[var(--px-red)] overflow-hidden" style={{ boxShadow: '4px 4px 0 var(--px-red)' }}>
          <div className="pixel-titlebar" style={{ background: 'var(--px-red)', borderBottomColor: 'var(--px-red)' }}>
            DANGER ZONE
          </div>
          <div className="p-6 bg-surface">
            <p className="font-pixelify font-bold text-[15px] text-[var(--px-red)] mb-2 leading-loose">Delete Account</p>
            <p className="font-vt323 text-xl text-ink/75 mb-5 leading-snug">
              Permanently deletes your account and all documents, flashcards, and quiz history. This cannot be undone.
            </p>
            <p className="font-vt323 text-xl mb-3">
              Type <span className="font-pixelify font-bold text-[inherit]">delete my account</span> to confirm:
            </p>
            <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="delete my account" className="pixel-input mb-4"
                   style={{ borderColor: 'var(--px-red)' }} />
            {deleteMsg && <Msg type="error" text={deleteMsg.text} />}
            <button onClick={deleteAccount} disabled={deleting || deleteConfirm !== 'delete my account'} className="pixel-btn pixel-btn-danger">
              {deleting ? 'DELETING...' : 'DELETE ACCOUNT'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
