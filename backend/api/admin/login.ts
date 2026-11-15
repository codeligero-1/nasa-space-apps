import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface AdminSessionCredentials {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface AdminAccount {
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  deleted_at?: string | null;
}

const SESSION_COOKIE = 'vital_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const REMEMBERED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isActiveAdminAccount(account: AdminAccount, profileRole: unknown, now = Date.now()): boolean {
  const banExpiry = account.banned_until ? Date.parse(account.banned_until) : null;
  const isNotBanned = banExpiry === null || (Number.isFinite(banExpiry) && banExpiry <= now);

  return profileRole === 'admin'
    && Boolean(account.email_confirmed_at)
    && !account.deleted_at
    && isNotBanned;
}

function isProviderFailure(error: { status?: number | null }): boolean {
  return error.status == null || error.status >= 500;
}

function cookieHeader(value: string, maxAgeSeconds?: number): string {
  const attributes = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }
  if (maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }
  return attributes.join('; ');
}

function expiredCookieHeader(): string {
  return cookieHeader('', 0);
}

async function verifyAdminAuth(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string
): Promise<boolean> {
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(userId);
  if (authError) {
    if (authError.status === 404) return false;
    throw new Error('Unable to verify administrator account');
  }

  const account = authData.user as typeof authData.user & AdminAccount;
  const { data: profile, error: profileError } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error('Unable to verify administrator role');

  return isActiveAdminAccount(account, profile?.role);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(503).json({ error: 'Supabase not configured' });
    return;
  }

  // Same-origin check
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    res.status(403).json({ error: 'Request origin was not accepted' });
    return;
  }
  try {
    const originUrl = new URL(origin);
    if (!((originUrl.protocol === 'http:' || originUrl.protocol === 'https:') &&
          originUrl.host.toLowerCase() === host.toLowerCase())) {
      res.status(403).json({ error: 'Request origin was not accepted' });
    return;
    }
  } catch {
    res.status(403).json({ error: 'Request origin was not accepted' });
    return;
  }

  // Rate limiting (basic in-memory - for production use Redis/Upstash)
  // Note: This resets on each function invocation on Vercel
  // For production, implement with Vercel KV or Upstash Redis

  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'Request must use JSON' });
    return;
  }

  const body = req.body as { username?: string; password?: string; remember?: boolean } | undefined;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Provide a username and password' });
    return;
  }

  const email = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const remember = body.remember === true;

  if (!email || email.length > 254 || !email.includes('@') || !password || password.length > 1024) {
    res.status(400).json({ error: 'Provide a valid username and password' });
    return;
  }

  // Create anonymous Supabase client for sign-in
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    if (isProviderFailure(error)) {
      res.status(503).json({ error: 'Authentication service unavailable' });
    return;
    }
    res.status(401).json({ error: 'Unable to authorize. Check your credentials and administrator access.' });
    return;
  }

  if (!data.session || !data.user) {
    res.status(401).json({ error: 'Unable to authorize. Check your credentials and administrator access.' });
    return;
  }

  // Verify admin role
  const authorized = await verifyAdminAuth(supabaseUrl, serviceRoleKey, data.user.id);
  if (!authorized) {
    await client.auth.signOut({ scope: 'local' });
    res.status(401).json({ error: 'Unable to authorize. Check your credentials and administrator access.' });
    return;
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const ttl = remember ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
  const sessionCookie = cookieHeader(sessionId, remember ? Math.floor(ttl / 1000) : undefined);

  res.setHeader('Set-Cookie', sessionCookie);
  res.status(200).json({ ok: true });
}