/**
 * Portal Management API — v1
 * 
 * GET  /api/v1/portal           — Get portal config
 * PATCH /api/v1/portal          — Update portal config (deep merge)
 * GET  /api/v1/portal/jobs      — List current jobs
 * GET  /api/v1/portal/stats     — Portal analytics
 * GET  /api/v1/portal/credentials — Credential status (no secrets)
 * PATCH /api/v1/portal/credentials — Update credentials (write-only)
 * POST /api/v1/portal/credentials/validate — Test Bullhorn connection
 * 
 * All endpoints require: Authorization: Bearer tcp_<key>
 * Docs: /api/v1/openapi.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ── Auth utilities (inlined for Vercel serverless) ──

const DOCS_URL = 'https://careersite.appsforstaffing.com/api/v1/openapi.json';
const KEY_PREFIX = 'tcp_';

interface AuthContext {
  portalId: string;
  keyId: string;
  scopes: string[];
  supabase: SupabaseClient;
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function authenticateRequest(
  authHeader: string | undefined
): Promise<{ ctx: AuthContext | null; error: string | null; status: number }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ctx: null, error: 'Missing or invalid Authorization header. Use: Bearer <api_key>', status: 401 };
  }
  const key = authHeader.slice(7).trim();
  if (!key.startsWith(KEY_PREFIX)) {
    return { ctx: null, error: 'Invalid API key format. Keys start with "tcp_".', status: 401 };
  }
  const supabase = getSupabase();
  if (!supabase) return { ctx: null, error: 'Service unavailable', status: 503 };

  const keyHash = hashKey(key);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, portal_id, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) return { ctx: null, error: 'Invalid API key', status: 401 };
  if (data.revoked_at) return { ctx: null, error: 'API key has been revoked', status: 401 };

  // Update last_used_at (fire and forget)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});

  return {
    ctx: { portalId: data.portal_id, keyId: data.id, scopes: data.scopes || ['read', 'write'], supabase },
    error: null, status: 200,
  };
}

function errRes(message: string, status: number) {
  return { error: message, status, _docs: DOCS_URL };
}

function withDocs<T extends Record<string, unknown>>(data: T): T & { _docs: string } {
  return { ...data, _docs: DOCS_URL };
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ctx, error, status } = await authenticateRequest(req.headers.authorization);
  if (!ctx) return res.status(status).json(errRes(error!, status));

  const { portalId, supabase, scopes } = ctx;

  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const subPath = url.pathname.replace(/^\/api\/v1\/portal\/?/, '').replace(/\/$/, '');

  // ── GET /api/v1/portal ──
  if (req.method === 'GET' && !subPath) {
    const { data, error: e } = await supabase
      .from('portals').select('id, config, tier, company_name, domain, created_at, updated_at')
      .eq('id', portalId).single();
    if (e || !data) return res.status(404).json(errRes('Portal not found', 404));
    return res.json(withDocs({
      id: data.id, companyName: data.company_name, tier: data.tier,
      domain: data.domain, createdAt: data.created_at, updatedAt: data.updated_at, config: data.config,
    }));
  }

  // ── PATCH /api/v1/portal ──
  if (req.method === 'PATCH' && !subPath) {
    if (!scopes.includes('write')) return res.status(403).json(errRes('API key does not have write access', 403));
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json(errRes('Request body must be a JSON object', 400));

    const { data: current } = await supabase.from('portals').select('config').eq('id', portalId).single();
    if (!current) return res.status(404).json(errRes('Portal not found', 404));

    const merged = deepMerge(current.config || {}, updates);
    const { data, error: e } = await supabase.from('portals')
      .update({ config: merged, company_name: merged.companyName || null, updated_at: new Date().toISOString() })
      .eq('id', portalId).select('id, config, updated_at').single();
    if (e) return res.status(500).json(errRes('Failed to update portal config', 500));

    return res.json(withDocs({ id: data.id, config: data.config, updatedAt: data.updated_at,
      message: 'Portal config updated. Changes are live immediately.' }));
  }

  // ── GET /api/v1/portal/jobs ──
  if (req.method === 'GET' && subPath === 'jobs') {
    const { data: portal } = await supabase.from('portals').select('config').eq('id', portalId).single();
    if (!portal) return res.status(404).json(errRes('Portal not found', 404));

    const config = portal.config || {};
    const corpToken = config.service?.corpToken || config.corpToken;
    const swimlane = config.service?.swimlane || config.swimlane;
    if (!corpToken || !swimlane) return res.status(400).json(errRes('Portal has no Bullhorn connection configured', 400));

    const bhBase = `https://public-rest${swimlane}.bullhornstaffing.com:443/rest-services/${corpToken}`;
    const fields = 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,dateLastPublished,salary,salaryUnit';
    const bhUrl = `${bhBase}/search/JobOrder?query=(isOpen:1 AND isPublic:1 AND isDeleted:0)&fields=${fields}&count=500&sort=-dateLastPublished`;

    try {
      const bhRes = await fetch(bhUrl, { signal: AbortSignal.timeout(15000) });
      const bhData = await bhRes.json();
      const jobs = (bhData.data || []).map((j: any) => ({
        id: j.id, title: j.title, category: j.publishedCategory?.name || null,
        city: j.address?.city || null, state: j.address?.state || null,
        employmentType: j.employmentType || null, salary: j.salary || null, salaryUnit: j.salaryUnit || null,
        publishedDate: j.dateLastPublished ? new Date(j.dateLastPublished).toISOString() : null,
        url: `https://careersite.appsforstaffing.com/${portalId}/jobs/${j.id}`,
      }));
      return res.json(withDocs({ portalId, count: jobs.length, jobs }));
    } catch {
      return res.status(502).json(errRes('Failed to fetch jobs from Bullhorn', 502));
    }
  }

  // ── GET /api/v1/portal/stats ──
  if (req.method === 'GET' && subPath === 'stats') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const [views, applies, apps] = await Promise.all([
      supabase.from('analytics_events').select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId).eq('event_type', 'page_view').gte('created_at', thirtyDaysAgo),
      supabase.from('analytics_events').select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId).eq('event_type', 'apply_click').gte('created_at', thirtyDaysAgo),
      supabase.from('applications').select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId).gte('created_at', thirtyDaysAgo),
    ]);
    return res.json(withDocs({ portalId, period: 'last_30_days',
      pageViews: views.count || 0, applyClicks: applies.count || 0, applications: apps.count || 0 }));
  }

  // ── GET /api/v1/portal/credentials ──
  if (req.method === 'GET' && subPath === 'credentials') {
    const { data } = await supabase.from('ats_credentials')
      .select('credentials, tokens_updated_at, created_at')
      .eq('portal_id', portalId).eq('provider', 'bullhorn').single();

    if (!data) return res.json(withDocs({ portalId, configured: false, message: 'No Bullhorn credentials configured.' }));
    const creds = data.credentials as Record<string, string>;
    return res.json(withDocs({
      portalId, configured: true, clientId: creds.clientId || null, username: creds.username || null,
      hasClientSecret: !!creds.clientSecret, hasPassword: !!creds.password,
      lastValidated: data.tokens_updated_at || null, createdAt: data.created_at,
    }));
  }

  // ── POST /api/v1/portal/credentials/validate ──
  if (req.method === 'POST' && subPath === 'credentials/validate') {
    const { data } = await supabase.from('ats_credentials')
      .select('credentials').eq('portal_id', portalId).eq('provider', 'bullhorn').single();
    if (!data) return res.status(400).json(errRes('No credentials configured to validate', 400));

    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const { loginToBullhorn } = require('../bh/bullhorn-auth.cjs');
      const creds = data.credentials as Record<string, string>;
      const session = await loginToBullhorn({
        credentials: { clientId: creds.clientId, clientSecret: creds.clientSecret, username: creds.username, password: creds.password },
      });

      await supabase.from('ats_credentials').update({
        tokens: { restUrl: session.restUrl, restToken: session.restToken, refreshToken: session.refreshToken, accessToken: session.accessToken },
        tokens_updated_at: new Date().toISOString(),
      }).eq('portal_id', portalId).eq('provider', 'bullhorn');

      return res.json(withDocs({ valid: true, message: 'Bullhorn credentials are valid.', restUrl: session.restUrl, validatedAt: new Date().toISOString() }));
    } catch (err: any) {
      return res.json(withDocs({ valid: false, message: `Authentication failed: ${err.errorMessage || err.message}`, validatedAt: new Date().toISOString() }));
    }
  }

  // ── PATCH /api/v1/portal/credentials ──
  if (req.method === 'PATCH' && subPath === 'credentials') {
    if (!scopes.includes('write')) return res.status(403).json(errRes('Write access required', 403));
    const { clientId, clientSecret, username, password } = req.body || {};
    if (!clientId && !clientSecret && !username && !password) {
      return res.status(400).json(errRes('Provide at least one: clientId, clientSecret, username, password', 400));
    }

    const { data: existing } = await supabase.from('ats_credentials')
      .select('id, credentials').eq('portal_id', portalId).eq('provider', 'bullhorn').single();

    const current = (existing?.credentials || {}) as Record<string, string>;
    const merged = { ...current, ...(clientId && { clientId }), ...(clientSecret && { clientSecret }),
      ...(username && { username }), ...(password && { password }) };

    if (existing) {
      await supabase.from('ats_credentials').update({ credentials: merged, tokens: null, tokens_updated_at: null }).eq('id', existing.id);
    } else {
      await supabase.from('ats_credentials').insert({ portal_id: portalId, provider: 'bullhorn', credentials: merged });
    }

    return res.json(withDocs({
      message: 'Credentials updated. Run POST /api/v1/portal/credentials/validate to verify.',
      clientId: merged.clientId || null, username: merged.username || null,
      hasClientSecret: !!merged.clientSecret, hasPassword: !!merged.password,
    }));
  }

  return res.status(404).json(errRes(`Unknown endpoint: ${req.method} /api/v1/portal/${subPath}`, 404));
}
