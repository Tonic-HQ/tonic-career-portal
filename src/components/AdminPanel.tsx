import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminConfig {
  // Branding
  companyName: string;
  logoUrl: string;
  faviconUrl: string;
  pageTitleTemplate: string;
  // Typography
  primaryFont: string;
  headingFont: string;
  customFontUrl: string;
  // Colors
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  // Content
  heroHeading: string;
  heroSubtext: string;
  showSalary: boolean;
  showEmploymentType: boolean;
  jobsPerPage: number;
  defaultView: 'grid' | 'list';
  // Apply Form
  applyMode: 'quick' | 'full';
  resumeRequired: boolean;
  showPhone: boolean;
  phoneRequired: boolean;
  privacyPolicyUrl: string;
  consentText: string;
  // Bullhorn
  swimlane: string;
  corpToken: string;
  // SEO
  googleAnalyticsId: string;
  metaDescription: string;
  ogImageUrl: string;
}

const DEFAULTS: AdminConfig = {
  companyName: 'Tonic HQ',
  logoUrl: '',
  faviconUrl: '',
  pageTitleTemplate: '{{jobTitle}} | {{companyName}} Careers',
  primaryFont: 'Inter',
  headingFont: 'Same as primary',
  customFontUrl: '',
  primaryColor: '#2563EB',
  accentColor: '#10B981',
  backgroundColor: '#FFFFFF',
  textColor: '#111827',
  heroHeading: 'Open Positions',
  heroSubtext: 'Find your next opportunity',
  showSalary: true,
  showEmploymentType: true,
  jobsPerPage: 9,
  defaultView: 'grid',
  applyMode: 'quick',
  resumeRequired: false,
  showPhone: true,
  phoneRequired: false,
  privacyPolicyUrl: '',
  consentText: 'I agree to the privacy policy and consent to being contacted about this application.',
  swimlane: '91',
  corpToken: '3apw29',
  googleAnalyticsId: '',
  metaDescription: '',
  ogImageUrl: '',
};

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Montserrat',
  'Plus Jakarta Sans',
  'DM Sans',
  'Source Sans 3',
  'Nunito Sans',
];

const STORAGE_KEY = 'tonic-portal-admin-config';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-lg shadow-sm border border-white" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-400 font-mono">{color}</span>
      <span className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [hex, setHex] = useState(value);
  const inputId = `cp-${label.toLowerCase().replace(/\s/g, '-')}`;

  useEffect(() => {
    setHex(value);
  }, [value]);

  function handleHex(v: string) {
    setHex(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <input
          type="color"
          id={inputId}
          value={value}
          onChange={e => {
            setHex(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
        <div
          className="w-9 h-9 rounded-xl border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: value, boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.12)' }}
        />
      </div>
      <input
        type="text"
        value={hex}
        onChange={e => handleHex(e.target.value)}
        maxLength={7}
        className="w-24 px-2.5 py-1.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
        placeholder="#000000"
      />
      <span className="text-sm text-gray-600 flex-1">{label}</span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {description && (
          <div className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 ml-3 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0"
            style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}
          >
            {icon}
          </div>
          <span className="font-semibold text-gray-900 text-[14px]">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {hint && (
          <span className="ml-1.5 text-xs font-normal text-gray-400">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white ${
        mono ? 'font-mono' : ''
      }`}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white resize-none"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white cursor-pointer"
    >
      {children}
    </select>
  );
}

// ─── Section Icons ────────────────────────────────────────────────────────────

const IconBranding = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const IconTypography = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const IconColors = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const IconContent = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconApply = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const IconBullhorn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconSEO = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [config, setConfig] = useState<AdminConfig>(DEFAULTS);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedFonts = useRef<Set<string>>(new Set(['Inter']));

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AdminConfig;
        setConfig(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Inject Google Fonts link when primaryFont changes
  useEffect(() => {
    const font = config.primaryFont;
    if (font === 'Same as primary' || loadedFonts.current.has(font)) return;
    loadedFonts.current.add(font);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [config.primaryFont]);

  // Save to localStorage + postMessage on config change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
    sendConfigToPreview();
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  function sendConfigToPreview() {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'TONIC_CONFIG_UPDATE', config },
        '*'
      );
    }
  }

  function handleIframeLoad() {
    setIframeReady(true);
    sendConfigToPreview();
  }

  function update<K extends keyof AdminConfig>(key: K, value: AdminConfig[K]) {
    setConfig(c => ({ ...c, [key]: value }));
  }

  async function testConnection() {
    setConnectionStatus('loading');
    setConnectionMessage('');
    try {
      const url = `https://public-rest${config.swimlane}.bullhornstaffing.com:443/rest-services/${config.corpToken}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=id,title&count=1&showTotalMatched=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { total?: number; data?: unknown[] };
      const count = data.total ?? (data.data?.length ?? 0);
      setConnectionStatus('success');
      setConnectionMessage(`Connected — ${count} jobs found`);
    } catch (e: unknown) {
      setConnectionStatus('error');
      setConnectionMessage(
        e instanceof Error ? e.message : 'Connection failed'
      );
    }
  }

  function exportConfig() {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portal-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  function resetToDefaults() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      setConfig(DEFAULTS);
    }
  }

  // Font preview style
  const previewFontFamily =
    config.primaryFont === 'Same as primary'
      ? 'inherit'
      : `'${config.primaryFont}', system-ui, sans-serif`;

  return (
    <div className="flex flex-col h-screen bg-slate-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Top bar ── */}
      <header
        className="bg-white border-b border-gray-100 flex-shrink-0 flex items-center px-5 gap-3"
        style={{ height: '56px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-bold text-gray-900">Portal Admin</div>
            <div className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Configuration</div>
          </div>
        </div>

        {/* Company name badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {config.companyName || 'Unnamed Portal'}
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all hidden sm:block"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={copyConfig}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy JSON
            </>
          )}
        </button>

        <button
          type="button"
          onClick={exportConfig}
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: '#2563EB' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Config
        </button>
      </header>

      {/* ── Main split layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left panel: Form ── */}
        <div
          className="flex flex-col overflow-y-auto"
          style={{ width: '60%', minWidth: 0 }}
        >
          <div className="p-5 space-y-3">

            {/* ── 1. Branding ── */}
            <Section title="Branding" icon={<IconBranding />} defaultOpen={true}>
              <Field label="Company Name">
                <Input
                  value={config.companyName}
                  onChange={v => update('companyName', v)}
                  placeholder="Acme Corp"
                />
              </Field>

              <Field label="Logo URL" hint="Direct link to PNG/SVG">
                <Input
                  value={config.logoUrl}
                  onChange={v => update('logoUrl', v)}
                  placeholder="https://example.com/logo.png"
                />
              </Field>

              <Field label="Favicon URL" hint="32×32 PNG/ICO recommended">
                <Input
                  value={config.faviconUrl}
                  onChange={v => update('faviconUrl', v)}
                  placeholder="https://example.com/favicon.ico"
                />
              </Field>

              <Field label="Page Title Template" hint="Use {{jobTitle}} and {{companyName}}">
                <Input
                  value={config.pageTitleTemplate}
                  onChange={v => update('pageTitleTemplate', v)}
                  placeholder="{{jobTitle}} | {{companyName}} Careers"
                  mono
                />
              </Field>
            </Section>

            {/* ── 2. Typography ── */}
            <Section title="Typography" icon={<IconTypography />} defaultOpen={true}>
              <Field label="Primary Font">
                <Select value={config.primaryFont} onChange={v => update('primaryFont', v)}>
                  {GOOGLE_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Heading Font">
                <Select value={config.headingFont} onChange={v => update('headingFont', v)}>
                  <option value="Same as primary">Same as primary</option>
                  {GOOGLE_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Custom Google Fonts URL" hint="Optional override">
                <Input
                  value={config.customFontUrl}
                  onChange={v => update('customFontUrl', v)}
                  placeholder="https://fonts.googleapis.com/css2?family=..."
                />
              </Field>

              {/* Live font preview */}
              <div className="mt-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Font Preview</p>
                <p
                  className="text-2xl font-bold text-gray-900 mb-1 leading-tight"
                  style={{ fontFamily: previewFontFamily }}
                >
                  Open Positions
                </p>
                <p
                  className="text-sm text-gray-500 leading-relaxed"
                  style={{ fontFamily: previewFontFamily }}
                >
                  Find your next opportunity and grow with a team doing meaningful work.
                </p>
              </div>
            </Section>

            {/* ── 3. Colors ── */}
            <Section title="Colors" icon={<IconColors />} defaultOpen={true}>
              <div className="space-y-3">
                <ColorPicker
                  label="Primary"
                  value={config.primaryColor}
                  onChange={v => update('primaryColor', v)}
                />
                <ColorPicker
                  label="Accent"
                  value={config.accentColor}
                  onChange={v => update('accentColor', v)}
                />
                <ColorPicker
                  label="Background"
                  value={config.backgroundColor}
                  onChange={v => update('backgroundColor', v)}
                />
                <ColorPicker
                  label="Text"
                  value={config.textColor}
                  onChange={v => update('textColor', v)}
                />
              </div>

              {/* Color preview */}
              <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-3">Preview</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Button */}
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    Apply Now
                  </button>
                  {/* Badge */}
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: `${config.accentColor}20`,
                      color: config.accentColor,
                    }}
                  >
                    Full-Time
                  </span>
                  {/* Link */}
                  <span className="text-sm font-medium" style={{ color: config.primaryColor }}>
                    View job →
                  </span>
                </div>
                {/* Card preview */}
                <div
                  className="mt-3 p-3 rounded-xl border text-sm"
                  style={{
                    backgroundColor: config.backgroundColor,
                    color: config.textColor,
                    borderColor: 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="font-semibold text-[13px]">Senior Product Designer</div>
                  <div className="text-xs mt-0.5 opacity-60">San Francisco, CA · Design</div>
                </div>
              </div>

              {/* Swatches */}
              <div className="flex gap-4 mt-1">
                <ColorSwatch color={config.primaryColor} label="Primary" />
                <ColorSwatch color={config.accentColor} label="Accent" />
                <ColorSwatch color={config.backgroundColor} label="BG" />
                <ColorSwatch color={config.textColor} label="Text" />
              </div>
            </Section>

            {/* ── 4. Content ── */}
            <Section title="Content" icon={<IconContent />} defaultOpen={true}>
              <Field label="Hero Heading">
                <Input
                  value={config.heroHeading}
                  onChange={v => update('heroHeading', v)}
                  placeholder="Open Positions"
                />
              </Field>

              <Field label="Hero Subtext">
                <Input
                  value={config.heroSubtext}
                  onChange={v => update('heroSubtext', v)}
                  placeholder="Find your next opportunity"
                />
              </Field>

              <div className="space-y-3 pt-1">
                <Toggle
                  label="Show salary on cards"
                  checked={config.showSalary}
                  onChange={v => update('showSalary', v)}
                />
                <Toggle
                  label="Show employment type badges"
                  checked={config.showEmploymentType}
                  onChange={v => update('showEmploymentType', v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Jobs per page">
                  <Select value={config.jobsPerPage} onChange={v => update('jobsPerPage', Number(v))}>
                    {[6, 9, 12, 15, 20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Default view">
                  <Select value={config.defaultView} onChange={v => update('defaultView', v as 'grid' | 'list')}>
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* ── 5. Apply Form ── */}
            <Section title="Apply Form" icon={<IconApply />} defaultOpen={true}>
              <Field label="Application mode">
                <div className="flex gap-3">
                  {(['quick', 'full'] as const).map(mode => (
                    <label
                      key={mode}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-sm font-medium capitalize ${
                        config.applyMode === mode
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="applyMode"
                        value={mode}
                        checked={config.applyMode === mode}
                        onChange={() => update('applyMode', mode)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          config.applyMode === mode ? 'border-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {config.applyMode === mode && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                        )}
                      </span>
                      {mode === 'quick' ? 'Quick Apply' : 'Full Apply'}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="space-y-3">
                <Toggle
                  label="Résumé required"
                  checked={config.resumeRequired}
                  onChange={v => update('resumeRequired', v)}
                />
                <Toggle
                  label="Show phone field"
                  checked={config.showPhone}
                  onChange={v => update('showPhone', v)}
                />
                <Toggle
                  label="Phone required"
                  checked={config.phoneRequired}
                  onChange={v => update('phoneRequired', v)}
                  description="Only applies when phone field is visible"
                />
              </div>

              <Field label="Privacy policy URL">
                <Input
                  value={config.privacyPolicyUrl}
                  onChange={v => update('privacyPolicyUrl', v)}
                  placeholder="https://yourcompany.com/privacy"
                />
              </Field>

              <Field label="Consent checkbox text">
                <Textarea
                  value={config.consentText}
                  onChange={v => update('consentText', v)}
                  placeholder="I agree to the privacy policy..."
                  rows={2}
                />
              </Field>
            </Section>

            {/* ── 6. Bullhorn Connection ── */}
            <Section title="Bullhorn Connection" icon={<IconBullhorn />} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Swimlane">
                  <Input
                    value={config.swimlane}
                    onChange={v => update('swimlane', v)}
                    placeholder="91"
                    mono
                  />
                </Field>
                <Field label="Corp Token">
                  <Input
                    value={config.corpToken}
                    onChange={v => update('corpToken', v)}
                    placeholder="abc123"
                    mono
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={connectionStatus === 'loading'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: '#2563EB',
                    color: 'white',
                    borderColor: '#2563EB',
                  }}
                >
                  {connectionStatus === 'loading' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Testing…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Test Connection
                    </>
                  )}
                </button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {connectionMessage}
                  </div>
                )}
                {connectionStatus === 'error' && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {connectionMessage}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Uses <span className="font-mono">demo</span> mode when Corp Token is set to <span className="font-mono">"demo"</span>. Set your real swimlane + token to connect live data.
              </p>
            </Section>

            {/* ── 7. SEO & Analytics ── */}
            <Section title="SEO & Analytics" icon={<IconSEO />} defaultOpen={false}>
              <Field label="Google Analytics ID" hint="e.g. G-XXXXXXXXXX">
                <Input
                  value={config.googleAnalyticsId}
                  onChange={v => update('googleAnalyticsId', v)}
                  placeholder="G-XXXXXXXXXX"
                  mono
                />
              </Field>

              <Field label="Meta description">
                <Textarea
                  value={config.metaDescription}
                  onChange={v => update('metaDescription', v)}
                  placeholder="Browse open positions at Acme Corp. Find your next career opportunity today."
                  rows={2}
                />
              </Field>

              <Field label="OG Image URL" hint="1200×630 recommended">
                <Input
                  value={config.ogImageUrl}
                  onChange={v => update('ogImageUrl', v)}
                  placeholder="https://example.com/og-image.png"
                />
              </Field>
            </Section>

            {/* Bottom padding */}
            <div className="h-4" />
          </div>
        </div>

        {/* ── Right panel: Preview ── */}
        <div
          className="flex flex-col border-l border-gray-200"
          style={{ width: '40%', minWidth: 0, backgroundColor: '#e8edf5' }}
        >
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: iframeReady ? '#22c55e' : '#f59e0b' }}
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</span>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              Open portal
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Browser chrome wrapper */}
          <div className="flex-1 p-3 overflow-hidden">
            <div
              className="h-full flex flex-col rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'white',
                boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-2.5 py-1 text-xs text-gray-400 border border-gray-200 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  careers.yourcompany.com
                </div>
              </div>
              {/* Iframe */}
              <iframe
                ref={iframeRef}
                src="/"
                onLoad={handleIframeLoad}
                className="flex-1 w-full"
                title="Portal Preview"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
