import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Ensure the URL looks like a career portal
  let targetUrl = url.trim();

  // Strip hash fragments
  targetUrl = targetUrl.replace(/#.*$/, '');

  // Strip trailing slash
  targetUrl = targetUrl.replace(/\/+$/, '');

  // Append /app.json if not already there
  if (!targetUrl.endsWith('/app.json')) {
    targetUrl += '/app.json';
  }

  // Basic validation
  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Validate it looks like an OSCP app.json
    if (!data.service?.corpToken || !data.service?.swimlane) {
      return res.status(422).json({
        error: 'That does not look like a Bullhorn Career Portal configuration.',
      });
    }

    // Return the config with CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: `Could not reach that URL: ${err.message || 'Unknown error'}`,
    });
  }
}
