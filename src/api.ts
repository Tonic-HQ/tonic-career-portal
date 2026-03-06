import type { Job } from './demo-data';
import { DEMO_JOBS } from './demo-data';
import { loadConfig } from './config';

export interface SearchParams {
  query?: string;
  categories?: string[];
  states?: string[];
  cities?: string[];
  employmentTypes?: string[];
  sort?: 'date' | 'title';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  jobs: Job[];
  total: number;
}

function normalizeBullhornJob(raw: any): Job {
  return {
    id: raw.id,
    title: raw.title ?? 'Untitled Position',
    publishedCategory: raw.publishedCategory ?? { id: 0, name: 'General' },
    address: {
      city: raw.address?.city ?? '',
      state: raw.address?.state ?? '',
      country: raw.address?.countryName ?? raw.address?.country ?? 'US',
    },
    employmentType: raw.employmentType ?? 'Full-Time',
    salary: raw.salary && raw.salary > 0
      ? (raw.salaryUnit ? `$${raw.salary}/${raw.salaryUnit}` : `$${Number(raw.salary).toLocaleString()}`)
      : '',
    dateLastPublished: raw.dateLastPublished ?? Date.now(),
    publicDescription: raw.publicDescription ?? '',
    benefits: raw.benefits ?? '',
  };
}

// Cache all jobs in memory to avoid re-fetching on every filter change
let _allJobsCache: Job[] | null = null;
let _allJobsCacheTime = 0;
let _allJobsCacheKey = ''; // track which corpToken+swimlane the cache is for
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function invalidateJobCache() {
  _allJobsCache = null;
  _allJobsCacheTime = 0;
  _allJobsCacheKey = '';
}

export async function getAllJobs(): Promise<Job[]> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    return DEMO_JOBS;
  }

  const cacheKey = `${config.service.corpToken}:${config.service.swimlane}`;
  const now = Date.now();

  // Invalidate if config changed or window flag set
  if (typeof window !== 'undefined' && (window as any).__tonicJobCacheInvalid) {
    _allJobsCache = null;
    _allJobsCacheTime = 0;
    (window as any).__tonicJobCacheInvalid = false;
  }

  if (_allJobsCache && (now - _allJobsCacheTime) < CACHE_TTL && _allJobsCacheKey === cacheKey) {
    return _allJobsCache;
  }

  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const url = `${base}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=${config.service.fields}&count=500&sort=-dateLastPublished&showTotalMatched=true`;
  const res = await fetch(url);
  const data = await res.json() as { data?: any[] };
  _allJobsCache = (data.data ?? []).map(normalizeBullhornJob);
  _allJobsCacheTime = now;
  _allJobsCacheKey = cacheKey;
  return _allJobsCache;
}

// All filtering happens client-side since Bullhorn's public search API
// doesn't support nested field filtering (publishedCategory.name, address.state, etc.)
export async function searchJobs(params: SearchParams): Promise<SearchResult> {
  let jobs = await getAllJobs();

  // Keyword search
  if (params.query) {
    const q = params.query.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.publicDescription.toLowerCase().includes(q)
    );
  }

  // Multi-select filters — if any values selected, job must match one of them
  if (params.categories && params.categories.length > 0) {
    jobs = jobs.filter(j => params.categories!.includes(j.publishedCategory?.name));
  }
  if (params.states && params.states.length > 0) {
    jobs = jobs.filter(j => params.states!.includes(j.address?.state));
  }
  if (params.cities && params.cities.length > 0) {
    jobs = jobs.filter(j => params.cities!.includes(j.address?.city));
  }
  if (params.employmentTypes && params.employmentTypes.length > 0) {
    jobs = jobs.filter(j => params.employmentTypes!.includes(j.employmentType));
  }

  // Sort
  if (params.sort === 'title') {
    jobs.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    jobs.sort((a, b) => b.dateLastPublished - a.dateLastPublished);
  }

  const total = jobs.length;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const paged = jobs.slice((page - 1) * pageSize, page * pageSize);

  return { jobs: paged, total };
}

export async function getJob(id: number): Promise<Job | null> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    return DEMO_JOBS.find(j => j.id === id) ?? null;
  }
  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const url = `${base}/query/JobBoardPost?where=(id=${id})&fields=${config.service.fields}`;
  const res = await fetch(url);
  const data = await res.json() as { data?: any[] };
  if (!data.data?.[0]) return null;
  return normalizeBullhornJob(data.data[0]);
}

export async function submitApplication(jobId: number, formData: FormData): Promise<void> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    await new Promise(r => setTimeout(r, 1000));
    return;
  }
  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = (formData.get('phone') as string) ?? '';
  const url = `${base}/apply/${jobId}/raw?externalID=Resume&type=Resume&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&format=txt`;
  await fetch(url, { method: 'POST', body: formData });
}
