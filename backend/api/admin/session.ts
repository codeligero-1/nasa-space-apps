import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SESSION_COOKIE = 'vital_admin_session';

function getSessionId(req: VercelRequest): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== SESSION_COOKIE) {
      continue;
    }
    return part.slice(separatorIndex + 1).trim() || null;
  }
  return null;
}

async function validateAdminSession(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
  accessToken: string,
  refreshToken: string,
  userId: string
): Promise<{ userId: string; email: string } | null> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  // Try to get user with current token
  const { data, error } = await client.auth.getUser(accessToken);

  let user = data.user;

  if (error) {
    // Try refresh
    const { data: refreshed, error: refreshError } = await client.auth.refreshSession({
      refresh_token: refreshToken
    });
    if (refreshError || !refreshed.session || !refreshed.user) {
      return null;
    }
    user = refreshed.user;
  }

  if (!user || user.id !== userId) return null;

  // Verify admin role
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(userId);
  if (authError) return null;

  const account = authData.user as { email_confirmed_at?: string | null; banned_until?: string | null; deleted_at?: string | null };
  const { data: profile } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const now = Date.now();
  const banExpiry = account.banned_until ? Date.parse(account.banned_until) : null;
  const isNotBanned = banExpiry === null || (Number.isFinite(banExpiry) && banExpiry <= now);

  if (profile?.role !== 'admin' || !account.email_confirmed_at || account.deleted_at || !isNotBanned) {
    return null;
  }

  return { userId: user.id, email: user.email || '' };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
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

  // For serverless, we'd need to store session in Redis/KV
  // This is a simplified version - in production, fetch session from external store
  // For now, return unauthenticated
  res.status(200).json({ authenticated: false });
}