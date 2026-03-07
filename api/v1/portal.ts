/**
 * Portal Management API — v1
 * 
 * GET  /api/v1/portal           — Get portal config
 * PATCH /api/v1/portal          — Update portal config (deep merge)
 * GET  /api/v1/portal/jobs      — List current jobs
 * GET  /api/v1/portal/stats     — Portal analytics
 * 
 * All endpoints require: Authorization: Bearer tcp_<key>
 * Docs: /api/v1/openapi.json
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest, errorResponse, withDocs } from './_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Authenticate
  const { ctx, error, status } = await authenticateRequest(req.headers.authorization);
  if (!ctx) {
    return res.status(status).json(errorResponse(error!, status));
  }

  const { portalId, supabase, scopes } = ctx;

  // Parse sub-path: /api/v1/portal, /api/v1/portal/jobs, /api/v1/portal/stats
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const subPath = url.pathname.replace(/^\/api\/v1\/portal\/?/, '').replace(/\/$/, '');

  // ── GET /api/v1/portal ──
  if (req.method === 'GET' && !subPath) {
    const { data, error: dbError } = await supabase
      .from('portals')
      .select('id, config, tier, company_name, domain, created_at, updated_at')
      .eq('id', portalId)
      .single();

    if (dbError || !data) {
      return res.status(404).json(errorResponse('Portal not found', 404));
    }

    return res.json(withDocs({
      id: data.id,
      companyName: data.company_name,
      tier: data.tier,
      domain: data.domain,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      config: data.config,
    }));
  }

  // ── PATCH /api/v1/portal ──
  if (req.method === 'PATCH' && !subPath) {
    if (!scopes.includes('write')) {
      return res.status(403).json(errorResponse('API key does not have write access', 403));
    }

    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(errorResponse('Request body must be a JSON object with config fields to update', 400));
    }

    // Get current config
    const { data: current } = await supabase
      .from('portals')
      .select('config')
      .eq('id', portalId)
      .single();

    if (!current) {
      return res.status(404).json(errorResponse('Portal not found', 404));
    }

    // Deep merge updates into existing config
    const merged = deepMerge(current.config || {}, updates);

    // Extract indexable fields
    const companyName = merged.companyName || null;

    const { data, error: dbError } = await supabase
      .from('portals')
      .update({
        config: merged,
        company_name: companyName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portalId)
      .select('id, config, updated_at')
      .single();

    if (dbError) {
      return res.status(500).json(errorResponse('Failed to update portal config', 500));
    }

    return res.json(withDocs({
      id: data.id,
      config: data.config,
      updatedAt: data.updated_at,
      message: 'Portal config updated. Changes are live immediately.',
    }));
  }

  // ── GET /api/v1/portal/jobs ──
  if (req.method === 'GET' && subPath === 'jobs') {
    // Fetch jobs through the same proxy logic
    const { data: portal } = await supabase
      .from('portals')
      .select('config')
      .eq('id', portalId)
      .single();

    if (!portal) {
      return res.status(404).json(errorResponse('Portal not found', 404));
    }

    const config = portal.config || {};
    const corpToken = config.service?.corpToken || config.corpToken;
    const swimlane = config.service?.swimlane || config.swimlane;

    if (!corpToken || !swimlane) {
      return res.status(400).json(errorResponse('Portal has no Bullhorn connection configured', 400));
    }

    // Use public API to fetch jobs
    const bhBase = `https://public-rest${swimlane}.bullhornstaffing.com:443/rest-services/${corpToken}`;
    const fields = 'id,title,publishedCategory(id,name),address(city,state,countryName),employmentType,dateLastPublished,publicDescription,isOpen,isPublic,isDeleted,salary,salaryUnit';
    const bhUrl = `${bhBase}/search/JobOrder?query=(isOpen:1 AND isPublic:1 AND isDeleted:0)&fields=${fields}&count=500&sort=-dateLastPublished`;

    try {
      const bhRes = await fetch(bhUrl, { signal: AbortSignal.timeout(15000) });
      const bhData = await bhRes.json();

      const jobs = (bhData.data || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        category: j.publishedCategory?.name || null,
        city: j.address?.city || null,
        state: j.address?.state || null,
        employmentType: j.employmentType || null,
        salary: j.salary || null,
        salaryUnit: j.salaryUnit || null,
        publishedDate: j.dateLastPublished ? new Date(j.dateLastPublished).toISOString() : null,
        url: `https://careersite.appsforstaffing.com/${portalId}/jobs/${j.id}`,
      }));

      return res.json(withDocs({
        portalId,
        count: jobs.length,
        jobs,
      }));
    } catch (err: any) {
      return res.status(502).json(errorResponse('Failed to fetch jobs from Bullhorn', 502));
    }
  }

  // ── GET /api/v1/portal/stats ──
  if (req.method === 'GET' && subPath === 'stats') {
    // Pull from analytics_events table
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [viewsResult, appliesResult, appsResult] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId)
        .eq('event_type', 'page_view')
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId)
        .eq('event_type', 'apply_click')
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('portal_id', portalId)
        .gte('created_at', thirtyDaysAgo),
    ]);

    return res.json(withDocs({
      portalId,
      period: 'last_30_days',
      pageViews: viewsResult.count || 0,
      applyClicks: appliesResult.count || 0,
      applications: appsResult.count || 0,
    }));
  }

  // ── GET /api/v1/portal/credentials ──
  if (req.method === 'GET' && subPath === 'credentials') {
    const { data } = await supabase
      .from('ats_credentials')
      .select('credentials, tokens_updated_at, created_at')
      .eq('portal_id', portalId)
      .eq('provider', 'bullhorn')
      .single();

    if (!data) {
      return res.json(withDocs({
        portalId,
        configured: false,
        message: 'No Bullhorn credentials configured for this portal.',
      }));
    }

    const creds = data.credentials as Record<string, string>;
    return res.json(withDocs({
      portalId,
      configured: true,
      clientId: creds.clientId || null,
      username: creds.username || null,
      hasClientSecret: !!creds.clientSecret,
      hasPassword: !!creds.password,
      lastValidated: data.tokens_updated_at || null,
      createdAt: data.created_at,
    }));
  }

  // ── POST /api/v1/portal/credentials/validate ──
  if (req.method === 'POST' && subPath === 'credentials/validate') {
    const { data } = await supabase
      .from('ats_credentials')
      .select('credentials')
      .eq('portal_id', portalId)
      .eq('provider', 'bullhorn')
      .single();

    if (!data) {
      return res.status(400).json(errorResponse('No credentials configured to validate', 400));
    }

    try {
      // Dynamic import of the auth client
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const { loginToBullhorn } = require('../bh/bullhorn-auth.cjs');

      const creds = data.credentials as Record<string, string>;
      const session = await loginToBullhorn({
        credentials: {
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          username: creds.username,
          password: creds.password,
        },
      });

      // Save tokens on successful validation
      await supabase
        .from('ats_credentials')
        .update({
          tokens: {
            restUrl: session.restUrl,
            restToken: session.restToken,
            refreshToken: session.refreshToken,
            accessToken: session.accessToken,
          },
          tokens_updated_at: new Date().toISOString(),
        })
        .eq('portal_id', portalId)
        .eq('provider', 'bullhorn');

      return res.json(withDocs({
        valid: true,
        message: 'Bullhorn credentials are valid. Connection successful.',
        restUrl: session.restUrl,
        method: session.method,
        validatedAt: new Date().toISOString(),
      }));
    } catch (err: any) {
      return res.json(withDocs({
        valid: false,
        message: `Bullhorn authentication failed: ${err.errorMessage || err.message}`,
        validatedAt: new Date().toISOString(),
      }));
    }
  }

  // ── PATCH /api/v1/portal/credentials ──
  if (req.method === 'PATCH' && subPath === 'credentials') {
    if (!scopes.includes('write')) {
      return res.status(403).json(errorResponse('API key does not have write access', 403));
    }

    const { clientId, clientSecret, username, password } = req.body || {};
    if (!clientId && !clientSecret && !username && !password) {
      return res.status(400).json(errorResponse('Provide at least one credential field to update: clientId, clientSecret, username, password', 400));
    }

    // Get existing credentials
    const { data: existing } = await supabase
      .from('ats_credentials')
      .select('id, credentials')
      .eq('portal_id', portalId)
      .eq('provider', 'bullhorn')
      .single();

    const currentCreds = (existing?.credentials || {}) as Record<string, string>;
    const merged = {
      ...currentCreds,
      ...(clientId && { clientId }),
      ...(clientSecret && { clientSecret }),
      ...(username && { username }),
      ...(password && { password }),
    };

    if (existing) {
      await supabase
        .from('ats_credentials')
        .update({
          credentials: merged,
          tokens: null,
          tokens_updated_at: null,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('ats_credentials')
        .insert({
          portal_id: portalId,
          provider: 'bullhorn',
          credentials: merged,
        });
    }

    return res.json(withDocs({
      message: 'Credentials updated. Previous tokens cleared — run POST /api/v1/portal/credentials/validate to verify.',
      clientId: merged.clientId || null,
      username: merged.username || null,
      hasClientSecret: !!merged.clientSecret,
      hasPassword: !!merged.password,
    }));
  }

  return res.status(404).json(errorResponse(`Unknown endpoint: ${req.method} /api/v1/portal/${subPath}`, 404));
}

/** Deep merge two objects (arrays are replaced, not merged) */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
