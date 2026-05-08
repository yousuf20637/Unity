'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';

interface Profile {
  phone: string;
  location: string;
  linkedin: string;
  bio: string;
  cv_url: string;
  cv_filename: string;
}

interface Application {
  id: string;
  job_title: string;
  job_id: string;
  status: string;
  created_at: string;
  cv_url: string;
  linkedin: string;
  recruiter_name: string;
}

interface Candidate {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  profile: Profile | null;
  applicationCount: number;
}

interface CandidateDetail extends Candidate {
  applications: Application[];
}

const STATUS_COLORS: Record<string, string> = {
  new:         'bg-blue-100 text-blue-700',
  reviewed:    'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-green-100 text-green-700',
  placed:      'bg-purple-100 text-purple-700',
  rejected:    'bg-red-100 text-red-700',
};

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail]         = useState<CandidateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/candidates')
      .then(r => r.json())
      .then(data => { setCandidates(data); setLoading(false); });
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/candidates/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }, [expandedId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Permanently delete account for ${name || id}? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCandidates(prev => prev.filter(c => c.id !== id));
      if (expandedId === id) { setExpandedId(null); setDetail(null); }
    }
    setDeleting(null);
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    return !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const initials = (name: string, email: string) => {
    const src = name || email;
    return src.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${candidates.length} registered account${candidates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading candidates…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {search ? 'No candidates match your search.' : 'No registered candidates yet.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Candidate</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Location</th>
                <th className="px-5 py-3 text-left hidden sm:table-cell">Profile</th>
                <th className="px-5 py-3 text-left hidden lg:table-cell">Joined</th>
                <th className="px-5 py-3 text-left">Applications</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <Fragment key={c.id}>
                  <tr
                    className={`hover:bg-gray-50 transition cursor-pointer ${expandedId === c.id ? 'bg-brand-50' : ''}`}
                    onClick={() => loadDetail(c.id)}
                  >
                    {/* Name + email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initials(c.fullName, c.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.fullName || '—'}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                      {c.profile?.location || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Profile completeness */}
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {c.profile?.cv_url ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Complete
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          No CV
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-xs text-gray-400 hidden lg:table-cell">
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* App count */}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.applicationCount > 0 ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.applicationCount} job{c.applicationCount !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-brand-600 font-medium hover:underline cursor-pointer">
                          {expandedId === c.id ? 'Close ▲' : 'View ▼'}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(c.id, c.fullName || c.email); }}
                          disabled={deleting === c.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                        >
                          {deleting === c.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === c.id && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={6} className="px-5 py-0 bg-gray-50 border-b border-gray-200">
                        {detailLoading ? (
                          <div className="py-6 text-center text-sm text-gray-400 animate-pulse">Loading profile…</div>
                        ) : detail ? (
                          <div className="py-5 grid md:grid-cols-2 gap-6">

                            {/* Left: profile info */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile</p>
                              <div className="space-y-2.5">
                                <DetailRow label="Full Name" value={detail.fullName} />
                                <DetailRow label="Email" value={detail.email} />
                                <DetailRow label="Phone" value={detail.profile?.phone} />
                                <DetailRow label="Location" value={detail.profile?.location} />
                                <DetailRow label="LinkedIn" value={detail.profile?.linkedin} link />
                                {detail.profile?.bio && (
                                  <div>
                                    <span className="text-xs text-gray-500 block mb-1">Bio</span>
                                    <p className="text-sm text-gray-700">{detail.profile.bio}</p>
                                  </div>
                                )}
                                {detail.profile?.cv_url && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    <a href={detail.profile.cv_url} target="_blank" rel="noopener noreferrer"
                                      className="text-sm text-brand-600 hover:underline font-medium">
                                      {detail.profile.cv_filename || 'View CV'} →
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: applications */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                Applications ({detail.applications.length})
                              </p>
                              {detail.applications.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No applications yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {detail.applications.map(app => (
                                    <div key={app.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{app.job_title}</p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(app.created_at).toLocaleDateString()} · {app.recruiter_name || 'Unassigned'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                        </span>
                                        {app.cv_url && (
                                          <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-brand-600 hover:underline">CV</a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  if (!value) return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-300 italic">Not set</span>
    </div>
  );
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline break-all">{value}</a>
      ) : (
        <span className="text-sm text-gray-800">{value}</span>
      )}
    </div>
  );
}
