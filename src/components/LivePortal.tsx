/**
 * LivePortal — renders the full career portal from stored config.
 *
 * Two modes:
 * 1. Clean URL: /<crockford-id> → fetches config from /api/portals?id=<id>
 * 2. Hash fallback: /site#config=<base64> → decodes config from URL hash
 *
 * No preview banners, no import forms. Just the site, as if hosted.
 */
import { useState, useEffect } from 'react';
import { setConfigOverride, loadConfig } from '../config';
import type { CustomFont } from '../config';
import { invalidateJobCache } from '../api';
import JobListPage from './JobListPage';

interface PortalConfig {
  companyName: string;
  companyLogoPath: string;
  companyUrl: string;
  corpToken: string;
  swimlane: string;
  primaryColor?: string;
  linkColor?: string;
  privacyPolicyUrl?: string;
  showHeader?: boolean;
  fontFamily?: string;
  customFont?: CustomFont;
  service?: { corpToken?: string; swimlane?: string };
}

function decodeHashConfig(hash: string): PortalConfig | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json) as PortalConfig;
  } catch {
    return null;
  }
}

/** Extract portal ID from URL path. Matches Crockford Base32 pattern. */
function getPortalIdFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/^\/|\/$/g, '');
  // Must look like a Crockford Base32 ID (6-12 chars, valid charset)
  if (/^[0-9a-hjkmnp-tv-z]{6,12}$/i.test(path)) {
    return path.toLowerCase();
  }
  return null;
}

/** Inject @font-face rules for custom fonts */
function injectCustomFont(font: CustomFont) {
  const existingStyle = document.getElementById('tonic-custom-fonts');
  if (existingStyle) existingStyle.remove();

  const css = font.weights.map(w => `
@font-face {
  font-family: '${font.family}';
  src: url('${w.url}') format('${w.format || 'opentype'}');
  font-weight: ${w.weight};
  font-style: normal;
  font-display: swap;
}`).join('\n');

  const style = document.createElement('style');
  style.id = 'tonic-custom-fonts';
  style.textContent = css;
  document.head.appendChild(style);
}

function applyPortalConfig(config: PortalConfig) {
  setConfigOverride({
    companyName: config.companyName,
    companyLogoUrl: config.companyLogoPath,
    companyUrl: config.companyUrl,
    primaryColor: config.primaryColor || '#2563EB',
    accentColor: config.linkColor || '#10B981',
    privacyPolicyUrl: config.privacyPolicyUrl || '',
    service: {
      swimlane: config.swimlane,
      corpToken: config.corpToken,
      fields: 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,salary,salaryUnit,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted',
    },
  });
  invalidateJobCache();

  const root = document.documentElement;
  if (config.primaryColor) root.style.setProperty('--color-primary', config.primaryColor);
  if (config.linkColor) root.style.setProperty('--color-accent', config.linkColor);

  // Apply custom font if configured
  if (config.customFont) {
    injectCustomFont(config.customFont);
    document.documentElement.style.setProperty('font-family', `'${config.customFont.family}', sans-serif`);
    document.body.style.fontFamily = `'${config.customFont.family}', sans-serif`;
  } else if (config.fontFamily) {
    document.body.style.fontFamily = config.fontFamily;
  }

  document.title = `${config.companyName} — Careers`;

  // Persist to sessionStorage so job detail pages can restore the config
  try {
    sessionStorage.setItem('tonic_portal_config', JSON.stringify(config));
  } catch { /* quota exceeded or private browsing */ }
}

function DynamicHeader({ config }: { config: PortalConfig }) {
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

function DynamicFooter({ config }: { config: PortalConfig }) {
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

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-400">Loading career portal…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Portal not found</h1>
        <p className="text-sm text-gray-500 mb-6">{message || 'This link doesn\'t contain a valid portal configuration.'}</p>
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
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Mode 1: Check for Crockford Base32 ID in URL path
    const portalId = getPortalIdFromPath();
    if (portalId) {
      fetchPortalById(portalId);
      return;
    }

    // Mode 2: Check for base64 config in URL hash (fallback)
    const hash = window.location.hash.replace('#config=', '');
    if (hash) {
      const parsed = decodeHashConfig(hash);
      if (parsed && parsed.corpToken && parsed.swimlane) {
        applyPortalConfig(parsed);
        setConfig(parsed);
        return;
      }
    }

    setError('No portal configuration found in the URL.');
  }, []);

  async function fetchPortalById(id: string) {
    try {
      const res = await fetch(`/api/portals?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('This portal has expired or doesn\'t exist.');
          return;
        }
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      // API returns { id, config: {...}, tier, ... } — unwrap
      const raw = data.config || data;
      const portalConfig: PortalConfig = {
        companyName: raw.companyName || data.companyName || 'Careers',
        companyLogoPath: raw.companyLogoPath || '',
        companyUrl: raw.companyUrl || '',
        corpToken: raw.service?.corpToken || raw.corpToken || '',
        swimlane: raw.service?.swimlane || raw.swimlane || '',
        primaryColor: raw.primaryColor,
        linkColor: raw.linkColor,
        privacyPolicyUrl: raw.privacyPolicyUrl,
        showHeader: raw.showHeader,
        fontFamily: raw.fontFamily,
        customFont: raw.customFont,
      };
      applyPortalConfig(portalConfig);
      setConfig(portalConfig);
    } catch (err) {
      console.error('Failed to load portal:', err);
      setError('Failed to load portal configuration. Please try again.');
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!config) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {config.showHeader !== false && <DynamicHeader config={config} />}
      <main className="flex-1 w-full">
        <JobListPage />
      </main>
      <DynamicFooter config={config} />
    </div>
  );
}
