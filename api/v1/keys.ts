/**
 * API Key Management — v1
 * 
 * POST   /api/v1/keys?portal=<id>  — Generate new API key (requires Supabase auth)
 * GET    /api/v1/keys?portal=<id>  — List keys for portal (requires Supabase auth)
 * DELETE /api/v1/keys?keyId=<id>   — Revoke a key (requires Supabase auth)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const DOCS_URL = 'https://careersite.appsforstaffing.com/api/v1/openapi.json';
const KEY_PREFIX = 'tcp_';
const ADMIN_DOMAINS = ['tonichq.com'];

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function generateApiKey() {
  const bytes = randomBytes(32);
  const raw = KEY_PREFIX + bytes.toString('base64url');
  return { raw, hash: createHash('sha256').update(raw).digest('hex'), prefix: raw.slice(0, 12) + '...' };
}

function errRes(message: string, status: number) { return { error: message, status, _docs: DOCS_URL }; }
function withDocs<T extends Record<string, unknown>>(data: T) { return { ...data, _docs: DOCS_URL }; }

async function authenticateAdmin(authHeader: string | undefined) {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return null;
  const domain = user.email.split('@')[1]?.toLowerCase();
  return { user, role: ADMIN_DOMAINS.includes(domain) ? 'admin' as const : 'client' as const, supabase };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateAdmin(req.headers.authorization);
  if (!auth) return res.status(401).json(errRes('Authentication required (Supabase login)', 401));
  const { user, role, supabase } = auth;

  if (req.method === 'POST') {
    const portalId = (req.body?.portalId || req.query.portal) as string;
    const label = req.body?.label as string | undefined;
    const scopes = req.body?.scopes as string[] | undefined;
    if (!portalId) return res.status(400).json(errRes('portalId is required', 400));

    const { data: portal } = await supabase.from('portals').select('id, owner_email').eq('id', portalId).single();
    if (!portal) return res.status(404).json(errRes('Portal not found', 404));
    if (role !== 'admin' && portal.owner_email !== user.email) return res.status(403).json(errRes('Not authorized', 403));

    const key = generateApiKey();
    const { error } = await supabase.from('api_keys').insert({
      portal_id: portalId, key_hash: key.hash, key_prefix: key.prefix,
      label: label || null, scopes: scopes || ['read', 'write'],
    });
    if (error) return res.status(500).json(errRes('Failed to create API key', 500));

    return res.json(withDocs({
      message: 'API key created. Copy it now — it will not be shown again.',
      apiKey: key.raw, prefix: key.prefix, portalId, label: label || null, scopes: scopes || ['read', 'write'],
      usage: { header: `Authorization: Bearer ${key.raw}`,
        example: `curl -H "Authorization: Bearer ${key.raw}" https://careersite.appsforstaffing.com/api/v1/portal` },
    }));
  }

  if (req.method === 'GET') {
    const portalId = req.query.portal as string;
    if (!portalId) return res.status(400).json(errRes('portal query parameter required', 400));
    if (role !== 'admin') {
      const { data: portal } = await supabase.from('portals').select('owner_email').eq('id', portalId).single();
      if (portal?.owner_email !== user.email) return res.status(403).json(errRes('Not authorized', 403));
    }
    const { data: keys } = await supabase.from('api_keys')
      .select('id, key_prefix, label, scopes, last_used_at, created_at, revoked_at')
      .eq('portal_id', portalId).order('created_at', { ascending: false });

    return res.json(withDocs({
      portalId, keys: (keys || []).map(k => ({
        id: k.id, prefix: k.key_prefix, label: k.label, scopes: k.scopes,
        lastUsed: k.last_used_at, createdAt: k.created_at, revoked: !!k.revoked_at,
      })),
    }));
  }

  if (req.method === 'DELETE') {
    const keyId = req.query.keyId as string || req.body?.keyId;
    if (!keyId) return res.status(400).json(errRes('keyId is required', 400));
    const { data: key } = await supabase.from('api_keys').select('id, portal_id').eq('id', keyId).single();
    if (!key) return res.status(404).json(errRes('Key not found', 404));
    if (role !== 'admin') {
      const { data: portal } = await supabase.from('portals').select('owner_email').eq('id', key.portal_id).single();
      if (portal?.owner_email !== user.email) return res.status(403).json(errRes('Not authorized', 403));
    }
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId);
    return res.json(withDocs({ message: 'API key revoked.', keyId }));
  }

  return res.status(405).json(errRes('Method not allowed', 405));
}
