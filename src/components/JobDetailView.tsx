import { useState, useEffect } from 'react';
import type { Job } from '../demo-data';
import { loadConfig } from '../config';
import ApplyModal from './ApplyModal';
import { consumeLinkedInProfile } from '../utils/linkedin';
import type { LinkedInProfile } from '../utils/linkedin';
import { captureAttribution } from '../utils/attribution';

interface Props {
  job: Job;
}

function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  if (days < 365)
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`;
}

const BADGE_COLORS: Record<string, string> = {
  'Full-Time': 'bg-blue-50 text-blue-700 border-blue-100',
  'Part-Time': 'bg-amber-50 text-amber-700 border-amber-100',
  Contract: 'bg-violet-50 text-violet-700 border-violet-100',
  Temp: 'bg-slate-100 text-slate-600 border-slate-200',
};

const BENEFIT_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-100',
  'bg-rose-50 text-rose-700 border-rose-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-teal-50 text-teal-700 border-teal-100',
];

export default function JobDetailView({ job }: Props) {
  const config = loadConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);

  useEffect(() => {
    // Capture attribution
    captureAttribution();

    if (typeof localStorage !== 'undefined') {
      setAlreadyApplied(localStorage.getItem(`applied_${job.id}`) === 'true');
    }
    // Check for native share support (mobile)
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);

    // Check for LinkedIn profile from OAuth callback
    const profile = consumeLinkedInProfile();
    if (profile) {
      setLinkedInProfile(profile);
      // Auto-open the apply modal with pre-filled data
      setIsModalOpen(true);
    }
  }, [job.id]);

  function handleModalClose() {
    setIsModalOpen(false);
    if (typeof localStorage !== 'undefined') {
      setAlreadyApplied(localStorage.getItem(`applied_${job.id}`) === 'true');
    }
  }

  function handleCopyLink() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} — ${job.publishedCategory.name}`,
          text: `Check out this job opportunity: ${job.title}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    }
  }

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }

  const locationParts = [job.address.city, job.address.state].filter(Boolean);
  const locationStr = job.address.state === 'Remote'
    ? 'Remote'
    : locationParts.length > 0 ? locationParts.join(', ') : '';

  const badgeClass = BADGE_COLORS[job.employmentType] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = encodeURIComponent(`${job.title}${job.address.city ? ` at ${job.address.city}` : ''}`);

  return (
    <>
      {/* Main content — add bottom padding on mobile for sticky footer */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-8">
        {/* Back navigation */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors mb-6 group"
          style={{ minHeight: '44px' }}
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Jobs
        </button>

        {/* Already applied banner */}
        {alreadyApplied && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-800 text-sm">
                You've already applied to this position
              </p>
              <p className="text-emerald-600 text-xs mt-0.5 font-light">
                We'll review your application and be in touch soon.
              </p>
            </div>
          </div>
        )}

        {/* Job header card */}
        <div
          className="rounded-2xl border border-blue-100/80 shadow-sm p-5 sm:p-8 mb-5 overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, rgba(239,246,255,0.8) 0%, rgba(255,255,255,1) 60%)',
          }}
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-[0.04]"
            style={{ backgroundColor: 'var(--color-primary)' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeClass} mb-3`}
                >
                  {job.employmentType}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                  {job.title}
                </h1>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {locationStr && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: 'var(--color-primary)', opacity: 0.7 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {locationStr}
                </span>
                )}

                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: 'var(--color-primary)', opacity: 0.7 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {job.publishedCategory.name}
                </span>

                {job.salary && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-emerald-500 text-white shadow-sm shadow-emerald-200">
                    <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.salary}
                  </span>
                )}

                <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Posted {formatDate(job.dateLastPublished)}
                </span>
              </div>
            </div>

            {/* Apply CTA — desktop only (mobile uses sticky footer) */}
            <div className="hidden sm:block flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 4px 14px -2px rgba(37,99,235,0.35)',
                }}
              >
                Apply Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Job description */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8 mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-primary)' }} />
            Job Description
          </h2>
          <div
            className="text-gray-600 leading-[1.8] [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mt-2 [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1.5 [&>ul>li]:text-gray-600 [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-7 [&>h3]:mb-3 [&>h3]:text-base [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-7 [&>h2]:mb-3 [&>strong]:text-gray-800 [&>strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: job.publicDescription }}
          />

          {job.benefits && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.1em] flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-accent)' }} />
                Benefits &amp; Perks
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.benefits.split(',').map((benefit, i) => (
                  <span
                    key={benefit.trim()}
                    className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border ${BENEFIT_COLORS[i % BENEFIT_COLORS.length]}`}
                  >
                    {benefit.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.clientCorporation?.companyDescription && !config.hideClientName && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.1em] flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-accent)' }} />
                About {job.clientCorporation.name || 'the Company'}
              </h3>
              <div
                className="text-gray-600 leading-[1.8] [&>p]:mb-4 [&>p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: job.clientCorporation.companyDescription }}
              />
            </div>
          )}

          {config.jobDescriptionFooter && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div
                className="text-gray-500 text-sm leading-[1.8] [&>p]:mb-3 [&>p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: config.jobDescriptionFooter }}
              />
            </div>
          )}
        </div>

        {/* Share section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Share this opportunity</h3>
              <p className="text-xs text-gray-400 font-light mt-0.5">Help someone find their next role</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Native share on mobile */}
              {canNativeShare ? (
                <button
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  style={{ minHeight: '44px' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              ) : (
                <>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${shareTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    aria-label="Share on LinkedIn"
                  >
                    <svg className="w-4 h-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    aria-label="Share on X (Twitter)"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share
                  </a>
                </>
              )}

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                aria-label="Copy link to job"
                style={{ minHeight: '44px' }}
              >
                {linkCopied ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom CTA — hidden on mobile (sticky footer used instead) */}
        <div
          className="hidden sm:block rounded-2xl p-10 text-center overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #1d4ed8 60%, #1e3a8a 100%)' }}
        >
          <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-white opacity-[0.04]" />
          <div className="absolute -right-8 -top-8 w-52 h-52 rounded-full bg-white opacity-[0.04]" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/80 text-xs font-medium mb-4">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {job.publishedCategory.name}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Ready to join the team?</h3>
            <p className="text-blue-200 text-sm mb-7 font-light max-w-sm mx-auto leading-relaxed">
              We're looking for a {job.title} to work with us
              {job.address.state === 'Remote' ? ' remotely' : locationStr ? ` in ${locationStr}` : ''}.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/25 text-sm"
              style={{ color: 'var(--color-primary)' }}
            >
              Apply Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky Apply footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white border-t border-gray-200 px-4 pt-3 pb-3 pb-safe"
        style={{ boxShadow: '0 -4px 24px -4px rgba(0,0,0,0.1)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
          style={{
            backgroundColor: 'var(--color-primary)',
            boxShadow: '0 4px 14px -2px rgba(37,99,235,0.35)',
            minHeight: '52px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {alreadyApplied ? 'Apply Again' : 'Apply Now'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      <ApplyModal jobId={job.id} jobTitle={job.title} isOpen={isModalOpen} onClose={handleModalClose} linkedInProfile={linkedInProfile} />
    </>
  );
}
