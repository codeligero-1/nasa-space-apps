import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ASTRONAUT_SESSION_COOKIE = 'vital_astro_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

function astronautCookieHeader(value: string, maxAgeSeconds?: number): string {
  const attributes = [`${ASTRONAUT_SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }
  if (maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }
  return attributes.join('; ');
}

async function verifyNfcCard(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
  nfcCardId: string
): Promise<AstronautProfile | null> {
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  // Find astronaut by NFC card
  const { data: astronaut, error } = await serviceClient
    .from('astronauts')
    .select('*')
    .eq('nfc_card_id', nfcCardId)
    .maybeSingle();

  if (error || !astronaut) return null;

  // Fetch health records
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

  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'Request must use JSON' });
    return;
  }

  const body = req.body as { nfcCardId?: string } | undefined;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return;
  }

  const nfcCardId = typeof body.nfcCardId === 'string' ? body.nfcCardId.trim().toUpperCase() : '';
  if (!nfcCardId) {
    res.status(400).json({ error: 'NFC card ID is required' });
    return;
  }

  try {
    const astronaut = await verifyNfcCard(supabaseUrl, anonKey, serviceRoleKey, nfcCardId);
    if (!astronaut) {
      res.status(401).json({ error: 'Unregistered NFC card. Access denied.' });
    return;
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const ttl = SESSION_TTL_MS;
    const sessionCookie = astronautCookieHeader(sessionId, Math.floor(ttl / 1000));

    res.setHeader('Set-Cookie', sessionCookie);
    res.status(200).json({
      ok: true,
      astronaut
    });
  } catch (error) {
    console.error('NFC verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
}