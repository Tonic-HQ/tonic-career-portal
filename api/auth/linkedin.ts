/**
 * LinkedIn OAuth initiation endpoint.
 * GET /api/auth/linkedin?portal=<id>&job=<jobId>&redirect=<url>
 *
 * Generates a signed state parameter and redirects to LinkedIn's auth page.
 * After auth, LinkedIn redirects to /api/auth/callback with the code.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const SCOPES = 'openid profile email';

function getSigningSecret(): string {
  // Use LinkedIn client secret as HMAC key (or a dedicated signing secret)
  return process.env.LINKEDIN_CLIENT_SECRET || '';
}

function getClientId(): string {
  return process.env.LINKEDIN_CLIENT_ID || '';
}

/** Create a signed state parameter containing portal context */
function createState(portalId: string, jobId: string, redirectUrl: string): string {
  const payload = JSON.stringify({
    p: portalId,
    j: jobId,
    r: redirectUrl,
    t: Date.now(),
    n: Math.random().toString(36).slice(2, 10), // nonce
  });

  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url')
    .slice(0, 16); // 16-char signature is plenty for CSRF

  return `${encoded}.${sig}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = getClientId();
  if (!clientId) {
    return res.status(503).json({ error: 'LinkedIn integration not configured.' });
  }

  const portalId = req.query.portal as string;
  const jobId = (req.query.job as string) || '';
  const redirectUrl = req.query.redirect as string;

  if (!portalId) {
    return res.status(400).json({ error: 'Missing portal parameter.' });
  }

  if (!redirectUrl) {
    return res.status(400).json({ error: 'Missing redirect parameter.' });
  }

  // Validate redirect URL is a real URL
  try {
    new URL(redirectUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid redirect URL.' });
  }

  // TODO: When we have a portal database, validate portalId exists
  // and check that redirectUrl matches the portal's registered domain.
  // For now, allow any redirect (preview mode).

  const state = createState(portalId, jobId, redirectUrl);

  // Our callback URL on the same domain
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const callbackUrl = `${protocol}://${host}/api/auth/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
    scope: SCOPES,
  });

  return res.redirect(302, `${LINKEDIN_AUTH_URL}?${params.toString()}`);
}
