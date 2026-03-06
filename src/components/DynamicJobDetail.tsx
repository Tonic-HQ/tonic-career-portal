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
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Job not found</h1>
        <p className="text-sm text-gray-500 mb-6">{error || 'This position may have been filled or removed.'}</p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          ← Back to Jobs
        </button>
      </div>
    );
  }

  return <JobDetailView job={job} />;
}
