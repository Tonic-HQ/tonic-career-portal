/**
 * Auth client utilities for React components
 * Uses Supabase Auth with magic link (no passwords)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof window !== 'undefined'
  ? (document.querySelector('meta[name="supabase-url"]')?.getAttribute('content') || 'https://pgxqarvammykzgqhtdvz.supabase.co')
  : '';
const SUPABASE_ANON_KEY = typeof window !== 'undefined'
  ? (document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneHFhcnZhbW15a3pncWh0ZHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzEzMzAsImV4cCI6MjA4ODQwNzMzMH0.znsyUULkkDpJYGa2zPj2KBNil7xfc0qtdbA17e06wqc')
  : '';

export const supabase = typeof window !== 'undefined'
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'client';
}

export interface AuthSession {
  user: AuthUser;
  portals: { id: string; company_name: string; tier: string; created_at: string }[];
}

/** Send a magic link to the email address */
export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Auth not available' };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Get current session from the server */
export async function getSession(): Promise<AuthSession | null> {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  try {
    const res = await fetch('/api/auth/session', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    return await res.json() as AuthSession;
  } catch {
    return null;
  }
}

/** Sign out */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Check if user is authenticated */
export async function isAuthenticated(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}
