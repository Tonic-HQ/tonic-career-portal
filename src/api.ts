import type { Job } from './demo-data';
import { DEMO_JOBS } from './demo-data';
import { loadConfig } from './config';

export interface SearchParams {
  query?: string;
  category?: string;
  state?: string;
  city?: string;
  employmentType?: string;
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

export async function searchJobs(params: SearchParams): Promise<SearchResult> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    return searchJobsDemo(params);
  }
  return searchJobsBullhorn(params, config);
}

export async function getJob(id: number): Promise<Job | null> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    return DEMO_JOBS.find(j => j.id === id) ?? null;
  }
  return getJobBullhorn(id, config);
}

export async function getAllJobs(): Promise<Job[]> {
  const config = loadConfig();
  if (config.service.corpToken === 'demo') {
    return DEMO_JOBS;
  }
  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const url = `${base}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=${config.service.fields}&count=500&sort=-dateLastPublished&showTotalMatched=true`;
  const res = await fetch(url);
  const data = await res.json() as { data?: any[] };
  return (data.data ?? []).map(normalizeBullhornJob);
}

function searchJobsDemo(params: SearchParams): SearchResult {
  let jobs = [...DEMO_JOBS];
  if (params.query) {
    const q = params.query.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.publicDescription.toLowerCase().includes(q)
    );
  }
  if (params.category) jobs = jobs.filter(j => j.publishedCategory.name === params.category);
  if (params.state) jobs = jobs.filter(j => j.address.state === params.state);
  if (params.city) jobs = jobs.filter(j => j.address.city === params.city);
  if (params.employmentType) jobs = jobs.filter(j => j.employmentType === params.employmentType);
  if (params.sort === 'title') jobs.sort((a, b) => a.title.localeCompare(b.title));
  else jobs.sort((a, b) => b.dateLastPublished - a.dateLastPublished);
  const total = jobs.length;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  jobs = jobs.slice((page - 1) * pageSize, page * pageSize);
  return { jobs, total };
}

async function searchJobsBullhorn(params: SearchParams, config: ReturnType<typeof loadConfig>): Promise<SearchResult> {
  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const start = ((params.page ?? 1) - 1) * (params.pageSize ?? 20);
  const sort = params.sort === 'title' ? 'title' : '-dateLastPublished';

  let query = '(isOpen:1) AND (isDeleted:0)';
  if (params.query) query += ` AND (title:${params.query} OR publicDescription:${params.query})`;
  if (params.category) query += ` AND (publishedCategory.name:"${params.category}")`;
  if (params.state) query += ` AND (address.state:"${params.state}")`;
  if (params.city) query += ` AND (address.city:"${params.city}")`;
  if (params.employmentType) query += ` AND (employmentType:"${params.employmentType}")`;

  const url = `${base}/search/JobOrder?query=${encodeURIComponent(query)}&fields=${config.service.fields}&count=${params.pageSize ?? 20}&start=${start}&sort=${sort}&showTotalMatched=true`;
  const res = await fetch(url);
  const data = await res.json() as { data?: any[]; total?: number };
  return {
    jobs: (data.data ?? []).map(normalizeBullhornJob),
    total: data.total ?? 0,
  };
}

async function getJobBullhorn(id: number, config: ReturnType<typeof loadConfig>): Promise<Job | null> {
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
