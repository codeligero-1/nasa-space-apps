import type { VercelRequest, VercelResponse } from '@vercel/node';

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

function expiredCookieHeader(): string {
  const attributes = [`${ASTRONAUT_SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure');
  }
  return attributes.join('; ');
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

  // Clear cookie
  res.setHeader('Set-Cookie', expiredCookieHeader());

  res.status(200).json({ ok: true });
}