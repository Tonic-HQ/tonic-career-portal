/**
 * LivePortal — renders the full career portal from a config hash.
 * No preview banners, no import forms. Just the site, as if hosted.
 * URL: /site#config=<base64-encoded-json>
 */
import { useState, useEffect } from 'react';
import { setConfigOverride, loadConfig } from '../config';
import { invalidateJobCache } from '../api';
import JobListPage from './JobListPage';

interface PortalConfigHash {
  companyName: string;
  companyLogoPath: string;
  companyUrl: string;
  corpToken: string;
  swimlane: string;
  primaryColor?: string;
  linkColor?: string;
  privacyPolicyUrl?: string;
}

function decodeConfig(hash: string): PortalConfigHash | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json) as PortalConfigHash;
  } catch {
    return null;
  }
}

function DynamicHeader({ config }: { config: PortalConfigHash }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40"
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.04)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a
          href={config.companyUrl || '#'}
          className="flex items-center gap-3 group min-w-0"
          {...(!config.companyUrl ? { onClick: (e: React.MouseEvent) => e.preventDefault() } : {})}
        >
          {config.companyLogoPath ? (
            <img src={config.companyLogoPath} alt={config.companyName + ' logo'} className="h-8 w-auto flex-shrink-0" />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md"
                style={{ background: `linear-gradient(135deg, var(--color-primary) 0%, #1d4ed8 100%)` }}
              >
                <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
              </div>
              <div className="flex flex-col leading-none min-w-0">
                <span className="font-bold text-gray-900 text-[15px] tracking-tight transition-colors group-hover:text-blue-600 truncate max-w-[160px] sm:max-w-none">
                  {config.companyName}
                </span>
                <span className="text-[9px] font-semibold text-gray-400 tracking-[0.12em] uppercase mt-0.5">
                  Careers
                </span>
              </div>
            </div>
          )}
        </a>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <span className="text-sm font-medium px-3 py-2 rounded-lg" style={{ color: 'var(--color-primary)', backgroundColor: 'rgba(37,99,235,0.06)' }}>
            All Jobs
          </span>
          {config.companyUrl && (
            <a
              href={config.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-500 hover:text-blue-600 px-3 py-2 rounded-lg transition-all hover:bg-blue-50 inline-flex items-center gap-1.5"
            >
              Company Site
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
          aria-label="Open menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            <span className="flex items-center gap-2 text-sm font-medium px-3 py-3 rounded-lg" style={{ color: 'var(--color-primary)', backgroundColor: 'rgba(37,99,235,0.06)', minHeight: '44px' }}>
              All Jobs
            </span>
            {config.companyUrl && (
              <a
                href={config.companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-3 rounded-lg transition-all hover:bg-blue-50"
                style={{ minHeight: '44px' }}
              >
                Company Site
                <svg className="w-3.5 h-3.5 opacity-60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function DynamicFooter({ config }: { config: PortalConfigHash }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white mt-auto">
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 30%, #cbd5e1 50%, #e2e8f0 70%, transparent 100%)' }} />
      <div className="max-w-6xl mx-auto px-4 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-400 font-light">
          © {year} {config.companyName}. All rights reserved.
        </p>
        <div className="flex items-center gap-5">
          {config.privacyPolicyUrl && (
            <a href={config.privacyPolicyUrl} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
          )}
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            Powered by{' '}
            <a href="https://tonichq.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              Tonic
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function ErrorState() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Portal not found</h1>
        <p className="text-sm text-gray-500 mb-6">This link doesn't contain a valid portal configuration. It may have been truncated or corrupted.</p>
        <a
          href="/preview"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Create a New Preview
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function LivePortal() {
  const [config, setConfig] = useState<PortalConfigHash | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.replace('#config=', '');
    if (!hash) {
      setError(true);
      return;
    }

    const parsed = decodeConfig(hash);
    if (!parsed || !parsed.corpToken || !parsed.swimlane) {
      setError(true);
      return;
    }

    // Set runtime config override
    setConfigOverride({
      companyName: parsed.companyName,
      companyLogoUrl: parsed.companyLogoPath,
      companyUrl: parsed.companyUrl,
      primaryColor: parsed.primaryColor || '#2563EB',
      accentColor: parsed.linkColor || '#10B981',
      privacyPolicyUrl: parsed.privacyPolicyUrl || '',
      service: {
        swimlane: parsed.swimlane,
        corpToken: parsed.corpToken,
        fields: 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,salary,salaryUnit,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted',
      },
    });
    invalidateJobCache();

    // Apply colors to DOM
    const root = document.documentElement;
    if (parsed.primaryColor) root.style.setProperty('--color-primary', parsed.primaryColor);
    if (parsed.linkColor) root.style.setProperty('--color-accent', parsed.linkColor);

    // Update page title
    document.title = `${parsed.companyName} — Careers`;

    setConfig(parsed);
  }, []);

  if (error) return <ErrorState />;

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DynamicHeader config={config} />
      <main className="flex-1 w-full">
        <JobListPage />
      </main>
      <DynamicFooter config={config} />
    </div>
  );
}
