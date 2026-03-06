/**
 * Portal CRUD API — Supabase-backed.
 * POST /api/portals — Create a new portal (or update existing)
 * GET /api/portals?id=<id> — Retrieve portal config
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateId, isValidId } from '../src/utils/crockford';

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
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        return res.status(500).json({ error: 'Failed to save portal config' });
      }

      return res.status(200).json({
        id: data.id,
        url: `/${data.id}`,
        created: data.created_at,
        expires: data.expires_at,
      });
    } catch (err) {
      console.error('Portal creation error:', err);
      return res.status(500).json({ error: 'Internal server error' });
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
    } catch (err) {
      console.error('Portal fetch error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
