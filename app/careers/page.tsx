'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Jobs are fetched client-side so search/filter works interactively
interface Job {
  id: string; title: string; company: string; location: string; type: string;
  vertical: string; salary: string; description: string;
}

const verticalColors: Record<string, string> = {
  'IT & Software':  'bg-blue-100 text-blue-700',
  'Data Center':    'bg-slate-100 text-slate-700',
  'Pharmaceutical': 'bg-emerald-100 text-emerald-700',
};
const typeColors: Record<string, string> = {
  'Full-time': 'bg-brand-50 text-brand-700',
  'Contract':  'bg-amber-50 text-amber-700',
};

const VERTICALS = ['All', 'IT & Software', 'Data Center', 'Pharmaceutical'];
const TYPES     = ['All', 'Full-time', 'Contract'];

export default function CareersPage() {
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [vertical, setVertical]   = useState('All');
  const [type, setType]           = useState('All');
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('appliedJobs');
      if (!stored) return;
      const parsed: Record<string, { email?: string }> = JSON.parse(stored);

      // For signed-in users only show "Applied" badges for their own applications
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const userEmail = data.user?.email;
        const jobIds = userEmail
          ? Object.entries(parsed).filter(([, v]) => v.email === userEmail).map(([k]) => k)
          : Object.keys(parsed);
        setAppliedJobs(new Set(jobIds));
      });
    } catch { /* ignore */ }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return jobs.filter(j => {
      const matchQ = !q || j.title.toLowerCase().includes(q) || j.vertical.toLowerCase().includes(q);
      const matchV = vertical === 'All' || j.vertical === vertical;
      const matchT = type === 'All' || j.type === type;
      return matchQ && matchV && matchT;
    });
  }, [jobs, query, vertical, type]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page hero */}
      <div className="bg-brand-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-3">Open Positions</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Find Your Next Role</h1>
          <p className="text-blue-200 max-w-xl mx-auto text-lg">
            Browse our current openings across IT, Data Center, and Pharmaceutical — and apply in minutes.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Search & filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8">
          {/* Search bar */}
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or industry…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Vertical:</span>
              {VERTICALS.map(v => (
                <button
                  key={v}
                  onClick={() => setVertical(v)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    vertical === v
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Type:</span>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    type === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length === jobs.length
              ? `${jobs.length} open position${jobs.length !== 1 ? 's' : ''}`
              : `${filtered.length} of ${jobs.length} positions`}
          </p>
        )}

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-600 font-medium mb-1">No roles found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
            <button onClick={() => { setQuery(''); setVertical('All'); setType('All'); }} className="mt-4 text-sm text-brand-600 font-medium hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => {
              const applied = appliedJobs.has(job.id);
              return (
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className={`block bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition group ${applied ? 'border-green-300 hover:border-green-400' : 'border-gray-200 hover:border-brand-400'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 transition truncate">{job.title}</h2>
                        {applied && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Applied
                          </span>
                        )}
                      </div>
                      {job.location && <p className="text-sm text-gray-500 mt-0.5">{job.location}</p>}
                      <p className="text-sm font-semibold text-brand-700 mt-1">{job.salary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${verticalColors[job.vertical] ?? 'bg-gray-100 text-gray-700'}`}>
                        {job.vertical}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeColors[job.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {job.type}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer prompt */}
        <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-7 text-center">
          <p className="text-gray-600 text-sm">
            Don&apos;t see a role that fits?{' '}
            <Link href="/contact" className="text-brand-600 font-semibold hover:underline">
              Send us your CV
            </Link>{' '}
            and we&apos;ll reach out when something relevant opens up.
          </p>
        </div>
      </div>

    </div>
  );
}
