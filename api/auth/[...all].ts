/**
 * Better Auth catch-all route handler
 * Handles all /api/auth/* requests via Web Standard API
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auth } from '../../src/lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Convert Vercel request to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'careersite.appsforstaffing.com';
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    }

    // Read body for non-GET requests
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        req.on('end', () => resolve(data));
      });
    }

    const webRequest = new Request(url, {
      method: req.method || 'GET',
      headers,
      body: body || undefined,
    });

    const response = await auth.handler(webRequest);

    // Convert Web Response back to Vercel response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    return res.send(responseBody);
  } catch (err: any) {
    console.error('Auth handler error:', err);
    return res.status(500).json({ error: 'Auth handler failed', detail: err.message });
  }
}
