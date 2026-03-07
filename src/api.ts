import type { Job } from './demo-data';
import { DEMO_JOBS } from './demo-data';
import { loadConfig } from './config';

export interface SearchParams {
  query?: string;
  categories?: string[];
  states?: string[];
  cities?: string[];
  employmentTypes?: string[];
  onSiteOptions?: string[];
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
      zip: raw.address?.zip ?? '',
    },
    employmentType: raw.employmentType ?? 'Full-Time',
    salary: raw.salary && raw.salary > 0
      ? (raw.salaryUnit ? `$${raw.salary}/${raw.salaryUnit}` : `$${Number(raw.salary).toLocaleString()}`)
      : '',
    dateLastPublished: raw.dateLastPublished ?? Date.now(),
    publicDescription: raw.publicDescription ?? '',
    benefits: raw.benefits ?? '',
    // Extended fields (REST API / Pro tier)
    salaryLow: raw.salary && raw.salary > 0 ? raw.salary : undefined,
    salaryHigh: raw.customFloat1 && raw.customFloat1 > 0 ? raw.customFloat1 : undefined,
    payRate: raw.payRate && raw.payRate > 0 ? raw.payRate : undefined,
    payRateMax: raw.customFloat2 && raw.customFloat2 > 0 ? raw.customFloat2 : undefined,
    salaryUnit: raw.salaryUnit || undefined,
    yearsRequired: raw.yearsRequired && raw.yearsRequired > 0 ? raw.yearsRequired : undefined,
    onSite: raw.onSite || undefined,
    jobType: raw.jobType || undefined,
    clientCorporation: raw.clientCorporation?.id ? {
      id: raw.clientCorporation.id,
      name: raw.clientCorporation.name ?? '',
      companyDescription: raw.clientCorporation.companyDescription ?? '',
    } : undefined,
  };
}

// REST API fields for Pro tier portals (fetched via /api/bh/ proxy)
// Note: jobType is not a standard Bullhorn field — removed after 400 error on Premier's instance
const REST_FIELDS = 'id,title,publishedCategory(id,name),address(city,state,countryName,zip),employmentType,salary,customFloat1,payRate,customFloat2,salaryUnit,dateLastPublished,publicDescription,benefits,onSite,yearsRequired,clientCorporation(id,name,companyDescription)';

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

  // Use REST API proxy for Pro tier portals, public API for everyone else
  const portalId = config.portalId;
  const apiMode = config.apiMode || 'public';
  let url: string;

  if (apiMode === 'rest' && portalId) {
    // Pro tier: fetch through our server-side proxy with full field access
    url = `/api/bh/search/JobOrder?portal=${encodeURIComponent(portalId)}&query=${encodeURIComponent('(isOpen:1 AND isDeleted:0 AND isPublic:1)')}&fields=${encodeURIComponent(REST_FIELDS)}&count=500&sort=-dateLastPublished&showTotalMatched=true`;
  } else {
    // Standard: direct to Bullhorn public API
    const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
    url = `${base}/search/JobOrder?query=${encodeURIComponent('(isOpen:1) AND (isDeleted:0)')}&fields=${config.service.fields}&count=500&sort=-dateLastPublished&showTotalMatched=true`;
  }

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
  if (params.onSiteOptions && params.onSiteOptions.length > 0) {
    jobs = jobs.filter(j => j.onSite && params.onSiteOptions!.includes(j.onSite));
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

  const portalId = config.portalId;
  const apiMode = config.apiMode || 'public';

  let url: string;
  if (apiMode === 'rest' && portalId) {
    // Pro tier: fetch through REST proxy with full fields
    url = `/api/bh/query/JobOrder?portal=${encodeURIComponent(portalId)}&where=${encodeURIComponent(`id=${id}`)}&fields=${encodeURIComponent(REST_FIELDS)}&count=1`;
  } else {
    // Standard: direct to Bullhorn public API
    const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
    url = `${base}/query/JobBoardPost?where=(id=${id})&fields=${config.service.fields}`;
  }

  const res = await fetch(url);
  const data = await res.json() as { data?: any[] };
  if (!data.data?.[0]) return null;
  return normalizeBullhornJob(data.data[0]);
}

export interface ApplicationResult {
  candidateId?: number;
  candidateAlreadyExisted?: boolean;
  jobSubmissionId?: number;
  error?: string;
}

function generateApplicationSummary(
  jobId: number,
  jobTitle: string,
  formData: FormData,
  portalUrl?: string
): string {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = (formData.get('phone') as string) || '';
  const linkedInUrl = (formData.get('linkedInUrl') as string) || '';
  const source = (formData.get('source') as string) || '';
  const appliedViaLinkedIn = formData.get('appliedViaLinkedIn') === 'true';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const lines: string[] = [
    'APPLICATION SUMMARY',
    '='.repeat(40),
    '',
    `Submitted: ${dateStr}`,
    `Position: ${jobTitle} (Job #${jobId})`,
  ];

  if (portalUrl) lines.push(`Source: Career Portal (${portalUrl})`);
  if (source) lines.push(`Referral Source: ${source}`);
  if (appliedViaLinkedIn) lines.push('Applied via: LinkedIn Sign-In');

  lines.push('', 'CANDIDATE INFORMATION', '-'.repeat(30), '');
  lines.push(`Name: ${firstName} ${lastName}`);
  lines.push(`Email: ${email}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (linkedInUrl) lines.push(`LinkedIn: ${linkedInUrl}`);

  // Include any additional custom fields
  const knownFields = new Set(['firstName', 'lastName', 'email', 'phone', 'linkedInUrl', 'source', 'attributionNote', 'appliedViaLinkedIn', 'resume', 'eeoGender', 'eeoRace', 'eeoVeteran', 'eeoDisability']);
  const customEntries: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (!knownFields.has(key) && typeof value === 'string' && value.trim()) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      customEntries.push(`${label}: ${value}`);
    }
  }
  if (customEntries.length > 0) {
    lines.push('', 'ADDITIONAL INFORMATION', '-'.repeat(30), '');
    lines.push(...customEntries);
  }

  // EEO Voluntary Self-Identification
  const eeoGender = (formData.get('eeoGender') as string) || '';
  const eeoRace = (formData.get('eeoRace') as string) || '';
  const eeoVeteran = (formData.get('eeoVeteran') as string) || '';
  const eeoDisability = (formData.get('eeoDisability') as string) || '';
  if (eeoGender || eeoRace || eeoVeteran || eeoDisability) {
    lines.push('', 'VOLUNTARY SELF-IDENTIFICATION (EEO)', '-'.repeat(30), '');
    if (eeoGender) lines.push(`Gender: ${eeoGender}`);
    if (eeoRace) lines.push(`Race/Ethnicity: ${eeoRace}`);
    if (eeoVeteran) lines.push(`Veteran Status: ${eeoVeteran}`);
    if (eeoDisability) lines.push(`Disability Status: ${eeoDisability}`);
  }

  lines.push('', '-'.repeat(30));
  lines.push('Submitted via Tonic Career Portal');
  lines.push('https://appsforstaffing.com');

  return lines.join('\n');
}

export async function submitApplication(
  jobId: number | undefined,
  formData: FormData,
  jobTitle?: string,
): Promise<ApplicationResult> {
  const config = loadConfig();

  // Demo mode: simulate success
  if (config.service.corpToken === 'demo') {
    await new Promise(r => setTimeout(r, 1000));
    return { candidateId: 999999, candidateAlreadyExisted: false };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = (formData.get('phone') as string) || '';
  const portalId = config.portalId;
  const apiMode = config.apiMode || 'public';

  // Generate the application summary file
  const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'appsforstaffing.com';
  const summary = generateApplicationSummary(jobId || 0, jobTitle || (jobId ? `Job #${jobId}` : 'General Application'), formData, portalUrl);

  const candidateStatus = config.applyForm?.candidateStatus || 'New Lead';
  const submissionStatus = config.applyForm?.submissionStatus || 'New Lead';

  if (apiMode === 'rest' && portalId) {
    // Pro tier: use REST API proxy for full field control
    return submitViaRestApi(jobId, firstName, lastName, email, phone, formData, summary, portalId, candidateStatus, submissionStatus);
  } else if (jobId) {
    // Standard: use public apply endpoint with generated summary file (requires jobId)
    return submitViaPublicApi(jobId, firstName, lastName, email, phone, summary, config);
  } else {
    // Public API can't create candidates without a job — no general apply for non-REST
    throw new Error('General applications require a hosted portal (Pro tier).');
  }
}

async function submitViaPublicApi(
  jobId: number,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  summary: string,
  config: ReturnType<typeof loadConfig>,
): Promise<ApplicationResult> {
  const base = `https://public-rest${config.service.swimlane}.bullhornstaffing.com:443/rest-services/${config.service.corpToken}`;
  const params = new URLSearchParams({
    externalID: 'CareerPortalApplication',
    type: 'Resume',
    firstName,
    lastName,
    email,
    format: 'text',
  });
  if (phone) params.set('phone', phone);

  const url = `${base}/apply/${jobId}/raw?${params.toString()}`;

  // Create multipart form with the application summary as the file
  const blob = new Blob([summary], { type: 'text/plain' });
  const submitForm = new FormData();
  submitForm.append('resume', blob, `application-${firstName}-${lastName}.txt`);

  const res = await fetch(url, { method: 'POST', body: submitForm });
  const data = await res.json();

  if (data.errorMessage) {
    throw new Error(data.errorMessage);
  }

  return {
    candidateId: data.candidate?.id,
    candidateAlreadyExisted: data.candidateAlreadyExisted ?? false,
    jobSubmissionId: data.jobSubmission?.id,
  };
}

async function submitViaRestApi(
  jobId: number | undefined,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  formData: FormData,
  summary: string,
  portalId: string,
  candidateStatus: string,
  submissionStatus: string,
): Promise<ApplicationResult> {
  // Step 1: Check for existing candidate by email
  const searchUrl = `/api/bh/search/Candidate?portal=${encodeURIComponent(portalId)}&query=${encodeURIComponent(`email:"${email}"`)}&fields=id,firstName,lastName,email,status&count=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  let candidateId: number;
  let candidateAlreadyExisted = false;

  if (searchData.data && searchData.data.length > 0) {
    // Candidate exists - use their ID, don't change status
    candidateId = searchData.data[0].id;
    candidateAlreadyExisted = true;
  } else {
    // Step 2: Create new candidate
    const candidatePayload: Record<string, any> = {
      firstName,
      lastName,
      email,
      status: candidateStatus,
      source: (formData.get('source') as string) || 'Career Portal',
    };
    if (phone) candidatePayload.phone = phone;

    const linkedInUrl = (formData.get('linkedInUrl') as string) || '';
    if (linkedInUrl) candidatePayload.companyURL = linkedInUrl;

    const createRes = await fetch(`/api/bh/entity/Candidate?portal=${encodeURIComponent(portalId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidatePayload),
    });
    const createData = await createRes.json();

    if (createData.errorMessage) {
      throw new Error(createData.errorMessage);
    }
    candidateId = createData.changedEntityId;
  }

  let jobSubmissionId: number | undefined;

  if (jobId) {
    // Step 3: Create JobSubmission linking candidate to job (as Web Response)
    const submissionPayload = {
      candidate: { id: candidateId },
      jobOrder: { id: jobId },
      status: submissionStatus,
      source: (formData.get('source') as string) || 'Career Portal',
      dateWebResponse: new Date().getTime(),
    };

    const subRes = await fetch(`/api/bh/entity/JobSubmission?portal=${encodeURIComponent(portalId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionPayload),
    });
    const subData = await subRes.json();
    jobSubmissionId = subData.changedEntityId;
  }

  // Step 4: Attach application summary as a Note on candidate
  const notePayload: Record<string, any> = {
    personReference: { id: candidateId },
    action: jobId ? 'Career Portal Application' : 'General Career Portal Application',
    comments: summary,
  };
  if (jobId) notePayload.jobOrder = { id: jobId };

  await fetch(`/api/bh/entity/Note?portal=${encodeURIComponent(portalId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notePayload),
  });

  return {
    candidateId,
    candidateAlreadyExisted,
    jobSubmissionId,
  };
}
