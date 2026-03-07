/**
 * Better Auth client — used in React components
 */
import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : 'https://careersite.appsforstaffing.com',
  plugins: [
    magicLinkClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
