/**
 * LinkedIn OAuth callback endpoint.
 * GET /api/auth/callback?code=<code>&state=<state>
 *
 * Exchanges the auth code for tokens, fetches user profile,
 * and redirects back to the portal with the user data in a signed token.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

function getSigningSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET || '';
}

function getClientId(): string {
  return process.env.LINKEDIN_CLIENT_ID || '';
}

/** Verify and decode the state parameter */
function verifyState(state: string): { p: string; j: string; r: string; t: number } | null {
  const parts = state.split('.');
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  const expectedSig = createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url')
    .slice(0, 16);

  // Constant-time comparison
  if (sig.length !== expectedSig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());

    // Check state isn't too old (10 minute window)
    if (Date.now() - payload.t > 10 * 60 * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Create a signed token containing user profile data for the portal */
function createProfileToken(profile: {
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
  linkedinId: string;
}): string {
  const payload = JSON.stringify({
    ...profile,
    exp: Date.now() + 5 * 60 * 1000, // 5 minute expiry
  });

  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url')
    .slice(0, 16);

  return `${encoded}.${sig}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error: oauthError, error_description } = req.query;

  // Handle OAuth errors (user denied, etc.)
  if (oauthError) {
    console.error('LinkedIn OAuth error:', oauthError, error_description);
    // Try to redirect back with error
    if (state) {
      const decoded = verifyState(state as string);
      if (decoded?.r) {
        const url = new URL(decoded.r);
        url.searchParams.set('linkedin_error', oauthError as string);
        return res.redirect(302, url.toString());
      }
    }
    return res.status(400).json({ error: `LinkedIn auth failed: ${error_description || oauthError}` });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter.' });
  }

  // Verify state (CSRF protection + extract context)
  const stateData = verifyState(state as string);
  if (!stateData) {
    return res.status(400).json({ error: 'Invalid or expired state parameter.' });
  }

  const { r: redirectUrl, j: jobId, p: portalId } = stateData;

  // Exchange code for access token
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const callbackUrl = `${protocol}://${host}/api/auth/callback`;

  let accessToken: string;
  try {
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: getClientId(),
        client_secret: getSigningSecret(),
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('LinkedIn token exchange failed:', err);
      const url = new URL(redirectUrl);
      url.searchParams.set('linkedin_error', 'token_exchange_failed');
      return res.redirect(302, url.toString());
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('LinkedIn token exchange error:', err);
    const url = new URL(redirectUrl);
    url.searchParams.set('linkedin_error', 'token_exchange_failed');
    return res.redirect(302, url.toString());
  }

  // Fetch user profile
  let profile: { firstName: string; lastName: string; email: string; picture?: string; linkedinId: string };
  try {
    const userRes = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      console.error('LinkedIn userinfo failed:', err);
      const url = new URL(redirectUrl);
      url.searchParams.set('linkedin_error', 'profile_fetch_failed');
      return res.redirect(302, url.toString());
    }

    const userData = await userRes.json() as {
      sub: string;
      given_name?: string;
      family_name?: string;
      name?: string;
      email?: string;
      email_verified?: boolean;
      picture?: string;
    };

    profile = {
      firstName: userData.given_name || userData.name?.split(' ')[0] || '',
      lastName: userData.family_name || userData.name?.split(' ').slice(1).join(' ') || '',
      email: userData.email || '',
      picture: userData.picture,
      linkedinId: userData.sub,
    };
  } catch (err) {
    console.error('LinkedIn userinfo error:', err);
    const url = new URL(redirectUrl);
    url.searchParams.set('linkedin_error', 'profile_fetch_failed');
    return res.redirect(302, url.toString());
  }

  // Create signed profile token and redirect back to the portal
  const token = createProfileToken(profile);
  const url = new URL(redirectUrl);
  url.searchParams.set('linkedin_profile', token);
  if (jobId) url.searchParams.set('job', jobId);

  return res.redirect(302, url.toString());
}
