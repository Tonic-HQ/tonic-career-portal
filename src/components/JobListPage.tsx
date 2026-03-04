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
  'Contract': 'bg-purple-50 text-purple-700 border-purple-100',
  'Temp': 'bg-gray-100 text-gray-700 border-gray-200',
};

function JobCard({ job }: { job: Job }) {
  const locationStr = job.address.state === 'Remote'
    ? 'Remote'
    : `${job.address.city}, ${job.address.state}`;

  const badgeClass = BADGE_COLORS[job.employmentType] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <a
      href={`/jobs/${job.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col gap-4 group hover:border-gray-200"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
          {job.title}
        </h2>
        <svg
          className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locationStr}
        </span>
        <span className="text-gray-200">·</span>
        <span className="text-gray-400">{job.publishedCategory.name}</span>
        <span className="text-gray-200">·</span>
        <span className="text-gray-400">{formatRelativeDate(job.dateLastPublished)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
          {job.employmentType}
        </span>
        {job.salary && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
            {job.salary}
          </span>
        )}
      </div>
    </a>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-3/4 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-100 rounded-full w-20" />
        <div className="h-5 bg-gray-100 rounded-full w-28" />
      </div>
    </div>
  );
}

// Filter options will be derived from actual job data

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

  // On mount — fetch jobs + derive filter options
  useEffect(() => {
    fetchJobs({ query, category, state, employmentType, sort, page });
    getAllJobs().then(allJobs => {
      setAllCategories([...new Set(allJobs.map(j => j.publishedCategory?.name).filter(Boolean))].sort());
      setAllStates([...new Set(allJobs.map(j => j.address?.state).filter(Boolean))].sort());
      setAllTypes([...new Set(allJobs.map(j => j.employmentType).filter(Boolean))].sort());
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On filter/sort/page change (except query which is debounced)
  useEffect(() => {
    setPage(1);
    fetchJobs({ query, category, state, employmentType, sort, page: 1 });
  }, [category, state, employmentType, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Page change
  useEffect(() => {
    fetchJobs({ query, category, state, employmentType, sort, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced query
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
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Open Positions</h1>
        <p className="text-gray-500">Find your next opportunity</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
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
          placeholder="Search jobs by title or keyword..."
          className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white shadow-sm placeholder:text-gray-400"
          aria-label="Search jobs"
        />
        {query && (
          <button
            onClick={() => handleQueryChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700 cursor-pointer"
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
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700 cursor-pointer"
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
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700 cursor-pointer"
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
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700 cursor-pointer"
          aria-label="Sort jobs"
        >
          <option value="date">Sort: Newest First</option>
          <option value="title">Sort: A to Z</option>
        </select>
      </div>

      {/* Results count + clear filters */}
      <div className="flex items-center justify-between mb-4 min-h-[24px]">
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
              <span className="font-medium text-gray-800">{total}</span>
              {' '}
              {total === 1 ? 'position' : 'positions'} found
            </p>
          )}

          {hasActiveFilters && !loading && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6 flex items-center gap-3">
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {/* Briefcase SVG illustration */}
          <svg
            className="w-20 h-20 text-gray-200 mb-5"
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
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No jobs found</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {hasActiveFilters
              ? 'Try adjusting your filters or search terms to find more opportunities.'
              : 'No positions are currently available. Check back soon!'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
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
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {getPaginationPages(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors border ${
                  page === p
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
}
