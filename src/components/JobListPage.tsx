import { useState, useEffect, useCallback, useRef } from 'react';
import { searchJobs } from '../api';
import type { Job } from '../demo-data';
import { getAllJobs } from '../api';

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const BADGE_COLORS: Record<string, string> = {
  'Full-Time': 'bg-blue-50 text-blue-700 border-blue-100',
  'Part-Time': 'bg-amber-50 text-amber-700 border-amber-100',
  'Contract': 'bg-violet-50 text-violet-700 border-violet-100',
  'Temp': 'bg-slate-100 text-slate-600 border-slate-200',
};

// Category-based avatar colors for visual variety
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
  'linear-gradient(135deg, #059669 0%, #047857 100%)',
  'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
];

function getCategoryGradient(categoryName: string): string {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function JobCard({ job }: { job: Job }) {
  const locationStr = job.address.state === 'Remote'
    ? 'Remote'
    : `${job.address.city}, ${job.address.state}`;

  const badgeClass = BADGE_COLORS[job.employmentType] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const avatarGradient = getCategoryGradient(job.publishedCategory.name ?? 'Job');
  const categoryInitial = (job.publishedCategory.name ?? 'J')[0].toUpperCase();

  return (
    <a
      href={`/jobs/${job.id}`}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col gap-4 hover:border-gray-200 hover:-translate-y-1 overflow-hidden"
    >
      {/* Left accent line — slides in on hover */}
      <div
        className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ backgroundColor: 'var(--color-primary)' }}
      />

      {/* Header: avatar + title + arrow */}
      <div className="flex items-start gap-3.5">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{ background: avatarGradient }}
        >
          {categoryInitial}
        </div>

        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {job.title}
          </h2>
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-primary flex-shrink-0 mt-0.5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-gray-400 tracking-wide uppercase">
        <span className="flex items-center gap-1 normal-case text-[12px] font-normal tracking-normal text-gray-500">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locationStr}
        </span>
        <span className="text-gray-200">·</span>
        <span className="normal-case text-[12px] font-normal tracking-normal text-gray-400">{job.publishedCategory.name}</span>
        <span className="text-gray-200">·</span>
        <span className="normal-case text-[12px] font-normal tracking-normal text-gray-400">{formatRelativeDate(job.dateLastPublished)}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeClass}`}>
          {job.employmentType}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white shadow-sm shadow-emerald-200">
            <svg className="w-3 h-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.salary}
          </span>
        )}
      </div>
    </a>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-hidden">
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 skeleton-shimmer rounded-lg w-3/4 mb-2" />
          <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
        </div>
      </div>
      <div className="h-3 skeleton-shimmer rounded-lg w-2/3 mb-5" />
      <div className="flex gap-2">
        <div className="h-6 skeleton-shimmer rounded-lg w-20" />
        <div className="h-6 skeleton-shimmer rounded-lg w-24" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 9;

export default function JobListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [sort, setSort] = useState<'date' | 'title'>('date');
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchJobs = useCallback(async (params: {
    query: string;
    category: string;
    state: string;
    employmentType: string;
    sort: 'date' | 'title';
    page: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchJobs({
        query: params.query || undefined,
        category: params.category || undefined,
        state: params.state || undefined,
        employmentType: params.employmentType || undefined,
        sort: params.sort,
        page: params.page,
        pageSize: PAGE_SIZE,
      });
      setJobs(result.jobs);
      setTotal(result.total);
    } catch (e) {
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs({ query, category, state, employmentType, sort, page });
    getAllJobs().then(allJobs => {
      setAllCategories([...new Set(allJobs.map(j => j.publishedCategory?.name).filter(Boolean))].sort());
      setAllStates([...new Set(allJobs.map(j => j.address?.state).filter(Boolean))].sort());
      setAllTypes([...new Set(allJobs.map(j => j.employmentType).filter(Boolean))].sort());
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    fetchJobs({ query, category, state, employmentType, sort, page: 1 });
  }, [category, state, employmentType, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchJobs({ query, category, state, employmentType, sort, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchJobs({ query: value, category, state, employmentType, sort, page: 1 });
    }, 300);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function getPaginationPages(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  }

  const hasActiveFilters = Boolean(query || category || state || employmentType);

  function clearFilters() {
    setQuery('');
    setCategory('');
    setState('');
    setEmploymentType('');
    setSort('date');
    setPage(1);
    fetchJobs({ query: '', category: '', state: '', employmentType: '', sort: 'date', page: 1 });
  }

  return (
    <div>
      {/* Hero section — full-width gradient */}
      <div
        className="relative overflow-hidden border-b border-gray-100"
        style={{ background: 'linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(240,249,255,0.5) 50%, rgba(248,250,252,0) 100%)' }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-10">
          <div className="max-w-2xl">
            {/* "Now Hiring" pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ backgroundColor: 'rgba(37,99,235,0.07)', color: 'var(--color-primary)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--color-primary)', animation: 'pulse-dot 2s ease-in-out infinite' }}
              />
              Now Hiring
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-none mb-3">
              Open Positions
            </h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed">
              Find your next opportunity and grow with a team doing meaningful work.
            </p>
          </div>

          {/* Search bar — inside the hero */}
          <div className="mt-8 max-w-2xl relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'var(--color-primary)', opacity: 0.5 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search jobs by title, keyword, or location..."
              className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400 transition-all"
              style={{
                boxShadow: '0 4px 24px -4px rgba(37,99,235,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)',
              }}
              onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1), 0 4px 24px -4px rgba(37,99,235,0.15), 0 2px 8px -2px rgba(0,0,0,0.06)'; }}
              onBlur={e => { e.currentTarget.style.boxShadow = '0 4px 24px -4px rgba(37,99,235,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)'; }}
              aria-label="Search jobs"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters + grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mb-5">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-600 cursor-pointer transition-colors hover:border-gray-300"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {allCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-600 cursor-pointer transition-colors hover:border-gray-300"
            aria-label="Filter by location"
          >
            <option value="">All Locations</option>
            {allStates.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={employmentType}
            onChange={e => setEmploymentType(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-600 cursor-pointer transition-colors hover:border-gray-300"
            aria-label="Filter by employment type"
          >
            <option value="">All Types</option>
            {allTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="flex-1" />

          <select
            value={sort}
            onChange={e => setSort(e.target.value as 'date' | 'title')}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-600 cursor-pointer transition-colors hover:border-gray-300"
            aria-label="Sort jobs"
          >
            <option value="date">Newest First</option>
            <option value="title">A to Z</option>
          </select>
        </div>

        {/* Results count + clear filters */}
        <div className="flex items-center justify-between mb-5 min-h-[24px]">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{total}</span>
                {' '}
                {total === 1 ? 'position' : 'positions'} found
              </p>
            )}

            {hasActiveFilters && !loading && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:bg-blue-50"
                style={{ color: 'var(--color-primary)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Job grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                viewBox="0 0 80 80"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="10" y="30" width="60" height="38" rx="6" />
                <path d="M28 30v-6a4 4 0 014-4h16a4 4 0 014 4v6" />
                <line x1="10" y1="50" x2="70" y2="50" />
                <circle cx="40" cy="50" r="3" fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1.5">No positions found</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              {hasActiveFilters
                ? 'Try adjusting your filters or search terms to find more opportunities.'
                : 'No positions are currently available. Check back soon!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:bg-blue-50"
                style={{ color: 'var(--color-primary)' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {getPaginationPages(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
                  ···
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-semibold transition-all border ${
                    page === p
                      ? 'text-white border-transparent shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  style={page === p ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : undefined}
                  aria-label={`Page ${p}`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
