/**
 * AdminDashboard — login gate + portal management dashboard.
 * If not authenticated → magic link sign-in form.
 * If authenticated → portal list with status and actions.
 */
import { useState, useEffect } from 'react';
import { sendMagicLink, getSession, signOut, supabase } from '../lib/auth-client';
import type { AuthSession } from '../lib/auth-client';

// ── Login Form ──

function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setError('');

    const result = await sendMagicLink(email.trim());
    if (result.ok) {
      setStatus('sent');
    } else {
      setStatus('error');
      setError(result.error || 'Failed to send magic link');
    }
  }

  if (status === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              We sent a sign-in link to <span className="font-medium text-gray-700">{email}</span>. Click the link to access your dashboard.
            </p>
            <button
              onClick={() => { setStatus('idle'); setEmail(''); }}
              className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Career Portal Admin</h1>
          <p className="text-gray-500 text-sm mt-2">Sign in to manage your portals</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit}>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />

            {status === 'error' && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full mt-4 bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {status === 'sending' ? 'Sending...' : 'Send sign-in link'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          No password needed. We'll email you a secure link.
        </p>
      </div>
    </div>
  );
}

// ── Portal List ──

interface Portal {
  id: string;
  company_name: string | null;
  tier: string;
  created_at: string;
}

const TIER_BADGES: Record<string, { label: string; className: string }> = {
  preview: { label: 'Preview', className: 'bg-gray-100 text-gray-600' },
  starter: { label: 'Starter', className: 'bg-blue-50 text-blue-700' },
  standard: { label: 'Standard', className: 'bg-violet-50 text-violet-700' },
  pro: { label: 'Pro', className: 'bg-amber-50 text-amber-700' },
};

function PortalRow({ portal }: { portal: Portal }) {
  const badge = TIER_BADGES[portal.tier] || TIER_BADGES.preview;
  const created = new Date(portal.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-xl group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-gray-400">
            {(portal.company_name || portal.id).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {portal.company_name || portal.id}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            <code className="font-mono text-[11px]">{portal.id}</code>
            <span className="mx-1.5">·</span>
            Created {created}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`/${portal.id}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          View
        </a>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
          onClick={() => {
            // TODO: navigate to config editor
            window.location.href = `/admin?portal=${portal.id}`;
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Configure
        </button>
      </div>
    </div>
  );
}

function Dashboard({ session }: { session: AuthSession }) {
  const { user, portals } = session;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-gray-900">Career Portal Admin</h1>
            {user.role === 'admin' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{user.email}</span>
            <button
              onClick={async () => { await signOut(); window.location.reload(); }}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{portals.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total portals</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">
              {portals.filter(p => p.tier === 'pro').length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Pro tier</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">
              {portals.filter(p => p.tier === 'standard').length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Standard tier</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">
              {portals.filter(p => p.tier === 'preview').length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Previews</p>
          </div>
        </div>

        {/* Portal list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Portals</h2>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] transition-all"
              onClick={() => {
                // TODO: create portal flow
                window.location.href = '/preview';
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Portal
            </button>
          </div>

          {portals.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">No portals yet</p>
              <p className="text-gray-300 text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 px-2 py-1">
              {portals.map(portal => (
                <PortalRow key={portal.id} portal={portal} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function AdminDashboard() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes (magic link callback)
    if (supabase) {
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN') {
          const s = await getSession();
          setSession(s);
          setLoading(false);
        }
      });
    }

    // Check existing session
    async function checkSession() {
      const s = await getSession();
      setSession(s);
      setLoading(false);
    }
    checkSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return <Dashboard session={session} />;
}
