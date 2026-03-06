import { useState, useEffect } from 'react';
import { setConfigOverride, loadConfig } from '../config';
import { invalidateJobCache } from '../api';
import JobListPage from './JobListPage';

interface ProxyResponse {
  source: 'tonic-templater' | 'oscp-appjson';
  companyName?: string;
  companyLogoPath?: string;
  companyUrl?: string;
  service?: {
    corpToken?: string;
    swimlane?: string;
    fields?: string[];
  };
  colors?: {
    topBarColor?: string;
    sideBarColor?: string;
    linkColor?: string;
  };
  additionalJobCriteria?: {
    field?: string;
    values?: string[];
  };
  eeoc?: {
    genderRaceEthnicity?: boolean;
    veteran?: boolean;
    disability?: boolean;
  };
  privacyConsent?: {
    consentCheckbox?: boolean;
    privacyPolicyUrl?: string;
  };
}

interface ImportedConfig {
  companyName: string;
  companyLogoPath: string;
  companyUrl: string;
  corpToken: string;
  swimlane: string;
  sourceUrl: string;
  source?: string;
  primaryColor?: string;
  linkColor?: string;
}

function encodeConfig(config: ImportedConfig): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config))));
}

function decodeConfig(hash: string): ImportedConfig | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json) as ImportedConfig;
  } catch {
    return null;
  }
}

function applyColorsToDOM(primaryColor?: string, linkColor?: string) {
  const root = document.documentElement;
  if (primaryColor) root.style.setProperty('--color-primary', primaryColor);
  if (linkColor) root.style.setProperty('--color-accent', linkColor);
}

/** Thin preview banner shown above the full portal */
function PreviewBanner({
  config,
  shareUrl,
  onReset,
}: {
  config: ImportedConfig;
  shareUrl: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="sticky top-0 z-50 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b"
      style={{
        background: 'linear-gradient(90deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.04) 100%)',
        borderColor: 'rgba(37,99,235,0.12)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="text-sm font-medium text-gray-700 truncate">
          Preview of <span className="font-semibold">{config.companyName}</span>
          {config.source === 'tonic-templater' && (
            <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Tonic Config
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 transition-all hover:bg-gray-50"
        >
          ← Try Another
        </button>
        {shareUrl && (
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold transition-all hover:bg-blue-50"
            style={{ color: 'var(--color-primary)' }}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Site URL
              </>
            )}
          </button>
        )}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          Get Started →
        </a>
      </div>
    </div>
  );
}

/** Dynamic header that mirrors Header.astro but uses runtime config */
function DynamicHeader({ config }: { config: ImportedConfig }) {
  return (
    <header
      className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-10 z-40"
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.04)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group min-w-0" onClick={e => e.preventDefault()}>
          {config.companyLogoPath ? (
            <img src={config.companyLogoPath} alt={config.companyName + ' logo'} className="h-8 w-auto flex-shrink-0" />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md"
                style={{ background: `linear-gradient(135deg, ${config.primaryColor || 'var(--color-primary)'} 0%, #1d4ed8 100%)` }}
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
          <a href="#" onClick={e => e.preventDefault()} className="text-sm font-medium text-gray-500 hover:text-blue-600 px-3 py-2 rounded-lg transition-all hover:bg-blue-50">
            All Jobs
          </a>
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
      </div>
    </header>
  );
}

/** Dynamic footer */
function DynamicFooter({ config }: { config: ImportedConfig }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white mt-auto">
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 30%, #cbd5e1 50%, #e2e8f0 70%, transparent 100%)' }} />
      <div className="max-w-6xl mx-auto px-4 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-400 font-light">
          © {year} {config.companyName}. All rights reserved.
        </p>
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          Powered by{' '}
          <a href="https://tonichq.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-blue-600 transition-colors">
            Tonic
          </a>
        </span>
      </div>
    </footer>
  );
}

/** Import form — shown when no config is loaded */
function ImportForm({
  onConfigLoaded,
}: {
  onConfigLoaded: (config: ImportedConfig) => void;
}) {
  const [urlInput, setUrlInput] = useState('');
  const [corpTokenInput, setCorpTokenInput] = useState('');
  const [swimlaneInput, setSwimlaneInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  async function handleUrlImport() {
    setImporting(true);
    setImportError('');
    const rawUrl = urlInput.trim().replace(/\/$/, '');
    if (!rawUrl) {
      setImportError('Please enter a URL.');
      setImporting(false);
      return;
    }
    try {
      const proxyUrl = `/api/fetch-config?url=${encodeURIComponent(rawUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setImportError(errData.error || "Could not reach that URL. Make sure it's a Bullhorn Career Portal.");
        setImporting(false);
        return;
      }
      const data = (await res.json()) as ProxyResponse;
      const corpToken = data.service?.corpToken;
      const swimlane = data.service?.swimlane;
      if (!corpToken || !swimlane) {
        setImportError("That doesn't look like a Bullhorn Career Portal configuration.");
        setImporting(false);
        return;
      }
      onConfigLoaded({
        companyName: data.companyName ?? 'Unknown Company',
        companyLogoPath: data.companyLogoPath ?? '',
        companyUrl: data.companyUrl ?? rawUrl,
        corpToken,
        swimlane,
        sourceUrl: rawUrl,
        source: data.source,
        primaryColor: data.colors?.topBarColor,
        linkColor: data.colors?.linkColor,
      });
    } catch {
      setImportError("Could not reach that URL. Make sure it's a Bullhorn Career Portal.");
    } finally {
      setImporting(false);
    }
  }

  function handleManualImport() {
    const corpToken = corpTokenInput.trim();
    const swimlane = swimlaneInput.trim();
    const companyName = companyNameInput.trim() || 'Your Company';
    if (!corpToken || !swimlane) {
      setImportError('Please enter both a corpToken and swimlane number.');
      return;
    }
    onConfigLoaded({
      companyName,
      companyLogoPath: '',
      companyUrl: '',
      corpToken,
      swimlane,
      sourceUrl: '',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-gray-100"
        style={{ background: 'linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(248,250,252,0) 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-12 pb-10 text-center">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{ backgroundColor: 'rgba(37,99,235,0.07)', color: 'var(--color-primary)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Instant Preview
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            See your jobs on Tonic
          </h1>
          <p className="text-lg text-gray-500 font-light leading-relaxed max-w-xl mx-auto">
            Paste your career portal URL and see a fully working preview — your real jobs, your brand, live in seconds.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* URL import */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-1">Import from URL</h2>
          <p className="text-sm text-gray-500 mb-4">Paste your existing Bullhorn career portal URL</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              placeholder="https://careers.yourcompany.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400 transition-all"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleUrlImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', minHeight: '44px' }}
            >
              {importing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'Preview'
              )}
            </button>
          </div>
          {importError && (
            <div className="mt-3 p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {importError}
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Or enter manually</h2>
          <p className="text-sm text-gray-500 mb-4">Your Bullhorn corpToken and swimlane number</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                placeholder="Acme Staffing"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                corpToken <span className="text-red-400 normal-case">*</span>
              </label>
              <input
                type="text"
                value={corpTokenInput}
                onChange={(e) => setCorpTokenInput(e.target.value)}
                placeholder="abc123"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Swimlane <span className="text-red-400 normal-case">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={swimlaneInput}
                onChange={(e) => setSwimlaneInput(e.target.value)}
                placeholder="7"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>
          <button
            onClick={handleManualImport}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ backgroundColor: 'var(--color-primary)', minHeight: '44px' }}
          >
            Preview Jobs
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [importedConfig, setImportedConfig] = useState<ImportedConfig | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [ready, setReady] = useState(false);

  // Check for config in URL hash on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#config=', '');
    if (hash) {
      const config = decodeConfig(hash);
      if (config) {
        activateConfig(config);
        return;
      }
    }
    setReady(true);
  }, []);

  function activateConfig(config: ImportedConfig) {
    // Set runtime config override so api.ts and loadConfig() use this portal's creds
    setConfigOverride({
      companyName: config.companyName,
      companyLogoUrl: config.companyLogoPath,
      companyUrl: config.companyUrl,
      primaryColor: config.primaryColor || '#2563EB',
      accentColor: config.linkColor || '#10B981',
      service: {
        swimlane: config.swimlane,
        corpToken: config.corpToken,
        fields: 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,salary,salaryUnit,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted',
      },
    });

    // Invalidate any cached jobs from a different portal
    invalidateJobCache();

    // Apply colors to DOM
    applyColorsToDOM(config.primaryColor, config.linkColor);

    // Generate shareable URL — points to /site (clean, no preview chrome)
    const encoded = encodeConfig(config);
    const url = `${window.location.origin}/site#config=${encoded}`;
    setShareUrl(url);
    window.history.replaceState(null, '', `${window.location.pathname}#config=${encoded}`);

    setImportedConfig(config);
    setReady(true);
  }

  function handleReset() {
    setConfigOverride(null);
    invalidateJobCache();
    setImportedConfig(null);
    setShareUrl('');
    window.history.replaceState(null, '', window.location.pathname);
    // Reset colors
    document.documentElement.style.setProperty('--color-primary', '#2563EB');
    document.documentElement.style.setProperty('--color-accent', '#10B981');
  }

  if (!ready) {
    // Loading state while checking URL hash
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // No config yet — show the import form
  if (!importedConfig) {
    return <ImportForm onConfigLoaded={activateConfig} />;
  }

  // Config loaded — render the full portal
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PreviewBanner config={importedConfig} shareUrl={shareUrl} onReset={handleReset} />
      <DynamicHeader config={importedConfig} />
      <main className="flex-1 w-full">
        <JobListPage />
      </main>
      <DynamicFooter config={importedConfig} />
    </div>
  );
}
