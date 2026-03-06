import type { VercelRequest, VercelResponse } from '@vercel/node';

// Strip JSON5 comments and unquoted keys to make it valid JSON
function json5ToJson(text: string): string {
  // Remove single-line comments (// ...) but not inside strings
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inString) {
      result += ch;
      if (ch === '\\') {
        result += next || '';
        i += 2;
        continue;
      }
      if (ch === stringChar) inString = false;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      // Convert single quotes to double quotes
      result += '"';
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      // Skip to end of line
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      // Skip block comment
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  // Quote unquoted keys: word followed by colon
  result = result.replace(/(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');

  return result;
}

function cleanUrl(url: string): string {
  let u = url.trim();
  // Strip hash fragments
  u = u.replace(/#.*$/, '');
  // Strip trailing slash
  u = u.replace(/\/+$/, '');
  return u;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const baseUrl = cleanUrl(url);

  // Basic validation
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Try Tonic templater config first (static/config.json5), then fall back to app.json
  let configData: any = null;
  let source: 'json5' | 'appjson' = 'appjson';

  // Attempt 1: Tonic templater config (JSON5 format)
  try {
    const json5Url = `${baseUrl}/static/config.json5`;
    const json5Res = await fetch(json5Url, {
      headers: { 'Accept': '*/*' },
      signal: AbortSignal.timeout(8000),
    });
    if (json5Res.ok) {
      const text = await json5Res.text();
      // Check it's not an HTML error page
      if (!text.trim().startsWith('<!') && !text.trim().startsWith('<html')) {
        try {
          const jsonText = json5ToJson(text);
          configData = JSON.parse(jsonText);
          source = 'json5';
        } catch {
          // JSON5 parse failed, fall through to app.json
        }
      }
    }
  } catch {
    // Network error, fall through
  }

  // Attempt 2: Standard app.json
  if (!configData) {
    try {
      const appJsonUrl = `${baseUrl}/app.json`;
      const appJsonRes = await fetch(appJsonUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!appJsonRes.ok) {
        return res.status(appJsonRes.status).json({
          error: `Failed to fetch: ${appJsonRes.status} ${appJsonRes.statusText}`,
        });
      }
      configData = await appJsonRes.json();
      source = 'appjson';
    } catch (err: any) {
      return res.status(502).json({
        error: `Could not reach that URL: ${err.message || 'Unknown error'}`,
      });
    }
  }

  // Normalize the response based on source
  let normalized: any;

  if (source === 'json5') {
    // Tonic templater format — richer data
    const opts = configData.configOptions || {};
    const corpToken = opts.service?.corpToken;
    const swimlane = opts.service?.swimlane;

    if (!corpToken || !swimlane) {
      return res.status(422).json({
        error: 'That does not look like a Bullhorn Career Portal configuration.',
      });
    }

    normalized = {
      source: 'tonic-templater',
      companyName: opts.companyName ?? configData.baseName ?? 'Unknown Company',
      companyLogoPath: opts.companyLogoPath ?? '',
      companyUrl: opts.companyUrl ?? baseUrl,
      service: {
        corpToken,
        swimlane: String(swimlane),
        fields: opts.service?.fields,
      },
      // Extra Tonic templater fields
      colors: configData.customizeColors ? {
        topBarColor: configData.topBarColor,
        sideBarColor: configData.sideBarColor,
        linkColor: configData.linkColor,
      } : undefined,
      additionalJobCriteria: opts.additionalJobCriteria,
      eeoc: opts.eeoc,
      privacyConsent: opts.privacyConsent,
      languageDropdownOptions: opts.languageDropdownOptions,
      removePoweredByBullhorn: configData.removePoweredByBullhorn,
    };
  } else {
    // Standard app.json format
    const corpToken = configData.service?.corpToken;
    const swimlane = configData.service?.swimlane;

    if (!corpToken || !swimlane) {
      return res.status(422).json({
        error: 'That does not look like a Bullhorn Career Portal configuration.',
      });
    }

    normalized = {
      source: 'oscp-appjson',
      companyName: configData.companyName ?? 'Unknown Company',
      companyLogoPath: configData.companyLogoPath ?? '',
      companyUrl: configData.companyUrl ?? baseUrl,
      service: {
        corpToken,
        swimlane: String(swimlane),
        fields: configData.service?.fields,
      },
      additionalJobCriteria: configData.additionalJobCriteria,
      eeoc: configData.eeoc,
      privacyConsent: configData.privacyConsent,
    };
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json(normalized);
}
