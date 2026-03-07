import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loginToBullhorn } = require('./bullhorn-auth.cjs');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

interface CachedTokens {
  restUrl?: string;
  restToken?: string;
  refreshToken?: string;
  accessToken?: string;
}

async function getPortalCredentials(portalId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('ats_credentials')
    .select('credentials, tokens')
    .eq('portal_id', portalId)
    .eq('provider', 'bullhorn')
    .single();

  if (!data) return null;
  const creds = data.credentials as Record<string, string>;
  if (!creds?.clientId || !creds?.clientSecret || !creds?.username || !creds?.password) return null;

  return {
    credentials: {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      username: creds.username,
      password: creds.password,
    },
    tokens: (data.tokens as CachedTokens) || {},
  };
}

async function saveCachedTokens(portalId: string, tokens: CachedTokens) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from('ats_credentials')
    .update({ tokens, tokens_updated_at: new Date().toISOString() })
    .eq('portal_id', portalId)
    .eq('provider', 'bullhorn');
}

// ── Operation Allowlist ──
// Only permit the specific Bullhorn API operations the portal frontend needs.
// Everything else is blocked to prevent unauthorized data access.
const ALLOWED_OPERATIONS: { method: string; pattern: RegExp }[] = [
  // Job display (read-only)
  { method: 'GET', pattern: /^query\/JobOrder$/ },
  { method: 'GET', pattern: /^query\/JobBoardPost$/ },
  { method: 'GET', pattern: /^search\/JobOrder$/ },
  { method: 'GET', pattern: /^entity\/JobOrder\/\d+$/ },
  // Apply flow — candidate duplicate check
  { method: 'GET', pattern: /^search\/Candidate$/ },
  // Apply flow — create candidate
  { method: 'PUT', pattern: /^entity\/Candidate$/ },
  // Apply flow — create job submission (web response)
  { method: 'PUT', pattern: /^entity\/JobSubmission$/ },
  // Apply flow — attach application note
  { method: 'PUT', pattern: /^entity\/Note$/ },
];

function isAllowedOperation(method: string, path: string): boolean {
  return ALLOWED_OPERATIONS.some(
    op => op.method === method && op.pattern.test(path)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const portalId = req.query.portal as string;
  if (!portalId) return res.status(400).json({ error: 'Missing portal query parameter' });

  const portalCreds = await getPortalCredentials(portalId);
  if (!portalCreds) return res.status(404).json({ error: 'No Bullhorn credentials for this portal' });

  // Authenticate (ping cached → refresh → full login)
  let session;
  try {
    session = await loginToBullhorn(
      { credentials: portalCreds.credentials, tokens: portalCreds.tokens },
      { ttl: 1440 }
    );
    if (session.method !== 'existing') {
      await saveCachedTokens(portalId, {
        restUrl: session.restUrl,
        restToken: session.restToken,
        refreshToken: session.refreshToken,
        accessToken: session.accessToken,
      });
    }
  } catch (err: any) {
    return res.status(502).json({ error: 'Bullhorn auth failed', detail: err.errorMessage || err.message });
  }

  // Build Bullhorn API URL from path segments
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const bhPath = pathSegments.filter(Boolean).join('/');

  // Enforce operation allowlist
  const method = (req.method || 'GET').toUpperCase();
  if (!isAllowedOperation(method, bhPath)) {
    return res.status(403).json({ error: 'Operation not permitted', path: bhPath, method });
  }

  // For candidate search, restrict to email-only queries (apply flow duplicate detection)
  if (bhPath === 'search/Candidate' && method === 'GET') {
    const query = (req.query.query as string) || '';
    if (!query.startsWith('email:')) {
      return res.status(403).json({ error: 'Candidate search restricted to email lookup only' });
    }
  }

  const bhUrl = new URL(bhPath, session.restUrl);

  // Forward query params (except portal and path)
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'portal' && key !== 'path' && typeof value === 'string') {
      bhUrl.searchParams.set(key, value);
    }
  }

  const fetchInit: RequestInit = {
    method: req.method || 'GET',
    headers: {
      BhRestToken: session.restToken,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  };

  if (req.method === 'POST' || req.method === 'PUT') {
    (fetchInit.headers as Record<string, string>)['Content-Type'] = req.headers['content-type'] || 'application/json';
    fetchInit.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const bhResponse = await fetch(bhUrl.toString(), fetchInit);
    const data = await bhResponse.json();
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Bullhorn-Auth-Method', session.method);
    return res.status(bhResponse.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Bullhorn API request failed', detail: err.message });
  }
}
