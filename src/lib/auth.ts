/**
 * Better Auth server configuration
 *
 * Magic link only — no passwords.
 * Internal users (@tonichq.com) get admin role automatically.
 * All others get 'client' role and see only their own portals.
 */
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';

const INTERNAL_DOMAINS = ['tonichq.com', 'bellwetherit.com'];

function isInternalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return INTERNAL_DOMAINS.includes(domain);
}

export const auth = betterAuth({
  database: {
    type: 'postgres',
    url: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '',
  },
  secret: process.env.BETTER_AUTH_SECRET || '',
  baseURL: process.env.BETTER_AUTH_URL || 'https://careersite.appsforstaffing.com',
  basePath: '/api/auth',
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Use Resend to send the magic link email
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
          console.error('RESEND_API_KEY not configured — magic link not sent');
          console.log('Magic link URL (dev):', url);
          return;
        }

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Tonic Career Portal <noreply@appsforstaffing.com>',
            to: email,
            subject: 'Sign in to Tonic Career Portal',
            html: `
              <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #7c3aed);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </div>
                </div>
                <h1 style="font-size: 24px; font-weight: 700; color: #111827; text-align: center; margin: 0 0 8px;">
                  Sign in to Tonic Career Portal
                </h1>
                <p style="font-size: 15px; color: #6b7280; text-align: center; margin: 0 0 32px; line-height: 1.6;">
                  Click the button below to sign in. This link expires in 5 minutes.
                </p>
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #7c3aed); color: white; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 12px;">
                    Sign In
                  </a>
                </div>
                <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
                  If you didn't request this email, you can safely ignore it.
                </p>
                <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0 16px;" />
                <p style="font-size: 12px; color: #d1d5db; text-align: center; margin: 0;">
                  Tonic Career Portal by <a href="https://tonichq.com" style="color: #d1d5db;">Tonic HQ</a>
                </p>
              </div>
            `,
          }),
        });
      },
      expiresIn: 300, // 5 minutes
      disableSignUp: false, // Allow self-signup
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'client',
        input: false, // Can't be set by user
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-assign admin role for internal emails
          if (user.email && isInternalEmail(user.email)) {
            return { data: { ...user, role: 'admin' } };
          }
          return { data: { ...user, role: 'client' } };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
