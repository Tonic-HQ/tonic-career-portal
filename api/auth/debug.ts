import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    hasSecret: !!process.env.BETTER_AUTH_SECRET,
    hasUrl: !!process.env.BETTER_AUTH_URL,
    hasDbUrl: !!(process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL),
    dbUrlPrefix: (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '').substring(0, 20) + '...',
    hasResend: !!process.env.RESEND_API_KEY,
    nodeVersion: process.version,
  });
}
