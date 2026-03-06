/**
 * LinkedIn profile token utilities — client-side.
 * Decodes the signed profile token received from the OAuth callback.
 */

export interface LinkedInProfile {
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
  linkedinId: string;
}

/**
 * Check URL for LinkedIn profile token (set by OAuth callback redirect).
 * Returns the profile data if present and not expired.
 * Cleans the token from the URL to avoid leaking it in browser history.
 */
export function consumeLinkedInProfile(): LinkedInProfile | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('linkedin_profile');
  const error = params.get('linkedin_error');

  // Clean LinkedIn params from URL
  if (token || error) {
    params.delete('linkedin_profile');
    params.delete('linkedin_error');
    params.delete('job');
    const cleanUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', cleanUrl);
  }

  if (error) {
    console.warn('LinkedIn auth error:', error);
    return null;
  }

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    // Decode payload (we can't verify the signature client-side, but that's fine —
    // the data came from our own server via redirect, not from user input)
    const payload = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry
    if (payload.exp && Date.now() > payload.exp) {
      console.warn('LinkedIn profile token expired');
      return null;
    }

    return {
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      email: payload.email || '',
      picture: payload.picture,
      linkedinId: payload.linkedinId || '',
    };
  } catch (err) {
    console.error('Failed to decode LinkedIn profile token:', err);
    return null;
  }
}

/**
 * Build the LinkedIn OAuth initiation URL.
 * Points to our serverless function which handles the redirect to LinkedIn.
 */
export function buildLinkedInAuthUrl(portalId: string, jobId: string | number, currentUrl: string): string {
  const apiBase = typeof window !== 'undefined' ? window.location.origin : 'https://appsforstaffing.com';
  const params = new URLSearchParams({
    portal: portalId,
    job: String(jobId),
    redirect: currentUrl,
  });
  return `${apiBase}/api/auth/linkedin?${params.toString()}`;
}
