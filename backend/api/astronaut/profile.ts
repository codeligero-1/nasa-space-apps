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

interface AstronautProfile {
  id: string;
  name: string;
  role: string;
  mission: string;
  nfcCardId: string;
  avatarUrl: string | null;
  healthRecords: Array<{
    id: string;
    astronautId: string;
    type: 'blood' | 'vitals' | 'radiation';
    data: Record<string, unknown>;
    recordedAt: string;
  }>;
}

async function getAstronautProfile(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
  nfcCardId: string
): Promise<AstronautProfile | null> {
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  const { data: astronaut, error } = await serviceClient
    .from('astronauts')
    .select('*')
    .eq('nfc_card_id', nfcCardId)
    .maybeSingle();

  if (error || !astronaut) return null;

  const { data: healthRecords } = await serviceClient
    .from('health_records')
    .select('*')
    .eq('astronaut_id', astronaut.id)
    .order('recorded_at', { ascending: false });

  return {
    id: astronaut.id,
    name: astronaut.name,
    role: astronaut.role,
    mission: astronaut.mission,
    nfcCardId: astronaut.nfc_card_id,
    avatarUrl: astronaut.avatar_url,
    healthRecords: (healthRecords || []).map(r => ({
      id: r.id,
      astronautId: r.astronaut_id,
      type: r.type,
      data: r.data,
      recordedAt: r.recorded_at
    }))
  };
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
  res.status(401).json({ error: 'Not authenticated' });
}