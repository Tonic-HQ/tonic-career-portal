/**
 * API key authentication middleware for v1 endpoints.
 * Keys are prefixed with "tcp_" (Tonic Career Portal).
 * Stored as SHA-256 hashes — write-only, never readable.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const DOCS_URL = 'https://careersite.appsforstaffing.com/api/v1/openapi.json';
const KEY_PREFIX = 'tcp_';

export interface AuthContext {
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

/** Generate a new API key (returns the raw key — only shown once) */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(32);
  const raw = KEY_PREFIX + bytes.toString('base64url');
  return {
    raw,
    hash: hashKey(raw),
    prefix: raw.slice(0, 12) + '...',
  };
}

/** Authenticate a request by API key. Returns null with error details if invalid. */
export async function authenticateRequest(
  authHeader: string | undefined
): Promise<{ ctx: AuthContext | null; error: string | null; status: number }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ctx: null,
      error: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
      status: 401,
    };
  }

  const key = authHeader.slice(7).trim();
  if (!key.startsWith(KEY_PREFIX)) {
    return {
      ctx: null,
      error: 'Invalid API key format. Keys start with "tcp_".',
      status: 401,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ctx: null, error: 'Service unavailable', status: 503 };
  }

  const keyHash = hashKey(key);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, portal_id, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return { ctx: null, error: 'Invalid API key', status: 401 };
  }

  if (data.revoked_at) {
    return { ctx: null, error: 'API key has been revoked', status: 401 };
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return {
    ctx: {
      portalId: data.portal_id,
      keyId: data.id,
      scopes: data.scopes || ['read', 'write'],
      supabase,
    },
    error: null,
    status: 200,
  };
}

/** Standard error response with docs link */
export function errorResponse(message: string, status: number) {
  return {
    error: message,
    status,
    _docs: DOCS_URL,
  };
}

/** Wrap a successful response with docs link */
export function withDocs<T extends Record<string, unknown>>(data: T): T & { _docs: string } {
  return { ...data, _docs: DOCS_URL };
}
