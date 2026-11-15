import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ASTRONAUT_SESSION_COOKIE = 'vital_astro_session';

function getAstronautSessionId(req: VercelRequest): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== ASTRONAUT_SESSION_COOKIE) {
      continue;
    }
    return part.slice(separatorIndex + 1).trim() || null;
  }
  return null;
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