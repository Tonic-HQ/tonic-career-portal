/**
 * Live OSCP repo stats from GitHub API.
 * GET /api/oscp-stats
 * Cached for 6 hours to avoid rate limiting.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface OscpStats {
  openIssues: number;
  lastCommitDate: string;
  lastCommitMessage: string;
  commitsLast6Months: number;
  angularVersion: string;
  currentAngularVersion: string;
  repoCreated: string;
  stars: number;
  forks: number;
  fetchedAt: string;
}

let cache: { data: OscpStats; expires: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function ghFetch(path: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'tonic-career-portal',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com/${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function fetchStats(): Promise<OscpStats> {
  const [repo, commits6m, lastCommit, pkg] = await Promise.all([
    ghFetch('repos/bullhorn/career-portal'),
    ghFetch(`repos/bullhorn/career-portal/commits?since=${new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()}&per_page=100`),
    ghFetch('repos/bullhorn/career-portal/commits?per_page=1'),
    ghFetch('repos/bullhorn/career-portal/contents/package.json'),
  ]);

  // Parse package.json for Angular version
  const pkgJson = JSON.parse(Buffer.from(pkg.content, 'base64').toString());
  const angularVersion = pkgJson.dependencies?.['@angular/core']?.replace(/[~^]/, '') || 'unknown';

  return {
    openIssues: repo.open_issues_count,
    lastCommitDate: lastCommit[0]?.commit?.committer?.date || '',
    lastCommitMessage: (lastCommit[0]?.commit?.message || '').split('\n')[0],
    commitsLast6Months: Array.isArray(commits6m) ? commits6m.length : 0,
    angularVersion,
    currentAngularVersion: '19',
    repoCreated: repo.created_at,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (cache && Date.now() < cache.expires) {
      return res.status(200).json(cache.data);
    }

    const stats = await fetchStats();
    cache = { data: stats, expires: Date.now() + CACHE_TTL };
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('OSCP stats error:', err);
    // Return stale cache if available
    if (cache) return res.status(200).json({ ...cache.data, stale: true });
    return res.status(500).json({ error: 'Failed to fetch OSCP stats', detail: err.message });
  }
}
