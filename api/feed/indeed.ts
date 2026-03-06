/**
 * Indeed XML Job Feed
 * GET /api/feed/indeed?portal=<id>
 * GET /api/feed/indeed?corpToken=<token>&swimlane=<num>
 *
 * Generates an Indeed-compatible XML feed from Bullhorn job data.
 * Spec: https://docs.indeed.com/indeed-apply/xml-feed
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface BullhornJob {
  id: number;
  title: string;
  publishedCategory?: { id: number; name: string };
  address?: {
    city?: string;
    state?: string;
    countryName?: string;
    zip?: string;
  };
  employmentType?: string;
  salary?: number;
  salaryUnit?: string;
  dateLastPublished?: number;
  publicDescription?: string;
  isOpen?: boolean;
  isPublic?: boolean;
  isDeleted?: boolean;
}

interface PortalConfig {
  companyName?: string;
  companyUrl?: string;
  service?: { corpToken?: string; swimlane?: string };
  corpToken?: string;
  swimlane?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str: string): string {
  // CDATA sections can't contain ]]> so replace if present
  const clean = (str || '').replace(/]]>/g, ']]&gt;');
  return `<![CDATA[${clean}]]>`;
}

function formatRfc822(timestamp: number): string {
  return new Date(timestamp).toUTCString();
}

function mapEmploymentType(type?: string): string {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t.includes('full')) return 'fulltime';
  if (t.includes('part')) return 'parttime';
  if (t.includes('contract')) return 'contract';
  if (t.includes('temp')) return 'temporary';
  if (t.includes('intern')) return 'internship';
  return t;
}

function formatSalary(salary?: number, unit?: string): string {
  if (!salary) return '';
  const formatted = salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (unit) {
    const u = unit.toLowerCase();
    if (u.includes('hour')) return `${formatted} per hour`;
    if (u.includes('year') || u.includes('annual')) return `${formatted} per year`;
    if (u.includes('month')) return `${formatted} per month`;
    if (u.includes('week')) return `${formatted} per week`;
  }
  return `${formatted} per year`;
}

async function fetchBullhornJobs(corpToken: string, swimlane: string): Promise<BullhornJob[]> {
  const fields = 'id,title,publishedCategory(id,name),address(city,state,countryName,zip),employmentType,salary,salaryUnit,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted';
  const baseUrl = `https://public-rest${swimlane}.bullhornstaffing.com:443/rest-services/${corpToken}`;
  const url = `${baseUrl}/search/JobOrder?query=(isOpen:1 AND isDeleted:0 AND isPublic:1)&fields=${fields}&count=500&sort=-dateLastPublished`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Bullhorn API error: ${res.status}`);
  const data = await res.json();
  return (data.data || []) as BullhornJob[];
}

function buildJobUrl(portalId: string | null, corpToken: string, swimlane: string, jobId: number, baseUrl: string): string {
  if (portalId) {
    return `${baseUrl}/${portalId}/jobs/${jobId}?utm_source=indeed&utm_medium=job_feed`;
  }
  // Fallback: hash-based URL
  const config = btoa(JSON.stringify({ corpToken, swimlane }));
  return `${baseUrl}/site#config=${config}&job=${jobId}`;
}

function generateXml(
  jobs: BullhornJob[],
  companyName: string,
  companyUrl: string,
  portalId: string | null,
  corpToken: string,
  swimlane: string,
  baseUrl: string
): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<source>',
    `  <publisher>${escapeXml('Tonic Career Portal')}</publisher>`,
    `  <publisherurl>${escapeXml('https://careersite.appsforstaffing.com')}</publisherurl>`,
    `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
  ];

  for (const job of jobs) {
    if (job.isDeleted || !job.isOpen || !job.isPublic) continue;

    const jobUrl = buildJobUrl(portalId, corpToken, swimlane, job.id, baseUrl);
    const publishDate = job.dateLastPublished
      ? formatRfc822(job.dateLastPublished)
      : new Date().toUTCString();

    lines.push('  <job>');
    lines.push(`    <title>${cdata(job.title || '')}</title>`);
    lines.push(`    <date>${cdata(publishDate)}</date>`);
    lines.push(`    <referencenumber>${cdata(String(job.id))}</referencenumber>`);
    lines.push(`    <url>${cdata(jobUrl)}</url>`);
    lines.push(`    <company>${cdata(companyName)}</company>`);

    if (job.address?.city) lines.push(`    <city>${cdata(job.address.city)}</city>`);
    if (job.address?.state) lines.push(`    <state>${cdata(job.address.state)}</state>`);
    if (job.address?.countryName) {
      // Indeed expects 2-letter country codes
      const country = job.address.countryName === 'United States' ? 'US' : job.address.countryName;
      lines.push(`    <country>${cdata(country)}</country>`);
    }
    if (job.address?.zip) lines.push(`    <postalcode>${cdata(job.address.zip)}</postalcode>`);

    if (job.publicDescription) {
      lines.push(`    <description>${cdata(job.publicDescription)}</description>`);
    }

    if (job.salary) {
      lines.push(`    <salary>${cdata(formatSalary(job.salary, job.salaryUnit))}</salary>`);
    }

    const jobType = mapEmploymentType(job.employmentType);
    if (jobType) lines.push(`    <jobtype>${cdata(jobType)}</jobtype>`);

    if (job.publishedCategory?.name) {
      lines.push(`    <category>${cdata(job.publishedCategory.name)}</category>`);
    }

    lines.push('  </job>');
  }

  lines.push('</source>');
  return lines.join('\n');
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const portalId = req.query.portal as string | undefined;
  let corpToken = req.query.corpToken as string | undefined;
  let swimlane = req.query.swimlane as string | undefined;
  let companyName = 'Careers';
  let companyUrl = '';

  // If portal ID provided, look up config from Supabase
  if (portalId) {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('portals')
        .select('config, company_name')
        .eq('id', portalId)
        .single();

      if (data?.config) {
        const config = data.config as PortalConfig;
        corpToken = config.service?.corpToken || config.corpToken;
        swimlane = config.service?.swimlane || config.swimlane;
        companyName = config.companyName || data.company_name || 'Careers';
        companyUrl = config.companyUrl || '';
      }
    }
  }

  if (!corpToken || !swimlane) {
    return res.status(400).json({ error: 'Missing corpToken and swimlane. Use ?portal=<id> or ?corpToken=<token>&swimlane=<num>' });
  }

  try {
    const jobs = await fetchBullhornJobs(corpToken, swimlane);
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'careersite.appsforstaffing.com';
    const baseUrl = `${protocol}://${host}`;

    const xml = generateXml(jobs, companyName, companyUrl, portalId || null, corpToken, swimlane, baseUrl);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res.status(200).send(xml);
  } catch (err: any) {
    console.error('Indeed feed error:', err);
    return res.status(500).json({ error: 'Failed to generate feed', detail: err.message });
  }
}
