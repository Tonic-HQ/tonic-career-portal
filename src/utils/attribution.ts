/**
 * Attribution capture — tracks how candidates find job listings.
 * Captures UTM params, referrer, landing page, device info on first visit.
 * Persists in sessionStorage. Attached to application submissions.
 */

export interface Attribution {
  source: string;       // google, linkedin, indeed, direct, referral
  medium: string;       // organic, cpc, social, email, (none)
  campaign: string;     // UTM campaign name
  content: string;      // UTM content (e.g., specific ad or post)
  term: string;         // UTM term (search keyword)
  referrer: string;     // full referrer URL
  landingPage: string;  // first page they saw
  landingJobId: string; // job ID if they landed on a job page
  device: string;       // mobile, tablet, desktop
  platform: string;     // iOS, Android, Windows, macOS, Linux, other
  browser: string;      // Chrome, Safari, Firefox, Edge, other
  timestamp: string;    // ISO timestamp of first visit
}

const STORAGE_KEY = 'tonic_attribution';

/** Detect device type from user agent */
function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua)) return 'tablet';
  if (/Mobile|iPhone|Android.*Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Detect platform */
function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'other';
}

/** Detect browser */
function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  return 'other';
}

/** Infer source from referrer when no UTM params present */
function inferSource(referrer: string): { source: string; medium: string } {
  if (!referrer) return { source: 'direct', medium: '(none)' };

  const domain = referrer.toLowerCase();

  if (domain.includes('google.')) return { source: 'google', medium: 'organic' };
  if (domain.includes('bing.')) return { source: 'bing', medium: 'organic' };
  if (domain.includes('yahoo.')) return { source: 'yahoo', medium: 'organic' };
  if (domain.includes('duckduckgo.')) return { source: 'duckduckgo', medium: 'organic' };

  if (domain.includes('linkedin.')) return { source: 'linkedin', medium: 'social' };
  if (domain.includes('facebook.') || domain.includes('fb.')) return { source: 'facebook', medium: 'social' };
  if (domain.includes('twitter.') || domain.includes('t.co') || domain.includes('x.com')) return { source: 'twitter', medium: 'social' };
  if (domain.includes('instagram.')) return { source: 'instagram', medium: 'social' };

  if (domain.includes('indeed.')) return { source: 'indeed', medium: 'referral' };
  if (domain.includes('glassdoor.')) return { source: 'glassdoor', medium: 'referral' };
  if (domain.includes('ziprecruiter.')) return { source: 'ziprecruiter', medium: 'referral' };

  return { source: 'referral', medium: 'referral' };
}

/** Extract job ID from current URL path */
function extractJobId(): string {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/\/jobs\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Capture attribution data on first page load.
 * Call this once when the portal loads. It only writes on the first visit
 * (doesn't overwrite if attribution already captured in this session).
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;

  // Don't overwrite existing attribution (first touch wins)
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || '';

  // UTM params take priority over inferred source
  const utmSource = params.get('utm_source') || '';
  const utmMedium = params.get('utm_medium') || '';
  const utmCampaign = params.get('utm_campaign') || '';
  const utmContent = params.get('utm_content') || '';
  const utmTerm = params.get('utm_term') || '';

  const inferred = inferSource(referrer);

  const attribution: Attribution = {
    source: utmSource || inferred.source,
    medium: utmMedium || inferred.medium,
    campaign: utmCampaign,
    content: utmContent,
    term: utmTerm,
    referrer,
    landingPage: window.location.pathname,
    landingJobId: extractJobId(),
    device: detectDevice(),
    platform: detectPlatform(),
    browser: detectBrowser(),
    timestamp: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch { /* quota exceeded */ }
}

// ── Session Activity Tracking ──

const ACTIVITY_KEY = 'tonic_session_activity';

interface SessionActivity {
  jobsViewed: { id: number; title: string; viewedAt: string }[];
  pageViews: number;
  sessionStart: string;
}

function getActivity(): SessionActivity {
  if (typeof sessionStorage === 'undefined') return { jobsViewed: [], pageViews: 0, sessionStart: new Date().toISOString() };
  try {
    const stored = sessionStorage.getItem(ACTIVITY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { jobsViewed: [], pageViews: 0, sessionStart: new Date().toISOString() };
}

function saveActivity(activity: SessionActivity) {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity)); } catch { /* */ }
}

/** Track a page view. Call on every page/route change. */
export function trackPageView(): void {
  const activity = getActivity();
  activity.pageViews++;
  saveActivity(activity);
}

/** Track a job view. Call when a job detail page loads. */
export function trackJobView(jobId: number, title: string): void {
  const activity = getActivity();
  // Don't duplicate if they already viewed this job
  if (!activity.jobsViewed.some(j => j.id === jobId)) {
    activity.jobsViewed.push({ id: jobId, title, viewedAt: new Date().toISOString() });
  }
  saveActivity(activity);
}

/** Get session duration in minutes */
export function getSessionDuration(): number {
  const activity = getActivity();
  const start = new Date(activity.sessionStart).getTime();
  const now = Date.now();
  return Math.round((now - start) / 60000);
}

/** Format session activity for application summary */
export function formatSessionActivity(): string {
  const activity = getActivity();
  const duration = getSessionDuration();
  const lines: string[] = [];

  lines.push(`Time on site: ${duration < 1 ? 'Less than 1 minute' : `${duration} minute${duration === 1 ? '' : 's'}`}`);
  lines.push(`Pages viewed: ${activity.pageViews}`);

  if (activity.jobsViewed.length > 0) {
    lines.push(`Jobs viewed (${activity.jobsViewed.length}):`);
    for (const job of activity.jobsViewed) {
      lines.push(`  - ${job.title} (#${job.id})`);
    }
  }

  return lines.join('\n');
}

/** Retrieve stored attribution data */
export function getAttribution(): Attribution | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/** Format attribution as a human-readable string for Bullhorn notes */
export function formatAttributionNote(attr: Attribution): string {
  const parts: string[] = [];
  parts.push(`Source: ${attr.source}`);
  parts.push(`Medium: ${attr.medium}`);
  if (attr.campaign) parts.push(`Campaign: ${attr.campaign}`);
  if (attr.content) parts.push(`Content: ${attr.content}`);
  if (attr.term) parts.push(`Term: ${attr.term}`);
  parts.push(`Device: ${attr.device} (${attr.platform}, ${attr.browser})`);
  parts.push(`Landing: ${attr.landingPage}`);
  if (attr.referrer) parts.push(`Referrer: ${attr.referrer}`);
  parts.push(`First visit: ${new Date(attr.timestamp).toLocaleString()}`);
  return parts.join(' | ');
}
