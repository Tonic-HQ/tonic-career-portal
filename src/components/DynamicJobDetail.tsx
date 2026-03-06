/**
 * DynamicJobDetail — fetches and renders a job detail page client-side.
 * Used for preview/portal modes where job pages aren't pre-built.
 * Falls back to getJob() which respects runtime config overrides.
 */
import { useState, useEffect } from 'react';
import { getJob, invalidateJobCache } from '../api';
import { getConfigOverride, setConfigOverride, loadConfig } from '../config';
import type { Job } from '../demo-data';
import JobDetailView from './JobDetailView';

function getJobIdFromPath(): number | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/jobs\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Restore portal config from sessionStorage (set by LivePortal or PreviewPage) */
function restorePortalConfig() {
  if (typeof sessionStorage === 'undefined') return;
  // Skip if config is already overridden (same-page navigation)
  if (getConfigOverride()) return;

  try {
    const stored = sessionStorage.getItem('tonic_portal_config');
    if (!stored) return;
    const config = JSON.parse(stored);
    if (!config.corpToken || !config.swimlane) return;

    setConfigOverride({
      companyName: config.companyName,
      companyLogoUrl: config.companyLogoPath || config.companyLogoUrl,
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

    // Apply colors
    const root = document.documentElement;
    if (config.primaryColor) root.style.setProperty('--color-primary', config.primaryColor);
    if (config.linkColor) root.style.setProperty('--color-accent', config.linkColor);
  } catch { /* corrupted data */ }
}

export default function DynamicJobDetail() {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore portal config from sessionStorage if needed
    restorePortalConfig();

    const jobId = getJobIdFromPath();
    if (!jobId) {
      setError('Invalid job ID.');
      setLoading(false);
      return;
    }

    async function fetchJob() {
      try {
        const result = await getJob(jobId!);
        if (!result) {
          setError('Job not found or no longer available.');
          setLoading(false);
          return;
        }
        // Update page title
        const config = loadConfig();
        document.title = `${result.title} | ${config.companyName} Careers`;
        setJob(result);
      } catch {
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-4 skeleton-shimmer rounded w-24 mb-6" />
        <div className="rounded-2xl border border-gray-100 p-8 mb-5">
          <div className="h-6 skeleton-shimmer rounded w-16 mb-4" />
          <div className="h-8 skeleton-shimmer rounded w-2/3 mb-4" />
          <div className="flex gap-3">
            <div className="h-5 skeleton-shimmer rounded w-32" />
            <div className="h-5 skeleton-shimmer rounded w-24" />
            <div className="h-5 skeleton-shimmer rounded w-20" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 p-8">
          <div className="h-6 skeleton-shimmer rounded w-40 mb-5" />
          <div className="space-y-3">
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-4 skeleton-shimmer rounded w-5/6" />
            <div className="h-4 skeleton-shimmer rounded w-4/5" />
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-4 skeleton-shimmer rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    const config = loadConfig();
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="mb-8">
            <div
              className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-sm border border-gray-100"
              style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 100%)' }}
            >
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 80 80" stroke="currentColor" strokeWidth="1.5">
                <rect x="10" y="30" width="60" height="38" rx="6" />
                <path d="M28 30v-6a4 4 0 014-4h16a4 4 0 014 4v6" />
                <line x1="10" y1="50" x2="70" y2="50" />
                <circle cx="40" cy="50" r="3" fill="currentColor" />
                <line x1="25" y1="35" x2="55" y2="65" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
            This position is no longer available
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8 max-w-sm mx-auto">
            It may have been filled or the listing has expired. Don't worry — there are more opportunities waiting for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else window.location.href = '/';
              }}
              className="inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg text-sm"
              style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 14px -2px rgba(37,99,235,0.3)', minHeight: '48px' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Open Positions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <JobDetailView job={job} />;
}
