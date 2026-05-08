'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Application {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  submittedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new:         'Received',
  reviewed:    'Under Review',
  shortlisted: 'Shortlisted',
  placed:      'Placed',
  rejected:    'Not Moving Forward',
};

const STATUS_COLORS: Record<string, string> = {
  new:         'bg-gray-100 text-gray-700',
  reviewed:    'bg-blue-100 text-blue-700',
  shortlisted: 'bg-green-100 text-green-800',
  placed:      'bg-purple-100 text-purple-700',
  rejected:    'bg-red-100 text-red-700',
};

function readLocalApps(): Application[] {
  try {
    const stored = localStorage.getItem('guestApplications');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function MyApplicationsPage() {
  const [apps, setApps]               = useState<Application[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone]   = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email;

      if (email) {
        // Signed-in: fetch from server and only merge local apps for this email
        try {
          const res = await fetch(`/api/jobs/my-applications?email=${encodeURIComponent(email)}`);
          const json = await res.json();
          if (res.ok) {
            const serverApps: Application[] = (json.applications ?? []).map((a: {
              id: string; job_id: string; job_title: string; first_name: string;
              last_name: string; email: string; status: string; created_at: string;
            }) => ({
              applicationId: a.id,
              jobId:         a.job_id,
              jobTitle:      a.job_title,
              firstName:     a.first_name,
              lastName:      a.last_name,
              email:         a.email,
              status:        a.status,
              submittedAt:   a.created_at,
            }));
            // Only include local apps that belong to this signed-in user
            const localApps = readLocalApps().filter(a => a.email === email);
            const merged = [...serverApps];
            for (const local of localApps) {
              if (!merged.find(a => a.applicationId === local.applicationId)) merged.push(local);
            }
            setApps(merged);
          }
        } catch { /* silently ignore */ }
      } else {
        // Guest: show all local apps (no account to cross-check against)
        setApps(readLocalApps());
      }

      setLoaded(true);
    });
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setLookupError('');

    try {
      const res  = await fetch(`/api/jobs/my-applications?email=${encodeURIComponent(lookupEmail.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setLookupError(json.error ?? 'Something went wrong.');
        setLookupLoading(false);
        return;
      }
      const serverApps: Application[] = (json.applications ?? []).map((a: {
        id: string; job_id: string; job_title: string; first_name: string;
        last_name: string; email: string; status: string; created_at: string;
      }) => ({
        applicationId: a.id,
        jobId:         a.job_id,
        jobTitle:      a.job_title,
        firstName:     a.first_name,
        lastName:      a.last_name,
        email:         a.email,
        status:        a.status,
        submittedAt:   a.created_at,
      }));
      setApps(prev => {
        const merged = [...serverApps];
        for (const local of prev) {
          if (!merged.find(a => a.applicationId === local.applicationId)) merged.push(local);
        }
        return merged;
      });
      setLookupDone(true);
    } catch {
      setLookupError('Network error. Please try again.');
    }
    setLookupLoading(false);
  }

  if (!loaded) return null;

  const hasApps = apps.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-2">Track the positions you&apos;ve applied to.</p>
        </div>

        {!hasApps && !lookupDone ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center mb-8">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 text-lg">No applications on this device</p>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Applications you submit will appear here. Use the lookup below if you applied from another device.
            </p>
            <Link href="/careers"
              className="inline-block bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-brand-700 transition text-sm">
              Browse Open Roles
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {apps.map(app => (
              <div key={app.applicationId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-6 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">{app.jobTitle}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {app.firstName} {app.lastName} &middot; {app.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted {new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
                <div className="border-t border-gray-100 px-6 py-3">
                  <Link href={`/careers/${app.jobId}`}
                    className="text-sm text-brand-600 font-medium hover:underline">
                    View Job →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Email lookup for guests / other devices */}
        <div className="bg-white rounded-2xl border border-gray-200 p-7">
          <h2 className="font-semibold text-gray-900 mb-1">
            {lookupDone ? 'Search again' : 'Applied from another device?'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter the email address you used when applying and we&apos;ll find your applications.
          </p>
          <form onSubmit={handleLookup} className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              required
              value={lookupEmail}
              onChange={e => setLookupEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" disabled={lookupLoading}
              className="shrink-0 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-700 transition text-sm disabled:opacity-60">
              {lookupLoading ? 'Searching…' : 'Find Applications'}
            </button>
          </form>
          {lookupError && <p className="text-red-500 text-sm mt-3">{lookupError}</p>}
          {lookupDone && !lookupError && (
            <p className="text-sm mt-3 text-green-700 font-medium">
              {apps.length === 0
                ? 'No applications found for that email address.'
                : `Found ${apps.length} application${apps.length !== 1 ? 's' : ''}.`}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
