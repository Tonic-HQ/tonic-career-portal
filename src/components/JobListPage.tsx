import { useState, useEffect, useCallback, useRef } from 'react';
import { searchJobs, getAllJobs } from '../api';
import type { Job } from '../demo-data';

function formatCardDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface FilterCounts {
  categories: Record<string, number>;
  states: Record<string, number>;
  cities: Record<string, number>;
}

function computeCounts(jobs: Job[]): FilterCounts {
  const categories: Record<string, number> = {};
  const states: Record<string, number> = {};
  const cities: Record<string, number> = {};
  for (const job of jobs) {
    const cat = job.publishedCategory?.name;
    if (cat) categories[cat] = (categories[cat] ?? 0) + 1;
    const st = job.address?.state;
    if (st) states[st] = (states[st] ?? 0) + 1;
    const city = job.address?.city;
    if (city && city !== job.address?.state) cities[city] = (cities[city] ?? 0) + 1;
  }
  return { categories, states, cities };
}

function JobCard({ job }: { job: Job }) {
  const locationStr =
    job.address.state === 'Remote'
      ? 'Remote'
      : `${job.address.city}, ${job.address.state}`;
  const descriptionPreview = stripHtml(job.publicDescription);

  return (
    <a
      href={`/jobs/${job.id}`}
      className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-5 hover:border-gray-300 group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2
            className="text-[15px] font-semibold group-hover:underline leading-snug"
            style={{ color: 'var(--color-primary)' }}
          >
            {job.title}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-primary)', opacity: 0.7 }}>
            {job.publishedCategory.name}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-nowrap">
            <svg
              className="w-3 h-3 flex-shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locationStr}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600 whitespace-nowrap">
            {job.employmentType}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-500 whitespace-nowrap">
            {formatCardDate(job.dateLastPublished)}
          </span>
        </div>
      </div>

      {descriptionPreview && (
        <p className="mt-2.5 text-sm text-gray-500 leading-relaxed line-clamp-2">{descriptionPreview}</p>
      )}
    </a>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex-1">
          <div className="h-4 skeleton-shimmer rounded w-2/3 mb-1.5" />
          <div className="h-3 skeleton-shimmer rounded w-1/4" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 skeleton-shimmer rounded w-24" />
          <div className="h-6 skeleton-shimmer rounded w-16" />
          <div className="h-6 skeleton-shimmer rounded w-20" />
        </div>
      </div>
      <div className="h-3 skeleton-shimmer rounded w-full mb-1.5" />
      <div className="h-3 skeleton-shimmer rounded w-4/5" />
    </div>
  );
}

function FilterSection({
  title,
  options,
  counts,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{title}</h3>
      <ul className="space-y-0.5">
        {options.map((option) => {
          const isChecked = selected.includes(option);
          return (
            <li key={option}>
              <label className="flex items-center gap-2.5 cursor-pointer group py-1 px-1 rounded-md hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(option)}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span
                  className={`text-sm flex-1 transition-colors ${
                    isChecked ? 'font-semibold' : 'text-gray-600 group-hover:text-gray-900'
                  }`}
                  style={isChecked ? { color: 'var(--color-primary)' } : undefined}
                >
                  {option}
                </span>
                {counts[option] != null && (
                  <span className="text-xs text-gray-400 tabular-nums">({counts[option]})</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function JobListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    categories: {},
    states: {},
    cities: {},
  });
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobs = useCallback(
    async (params: { query: string; categories: string[]; states: string[]; cities: string[]; page: number }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchJobs({
          query: params.query || undefined,
          categories: params.categories.length > 0 ? params.categories : undefined,
          states: params.states.length > 0 ? params.states : undefined,
          cities: params.cities.length > 0 ? params.cities : undefined,
          sort: 'date',
          page: params.page,
          pageSize: PAGE_SIZE,
        });
        setJobs(result.jobs);
        setTotal(result.total);
      } catch {
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchJobs({ query, categories, states, cities, page });
    getAllJobs().then((all) => {
      const counts = computeCounts(all);
      setFilterCounts(counts);
      setAllCategories(Object.keys(counts.categories).sort());
      setAllStates(Object.keys(counts.states).sort());
      setAllCities(Object.keys(counts.cities).sort());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    fetchJobs({ query, categories, states, cities, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, states, cities]);

  useEffect(() => {
    fetchJobs({ query, categories, states, cities, page });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchJobs({ query: value, categories, states, cities, page: 1 });
    }, 300);
  }

  function clearFilters() {
    setQuery('');
    setCategories([]);
    setStates([]);
    setCities([]);
    setPage(1);
    fetchJobs({ query: '', categories: [], states: [], cities: [], page: 1 });
  }

  const hasActiveFilters = Boolean(query || categories.length || states.length || cities.length);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filterPanel = (
    <div className="w-full">
      {/* Keyword search */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white placeholder:text-gray-400 transition-all"
            aria-label="Search jobs"
          />
        </div>
      </div>

      <FilterSection
        title="Filter by Category"
        options={allCategories}
        counts={filterCounts.categories}
        selected={categories}
        onToggle={v => { setCategories(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); setPage(1); }}
      />
      <FilterSection
        title="Filter by State"
        options={allStates}
        counts={filterCounts.states}
        selected={states}
        onToggle={v => { setStates(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); setPage(1); }}
      />
      <FilterSection
        title="Filter by City"
        options={allCities}
        counts={filterCounts.cities}
        selected={cities}
        onToggle={v => { setCities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]); setPage(1); }}
      />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full text-sm font-semibold py-2 px-4 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all mt-2"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Mobile sticky top bar */}
      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="relative flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            style={{ minHeight: '44px' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {categories.length + states.length + cities.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">{filterPanel}</div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Open Positions
                {!loading && (
                  <span className="ml-2 text-base font-normal text-gray-500">({total})</span>
                )}
                {loading && (
                  <span className="ml-2 inline-flex items-center">
                    <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                )}
              </h2>
              {hasActiveFilters && !loading && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Job list */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingCard key={i} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 80 80" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="10" y="30" width="60" height="38" rx="6" />
                    <path d="M28 30v-6a4 4 0 014-4h16a4 4 0 014 4v6" />
                    <line x1="10" y1="50" x2="70" y2="50" />
                    <circle cx="40" cy="50" r="3" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">No positions found</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  {hasActiveFilters
                    ? 'Try adjusting your filters or search terms.'
                    : 'No positions are currently available. Check back soon!'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-all"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all border ${
                      page === p
                        ? 'text-white border-transparent shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{
                      minHeight: '44px',
                      minWidth: '44px',
                      ...(page === p ? { backgroundColor: 'var(--color-primary)' } : {}),
                    }}
                    aria-label={`Page ${p}`}
                    aria-current={page === p ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">{filterPanel}</div>
            <div className="px-5 py-4 border-t border-gray-100 pb-safe">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all"
                style={{ backgroundColor: 'var(--color-primary)', minHeight: '44px' }}
              >
                Show {total > 0 ? `${total} ` : ''}Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
