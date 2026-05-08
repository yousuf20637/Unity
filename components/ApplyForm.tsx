"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthPromptModal from "./AuthPromptModal";

interface ApplyFormProps {
  jobId: string;
  jobTitle: string;
}

interface SavedApplication {
  applicationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface GuestApplicationEntry extends SavedApplication {
  jobId: string;
  jobTitle: string;
  status: string;
  submittedAt: string;
}

interface UserProfile {
  phone: string;
  location: string;
  linkedin: string;
  bio: string;
  cv_url: string;
  cv_filename: string;
}

function getSavedApplication(jobId: string): SavedApplication | null {
  try {
    const stored = localStorage.getItem('appliedJobs');
    if (!stored) return null;
    return JSON.parse(stored)[jobId] ?? null;
  } catch {
    return null;
  }
}

function saveApplication(jobId: string, jobTitle: string, data: SavedApplication) {
  try {
    const stored = localStorage.getItem('appliedJobs');
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[jobId] = data;
    localStorage.setItem('appliedJobs', JSON.stringify(parsed));

    const listStored = localStorage.getItem('guestApplications');
    const list: GuestApplicationEntry[] = listStored ? JSON.parse(listStored) : [];
    const entry: GuestApplicationEntry = {
      ...data, jobId, jobTitle, status: 'new', submittedAt: new Date().toISOString(),
    };
    const idx = list.findIndex(a => a.applicationId === data.applicationId);
    if (idx >= 0) list[idx] = { ...list[idx], ...entry };
    else list.unshift(entry);
    localStorage.setItem('guestApplications', JSON.stringify(list));
  } catch { /* ignore */ }
}

export default function ApplyForm({ jobId, jobTitle }: ApplyFormProps) {
  const router = useRouter();
  const [saved, setSaved]               = useState<SavedApplication | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [authLoading, setAuthLoading]   = useState(true);
  const [isSignedIn, setIsSignedIn]     = useState(false);
  const [userEmail, setUserEmail]       = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [guestMode, setGuestMode]       = useState(false);

  useEffect(() => {
    const savedApp = getSavedApplication(jobId);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        setIsSignedIn(true);
        setUserEmail(user.email ?? '');
        setUserFullName(user.user_metadata?.full_name ?? '');
        // Only honour the localStorage entry if it belongs to this user
        if (savedApp && savedApp.email === user.email) setSaved(savedApp);
        setProfileLoading(true);
        fetch('/api/profile')
          .then(r => r.json())
          .then((p: UserProfile) => { setProfile(p); setProfileLoading(false); })
          .catch(() => setProfileLoading(false));
      } else {
        // Guest — localStorage entry is fine as-is
        setSaved(savedApp);
        if (!savedApp) setShowModal(true);
      }
      setAuthLoading(false);
    });
  }, [jobId]);

  async function submit(data: FormData) {
    setLoading(true);
    setError('');
    const res = await fetch('/api/jobs/apply', { method: 'POST', body: data });
    setLoading(false);
    if (!res.ok) { setError('Something went wrong. Please try again.'); return; }
    const json = await res.json();
    const appId = json.id ?? Date.now().toString();
    const firstName = data.get('firstName') as string;
    const email     = data.get('email') as string;
    saveApplication(jobId, jobTitle, {
      applicationId: appId,
      firstName,
      lastName: (data.get('lastName') as string) ?? '',
      email,
      phone: (data.get('phone') as string) ?? '',
    });
    router.push(`/application-submitted/${appId}?job=${encodeURIComponent(jobTitle)}&name=${encodeURIComponent(firstName)}&email=${encodeURIComponent(email)}`);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('jobId', jobId);
    data.set('jobTitle', jobTitle);
    await submit(data);
  }

  async function handleQuickApply(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile?.cv_url) return;
    const nameParts  = userFullName.trim().split(' ');
    const firstName  = nameParts[0] || '';
    const lastName   = nameParts.slice(1).join(' ') || '';
    const coverLetter = (new FormData(e.currentTarget).get('coverLetter') as string) ?? '';
    const data = new FormData();
    data.set('jobId', jobId);
    data.set('jobTitle', jobTitle);
    data.set('firstName', firstName);
    data.set('lastName', lastName);
    data.set('email', userEmail);
    data.set('phone', profile.phone ?? '');
    data.set('coverLetter', coverLetter);
    data.set('cvUrl', profile.cv_url);
    data.set('linkedin', profile.linkedin ?? '');
    await submit(data);
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  if (authLoading || (isSignedIn && profileLoading)) {
    return <div className="py-6 text-center text-gray-400 text-sm animate-pulse">Loading…</div>;
  }

  return (
    <>
      <AuthPromptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGuestClick={() => { setGuestMode(true); setShowModal(false); }}
        context="apply"
      />

      {/* ── Already applied ─────────────────────────────────────── */}
      {saved && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-5">
          <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-green-800">Application submitted</p>
            <p className="text-green-700 text-sm mt-0.5">
              You applied as <strong>{saved.firstName} {saved.lastName}</strong> ({saved.email}).
              We&apos;ll be in touch soon.
            </p>
          </div>
        </div>
      )}

      {/* ── One-click apply (signed in + complete profile) ──────── */}
      {!saved && isSignedIn && profile?.cv_url && (
        <form onSubmit={handleQuickApply} className="space-y-5">
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-brand-800">Applying with your profile</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-xs text-gray-500 block">Name</span>
                <span className="font-medium text-gray-900">{userFullName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Email</span>
                <span className="font-medium text-gray-900 break-all">{userEmail}</span>
              </div>
              {profile.phone && (
                <div>
                  <span className="text-xs text-gray-500 block">Phone</span>
                  <span className="font-medium text-gray-900">{profile.phone}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 block">CV</span>
                <a href={profile.cv_url} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-brand-600 hover:underline text-sm">
                  {profile.cv_filename || 'CV on file'} →
                </a>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
            <textarea name="coverLetter" rows={4} placeholder="Tell us why you'd be a great fit…" className={`${inputCls} resize-none`} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition disabled:opacity-60">
            {loading ? 'Submitting…' : 'Apply Now'}
          </button>
          <p className="text-center text-xs text-gray-400">
            Wrong details?{' '}
            <Link href="/profile" className="text-brand-600 hover:underline">Update your profile →</Link>
          </p>
        </form>
      )}

      {/* ── Signed in but no CV yet ─────────────────────────────── */}
      {!saved && isSignedIn && profile && !profile.cv_url && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.108-12.38c.866-1.5 3.032-1.5 3.898 0l1.186 2.063M12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-800">
              <Link href="/profile" className="font-semibold underline">Add your CV to your profile</Link> to apply with one click next time.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input required name="firstName" type="text" defaultValue={userFullName.split(' ')[0] ?? ''} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input name="lastName" type="text" defaultValue={userFullName.split(' ').slice(1).join(' ')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input required name="email" type="email" defaultValue={userEmail} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input name="phone" type="tel" defaultValue={profile.phone ?? ''} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload CV <span className="text-red-500">*</span></label>
              <input required name="cv" type="file" accept=".pdf,.doc,.docx"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
              <textarea name="coverLetter" rows={4} placeholder="Tell us why you'd be a great fit…" className={`${inputCls} resize-none`} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition disabled:opacity-60">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        </div>
      )}

      {/* ── Guest form ──────────────────────────────────────────── */}
      {!saved && !isSignedIn && guestMode && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input required name="firstName" type="text" placeholder="Jane" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input name="lastName" type="text" placeholder="Smith" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input required name="email" type="email" placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input name="phone" type="tel" placeholder="+1 206 555 0100" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload CV <span className="text-red-500">*</span></label>
            <input required name="cv" type="file" accept=".pdf,.doc,.docx"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
            <textarea name="coverLetter" rows={4} placeholder="Tell us why you'd be a great fit…" className={`${inputCls} resize-none`} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-lg hover:bg-brand-700 transition disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      )}
    </>
  );
}
