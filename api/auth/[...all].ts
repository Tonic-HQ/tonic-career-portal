/**
 * Auth API routes via Supabase Auth (magic link)
 *
 * POST /api/auth/magic-link — send magic link
 * GET  /api/auth/callback — handle magic link redirect
 * GET  /api/auth/session — check current session
 * POST /api/auth/signout — sign out
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const INTERNAL_DOMAINS = ['tonichq.com', 'bellwetherit.com'];

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

function isInternalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return INTERNAL_DOMAINS.includes(domain);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url || '').replace(/^\/api\/auth\/?/, '').split('?')[0];

  // POST /api/auth/magic-link — send magic link email
  if (req.method === 'POST' && path === 'magic-link') {
    const { email } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!email) return res.status(400).json({ error: 'Email required' });

    const supabase = getAnonClient();
    if (!supabase) return res.status(503).json({ error: 'Auth not configured' });

    const redirectTo = `https://careersite.appsforstaffing.com/api/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, message: 'Magic link sent' });
  }

  // GET /api/auth/callback — handle magic link redirect
  if (req.method === 'GET' && path === 'callback') {
    // Supabase redirects here with tokens in the hash fragment
    // Since hash fragments don't reach the server, we serve a page that reads them
    const html = `<!DOCTYPE html>
<html><head><title>Signing in...</title></head>
<body>
<script>
  // Supabase puts tokens in the hash fragment
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  
  if (accessToken) {
    // Store in localStorage for Supabase client to pick up
    const data = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: params.get('token_type') || 'bearer',
      expires_in: parseInt(params.get('expires_in') || '3600'),
      expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get('expires_in') || '3600'),
    };
    localStorage.setItem('sb-${(process.env.SUPABASE_URL || '').match(/\/\/([^.]+)/)?.[1] || 'app'}-auth-token', JSON.stringify(data));
    window.location.href = '/admin';
  } else {
    // Check for error
    const error = params.get('error_description') || params.get('error');
    if (error) {
      document.body.innerHTML = '<p>Error: ' + error + '</p><a href="/admin">Try again</a>';
    } else {
      // Maybe code-based flow
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        window.location.href = '/admin?code=' + code;
      } else {
        window.location.href = '/admin';
      }
    }
  }
</script>
<p>Signing you in...</p>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // GET /api/auth/session — check session (pass token in Authorization header)
  if (req.method === 'GET' && path === 'session') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Auth not configured' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });

    const role = isInternalEmail(user.email || '') ? 'admin' : 'client';

    // Get user's portals
    let portals: any[] = [];
    if (role === 'admin') {
      // Admins see all portals
      const { data } = await supabase.from('portals').select('id, company_name, tier, created_at').order('created_at', { ascending: false });
      portals = data || [];
    } else {
      // Clients see only their portals (by owner_email match)
      const { data } = await supabase.from('portals').select('id, company_name, tier, created_at').eq('owner_email', user.email);
      portals = data || [];
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role,
      },
      portals,
    });
  }

  // POST /api/auth/signout
  if (req.method === 'POST' && path === 'signout') {
    // Client-side handles token removal; just confirm
    return res.json({ ok: true });
  }

  // GET /api/auth/ok — health check
  if (path === 'ok' || path === '') {
    return res.json({ status: 'ok', auth: 'supabase' });
  }

  return res.status(404).json({ error: 'Unknown auth endpoint' });
}
