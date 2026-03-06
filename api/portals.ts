/**
 * Portal CRUD API — Supabase-backed.
 * POST /api/portals — Create a new portal (or update existing)
 * GET /api/portals?id=<id> — Retrieve portal config
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// --- Crockford Base32 (inlined to avoid src/ import issues in serverless) ---
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function generateId(): string {
  const bytes = randomBytes(5);
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id = ALPHABET[Number(bits & 31n)] + id;
    bits >>= 5n;
  }
  return id;
}

function isValidId(id: string): boolean {
  if (!id || id.length < 6 || id.length > 12) return false;
  const valid = new Set(ALPHABET);
  return [...id.toLowerCase()].every(c => valid.has(c));
}
// --- End Crockford ---

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({
      error: 'Database not configured',
      fallback: true,
      debug: {
        hasUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const { config, id: existingId } = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid config object' });
      }

      const id = existingId && isValidId(existingId) ? existingId : generateId();

      // Extract key fields for indexing
      const corpToken = config.service?.corpToken || config.corpToken || null;
      const swimlane = config.service?.swimlane || config.swimlane || null;
      const companyName = config.companyName || null;

      // Upsert portal
      const { data, error } = await supabase
        .from('portals')
        .upsert({
          id,
          config,
          corp_token: corpToken,
          swimlane: swimlane?.toString(),
          company_name: companyName,
          tier: 'preview',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        return res.status(500).json({ error: 'Failed to save portal config', detail: error.message });
      }

      return res.status(200).json({
        id: data.id,
        url: `/${data.id}`,
        created: data.created_at,
        expires: data.expires_at,
      });
    } catch (err: any) {
      console.error('Portal creation error:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  }

  if (req.method === 'GET') {
    const id = req.query.id as string;

    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid portal ID' });
    }

    try {
      const { data, error } = await supabase
        .from('portals')
        .select('id, config, tier, expires_at, company_name, domain')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Portal not found' });
      }

      // Check expiry for preview portals
      if (data.tier === 'preview' && data.expires_at && new Date(data.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Portal preview has expired' });
      }

      return res.status(200).json({
        id: data.id,
        config: data.config,
        tier: data.tier,
        companyName: data.company_name,
        domain: data.domain,
      });
    } catch (err: any) {
      console.error('Portal fetch error:', err);
      return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
