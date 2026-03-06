import { useState, useEffect } from 'react';

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

interface PreviewJob {
  id: number;
  title: string;
  publishedCategory?: { id: number; name: string };
  address?: { city?: string; state?: string };
  employmentType?: string;
  dateLastPublished?: number;
  publicDescription?: string;
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

function formatCardDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function PreviewJobCard({ job }: { job: PreviewJob }) {
  const loc =
    job.address?.state === 'Remote'
      ? 'Remote'
      : [job.address?.city, job.address?.state].filter(Boolean).join(', ');
  const desc = stripHtml(job.publicDescription ?? '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-blue-600 leading-snug">{job.title}</h3>
          {job.publishedCategory?.name && (
            <p className="text-sm mt-0.5 text-blue-500/70">{job.publishedCategory.name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {loc && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-nowrap">
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {loc}
            </span>
          )}
          {job.employmentType && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-nowrap">
              {job.employmentType}
            </span>
          )}
          {job.dateLastPublished && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-500 whitespace-nowrap">
              {formatCardDate(job.dateLastPublished)}
            </span>
          )}
        </div>
      </div>
      {desc && <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">{desc}</p>}
    </div>
  );
}

async function fetchJobsForPreview(corpToken: string, swimlane: string): Promise<PreviewJob[]> {
  const base = `https://public-rest${swimlane}.bullhornstaffing.com:443/rest-services/${corpToken}`;
  const fields = 'id,title,publishedCategory(id,name),address(city,state),employmentType,dateLastPublished,publicDescription';
  const url = `${base}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=${fields}&count=20&sort=-dateLastPublished&showTotalMatched=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json() as { data?: PreviewJob[] };
  return data.data ?? [];
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

export default function PreviewPage() {
  const [urlInput, setUrlInput] = useState('');
  const [corpTokenInput, setCorpTokenInput] = useState('');
  const [swimlaneInput, setSwimlaneInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [corsBlocked, setCorsBlocked] = useState(false);

  const [importedConfig, setImportedConfig] = useState<ImportedConfig | null>(null);
  const [previewJobs, setPreviewJobs] = useState<PreviewJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [totalJobs, setTotalJobs] = useState<number | null>(null);

  const [shareUrl, setShareUrl] = useState('');
  const [shareUrlCopied, setShareUrlCopied] = useState(false);

  // Load config from hash on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#config=', '');
    if (hash) {
      const config = decodeConfig(hash);
      if (config) {
        setImportedConfig(config);
        setCorpTokenInput(config.corpToken);
        setSwimlaneInput(config.swimlane);
        setCompanyNameInput(config.companyName);
        loadPreviewJobs(config.corpToken, config.swimlane);
      }
    }
  }, []);

  async function loadPreviewJobs(corpToken: string, swimlane: string) {
    setJobsLoading(true);
    setJobsError('');
    try {
      const base = `https://public-rest${swimlane}.bullhornstaffing.com:443/rest-services/${corpToken}`;
      const fields = 'id,title,publishedCategory(id,name),address(city,state),employmentType,dateLastPublished,publicDescription';
      const url = `${base}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=${fields}&count=20&sort=-dateLastPublished&showTotalMatched=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Bullhorn API error');
      const data = await res.json() as { data?: PreviewJob[]; total?: number };
      setPreviewJobs(data.data ?? []);
      setTotalJobs(data.total ?? data.data?.length ?? 0);
    } catch {
      setJobsError('Could not load jobs from this portal. Check your corpToken and swimlane.');
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleUrlImport() {
    setImporting(true);
    setImportError('');
    setCorsBlocked(false);

    const rawUrl = urlInput.trim().replace(/\/$/, '');
    if (!rawUrl) {
      setImportError('Please enter a URL.');
      setImporting(false);
      return;
    }

    try {
      // Use our server-side proxy to avoid CORS issues
      const proxyUrl = `/api/fetch-config?url=${encodeURIComponent(rawUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setImportError(errData.error || "Could not reach that URL. Make sure it's a Bullhorn Career Portal.");
        setImporting(false);
        return;
      }
      const data = await res.json() as ProxyResponse;
      const corpToken = data.service?.corpToken;
      const swimlane = data.service?.swimlane;
      if (!corpToken || !swimlane) {
        setImportError("That doesn't look like a Bullhorn Career Portal configuration.");
        setImporting(false);
        return;
      }
      const config: ImportedConfig = {
        companyName: data.companyName ?? 'Unknown Company',
        companyLogoPath: data.companyLogoPath ?? '',
        companyUrl: data.companyUrl ?? rawUrl,
        corpToken,
        swimlane,
        sourceUrl: rawUrl,
        source: data.source,
        primaryColor: data.colors?.topBarColor,
        linkColor: data.colors?.linkColor,
      };
      applyConfig(config);
    } catch (err) {
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
    const config: ImportedConfig = {
      companyName,
      companyLogoPath: '',
      companyUrl: '',
      corpToken,
      swimlane,
      sourceUrl: '',
    };
    applyConfig(config);
  }

  function applyConfig(config: ImportedConfig) {
    setImportedConfig(config);
    setImportError('');
    setCorsBlocked(false);

    // Generate shareable URL
    const encoded = encodeConfig(config);
    const url = `${window.location.origin}${window.location.pathname}#config=${encoded}`;
    setShareUrl(url);
    window.history.replaceState(null, '', `#config=${encoded}`);

    loadPreviewJobs(config.corpToken, config.swimlane);
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareUrlCopied(true);
      setTimeout(() => setShareUrlCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero section */}
      <div
        className="relative overflow-hidden border-b border-gray-100"
        style={{
          background: 'linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(248,250,252,0) 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
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
            Paste your career portal URL and see an instant preview with your real jobs.
          </p>
        </div>
      </div>

      {/* Import form */}
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
            <div
              className={`mt-3 p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
                corsBlocked ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {importError}
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div className={`bg-white rounded-2xl border shadow-sm p-6 mb-6 transition-all ${corsBlocked ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
          <h2 className="text-base font-bold text-gray-900 mb-1">
            {corsBlocked ? '↓ Enter your details manually' : 'Or enter manually'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">Your Bullhorn corpToken and swimlane number</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Company Name
              </label>
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

        {/* Preview area */}
        {importedConfig && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Preview banner */}
            <div
              className="px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              style={{ background: 'linear-gradient(90deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.04) 100%)', borderBottom: '1px solid rgba(37,99,235,0.12)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)', animation: 'pulse-dot 2s ease-in-out infinite' }}
                />
                <p className="text-sm font-medium text-gray-700 truncate">
                  Preview of <span className="font-semibold">{importedConfig.companyName}</span> on Tonic
                  {importedConfig.source === 'tonic-templater' && (
                    <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Tonic Config</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {shareUrl && (
                  <button
                    onClick={copyShareUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold transition-all hover:bg-blue-50"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {shareUrlCopied ? (
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
                        Copy link
                      </>
                    )}
                  </button>
                )}
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Like what you see? Get Started →
                </a>
              </div>
            </div>

            {/* Preview content */}
            <div className="p-5">
              {/* Company header */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                {importedConfig.companyLogoPath ? (
                  <img
                    src={importedConfig.companyLogoPath}
                    alt={importedConfig.companyName}
                    className="h-8 w-auto"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {importedConfig.companyName[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{importedConfig.companyName}</p>
                  <p className="text-xs text-gray-400">
                    {totalJobs != null ? `${totalJobs} open position${totalJobs !== 1 ? 's' : ''}` : 'Loading…'}
                  </p>
                </div>
              </div>

              {jobsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="h-4 skeleton-shimmer rounded w-2/3 mb-1.5" />
                      <div className="h-3 skeleton-shimmer rounded w-1/4 mb-3" />
                      <div className="h-3 skeleton-shimmer rounded w-full mb-1" />
                      <div className="h-3 skeleton-shimmer rounded w-4/5" />
                    </div>
                  ))}
                </div>
              ) : jobsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {jobsError}
                </div>
              ) : previewJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No open positions found for this portal.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewJobs.map((job) => (
                    <PreviewJobCard key={job.id} job={job} />
                  ))}
                  {totalJobs != null && totalJobs > previewJobs.length && (
                    <p className="text-center text-sm text-gray-400 pt-2">
                      Showing {previewJobs.length} of {totalJobs} positions
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
