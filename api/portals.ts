/**
 * Portal CRUD API — stores portal configs in Vercel KV with Crockford Base32 IDs.
 *
 * POST /api/portals — create a portal, returns { id, url }
 * GET  /api/portals?id=<id> — retrieve a portal config
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crockford Base32 — inline to avoid import issues in Vercel serverless
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

function generatePortalId(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return encodeCrockford(bytes);
}

function isValidPortalId(str: string): boolean {
  return /^[0-9a-hjkmnp-tv-z]{6,12}$/i.test(str);
}

// Lazy-load KV to avoid errors when env vars aren't set
async function getKV() {
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

interface PortalConfig {
  companyName: string;
  companyLogoPath?: string;
  companyUrl?: string;
  corpToken: string;
  swimlane: string;
  sourceUrl?: string;
  source?: string;
  primaryColor?: string;
  linkColor?: string;
  privacyPolicyUrl?: string;
  createdAt?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = await getKV();
  if (!store) {
    return res.status(503).json({
      error: 'Portal storage not configured. Connect a Vercel KV store to enable short URLs.',
      fallback: true,
    });
  }

  // GET — retrieve portal config by ID
  if (req.method === 'GET') {
    const id = (req.query.id as string)?.toLowerCase();
    if (!id || !isValidPortalId(id)) {
      return res.status(400).json({ error: 'Invalid portal ID.' });
    }

    try {
      const config = await store.get<PortalConfig>(`portal:${id}`);
      if (!config) {
        return res.status(404).json({ error: 'Portal not found.' });
      }
      return res.status(200).json(config);
    } catch (err) {
      console.error('KV get error:', err);
      return res.status(500).json({ error: 'Failed to retrieve portal.' });
    }
  }

  // POST — create a new portal
  if (req.method === 'POST') {
    const body = req.body as PortalConfig;

    if (!body?.corpToken || !body?.swimlane) {
      return res.status(400).json({ error: 'corpToken and swimlane are required.' });
    }

    if (!body.companyName) {
      return res.status(400).json({ error: 'companyName is required.' });
    }

    // Generate unique ID (retry on collision, though astronomically unlikely)
    let id: string;
    let attempts = 0;
    do {
      id = generatePortalId();
      const existing = await store.get(`portal:${id}`);
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      return res.status(500).json({ error: 'Failed to generate unique ID.' });
    }

    const config: PortalConfig = {
      companyName: body.companyName,
      companyLogoPath: body.companyLogoPath || '',
      companyUrl: body.companyUrl || '',
      corpToken: body.corpToken,
      swimlane: body.swimlane,
      sourceUrl: body.sourceUrl || '',
      source: body.source || '',
      primaryColor: body.primaryColor || '',
      linkColor: body.linkColor || '',
      privacyPolicyUrl: body.privacyPolicyUrl || '',
      createdAt: new Date().toISOString(),
    };

    try {
      // Store with 90-day TTL for preview portals
      await store.set(`portal:${id}`, config, { ex: 90 * 24 * 60 * 60 });

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      const url = `${protocol}://${host}/${id}`;

      return res.status(201).json({ id, url });
    } catch (err) {
      console.error('KV set error:', err);
      return res.status(500).json({ error: 'Failed to store portal.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
