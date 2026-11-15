import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import {
  AuthProviderUnavailable,
  type AdminAuthProvider,
  type AdminSessionCredentials
} from './admin-auth.js'
import {
  type AstronautAuthProvider,
  type AstronautSessionCredentials,
  type VerifyNfcResult
} from './astronaut-auth.js'
import { handlePetAiChat } from './rag/chat.js'

const SESSION_COOKIE = 'vital_admin_session'
const ASTRONAUT_SESSION_COOKIE = 'vital_astro_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const REMEMBERED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_BODY_BYTES = 8 * 1024
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'"
].join('; ')

interface StoredSession extends AdminSessionCredentials {
  expiresAt: number
}

interface StoredAstronautSession extends AstronautSessionCredentials {
  expiresAt: number
}

interface LoginRateLimit {
  attempts: number
  expiresAt: number
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  response.setHeader('Cache-Control', 'no-store')
  if (process.env.NODE_ENV === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function sendRedirect(response: ServerResponse, location: string): void {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.end()
}

function cookieHeader(value: string, maxAgeSeconds?: number): string {
  const attributes = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict']
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure')
  }
  if (maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${maxAgeSeconds}`)
  }
  return attributes.join('; ')
}

function astronautCookieHeader(value: string, maxAgeSeconds?: number): string {
  const attributes = [`${ASTRONAUT_SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict']
  if (process.env.NODE_ENV === 'production') {
    attributes.push('Secure')
  }
  if (maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${maxAgeSeconds}`)
  }
  return attributes.join('; ')
}

function expiredCookieHeader(): string {
  return cookieHeader('', 0)
}

function expiredAstronautCookieHeader(): string {
  return astronautCookieHeader('', 0)
}

function getSessionId(request: IncomingMessage): string | null {
  const cookie = request.headers.cookie
  if (!cookie) {
    return null
  }

  for (const part of cookie.split(';')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== SESSION_COOKIE) {
      continue
    }
    return part.slice(separatorIndex + 1).trim() || null
  }
  return null
}

function getAstronautSessionId(request: IncomingMessage): string | null {
  const cookie = request.headers.cookie
  if (!cookie) {
    return null
  }

  for (const part of cookie.split(';')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== ASTRONAUT_SESSION_COOKIE) {
      continue
    }
    return part.slice(separatorIndex + 1).trim() || null
  }
  return null
}

function isSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin
  const host = request.headers.host
  if (!origin || !host) {
    return false
  }

  try {
    const originUrl = new URL(origin)
    return (originUrl.protocol === 'http:' || originUrl.protocol === 'https:')
      && originUrl.host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

function requireSameOrigin(request: IncomingMessage): void {
  if (!isSameOrigin(request)) {
    throw new HttpError(403, 'Request origin was not accepted.')
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, rejectBody) => {
    let totalBytes = 0
    let settled = false
    const chunks: Buffer[] = []

    request.on('data', (chunk: Buffer) => {
      if (settled) {
        return
      }

      totalBytes += chunk.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        settled = true
        rejectBody(new HttpError(413, 'Request body is too large.'))
        request.resume()
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      if (settled) {
        return
      }
      settled = true
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown)
      } catch {
        rejectBody(new HttpError(400, 'Request body must be valid JSON.'))
      }
    })

    request.on('error', (error: Error) => {
      if (!settled) {
        settled = true
        rejectBody(error)
      }
    })
  })
}

function parseLoginBody(value: unknown): { email: string; password: string; remember: boolean } {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'Provide a username and password.')
  }
  const body = value as Record<string, unknown>
  const email = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || email.length > 254 || !email.includes('@') || !password || password.length > 1024) {
    throw new HttpError(400, 'Provide a valid username and password.')
  }
  if (body.remember !== undefined && typeof body.remember !== 'boolean') {
    throw new HttpError(400, 'Remember device must be a boolean value.')
  }

  return { email, password, remember: body.remember === true }
}

async function readFileOr404(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new HttpError(404, 'Page or asset was not found.')
    }
    throw error
  }
}

function contentType(filePath: string): string {
  switch (filePath.slice(filePath.lastIndexOf('.')).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8'
    case '.css': return 'text/css; charset=utf-8'
    case '.js': return 'text/javascript; charset=utf-8'
    case '.svg': return 'image/svg+xml'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.ico': return 'image/x-icon'
    default: return 'application/octet-stream'
  }
}

async function sendFile(response: ServerResponse, filePath: string): Promise<void> {
  const contents = await readFileOr404(filePath)
  response.statusCode = 200
  response.setHeader('Content-Type', contentType(filePath))
  response.end(contents)
}

function resolvePublicAsset(projectRoot: string, pathname: string): string | null {
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const segments = decodedPath.split('/').filter(Boolean)
  if (!segments.length || !['assets', 'css', 'js'].includes(segments[0])) {
    return null
  }

  const filePath = resolve(projectRoot, ...segments)
  const relativePath = relative(projectRoot, filePath)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return null
  }
  return filePath
}

function getClientAddress(request: IncomingMessage): string {
  return request.socket.remoteAddress || 'unknown'
}

function checkLoginRateLimit(
  rateLimits: Map<string, LoginRateLimit>,
  address: string
): number | null {
  const now = Date.now()
  for (const [key, limit] of rateLimits) {
    if (limit.expiresAt <= now) {
      rateLimits.delete(key)
    }
  }

  const current = rateLimits.get(address)
  if (!current || current.expiresAt <= now) {
    rateLimits.set(address, { attempts: 1, expiresAt: now + LOGIN_WINDOW_MS })
    return null
  }
  if (current.attempts >= MAX_LOGIN_ATTEMPTS) {
    return Math.max(1, Math.ceil((current.expiresAt - now) / 1000))
  }

  current.attempts += 1
  return null
}

async function getValidSession(
  request: IncomingMessage,
  response: ServerResponse,
  sessions: Map<string, StoredSession>,
  authProvider: AdminAuthProvider
): Promise<StoredSession | null> {
  const sessionId = getSessionId(request)
  if (!sessionId) {
    return null
  }

  const stored = sessions.get(sessionId)
  if (!stored || stored.expiresAt <= Date.now()) {
    sessions.delete(sessionId)
    response.setHeader('Set-Cookie', expiredCookieHeader())
    return null
  }

  const validated = await authProvider.validateSession(stored)
  if (!validated || validated.userId !== stored.userId) {
    sessions.delete(sessionId)
    response.setHeader('Set-Cookie', expiredCookieHeader())
    return null
  }

  const updated: StoredSession = { ...validated, expiresAt: stored.expiresAt }
  sessions.set(sessionId, updated)
  return updated
}

export async function getValidAstronautSession(
  request: IncomingMessage,
  response: ServerResponse,
  sessions: Map<string, StoredAstronautSession>,
  authProvider: AstronautAuthProvider
): Promise<StoredAstronautSession | null> {
  const sessionId = getAstronautSessionId(request)
  if (!sessionId) {
    return null
  }

  const stored = sessions.get(sessionId)
  if (!stored || stored.expiresAt <= Date.now()) {
    sessions.delete(sessionId)
    response.setHeader('Set-Cookie', expiredAstronautCookieHeader())
    return null
  }

  const validated = await authProvider.validateSession(stored)
  if (!validated || validated.astronautId !== stored.astronautId) {
    sessions.delete(sessionId)
    response.setHeader('Set-Cookie', expiredAstronautCookieHeader())
    return null
  }

  const updated: StoredAstronautSession = { ...validated, expiresAt: stored.expiresAt }
  sessions.set(sessionId, updated)
  return updated
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  projectRoot: string,
  authProvider: AdminAuthProvider,
  astronautAuthProvider: AstronautAuthProvider,
  sessions: Map<string, StoredSession>,
  astronautSessions: Map<string, StoredAstronautSession>,
  rateLimits: Map<string, LoginRateLimit>
): Promise<void> {
  setSecurityHeaders(response)
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const { pathname } = requestUrl
  const method = request.method || 'GET'

  if (method === 'GET' && pathname === '/') {
    await sendFile(response, resolve(projectRoot, 'backend', 'public', 'html', 'index.html'))
    return
  }

  if (method === 'GET' && pathname === '/admin') {
    sendRedirect(response, '/admin/login')
    return
  }

  if (method === 'GET' && pathname === '/admin/login') {
    if (await getValidSession(request, response, sessions, authProvider)) {
      sendRedirect(response, '/admin/dashboard')
      return
    }
    await sendFile(response, resolve(projectRoot, 'backend', 'public', 'html', 'admin', 'login.html'))
    return
  }

  if (method === 'GET' && pathname === '/admin/dashboard') {
    const session = await getValidSession(request, response, sessions, authProvider)
    if (!session) {
      sendRedirect(response, '/admin/login')
      return
    }
    await sendFile(response, resolve(projectRoot, 'backend', 'templates', 'admin-dashboard.html'))
    return
  }

  if (method === 'POST' && pathname === '/api/admin/login') {
    requireSameOrigin(request)
    const retryAfter = checkLoginRateLimit(rateLimits, getClientAddress(request))
    if (retryAfter !== null) {
      response.setHeader('Retry-After', String(retryAfter))
      sendJson(response, 429, { error: 'Too many attempts. Try again later.' })
      return
    }

    if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'Request must use JSON.')
    }

    const body = parseLoginBody(await readJsonBody(request))
    const credentials = await authProvider.signIn(body.email, body.password)
    if (!credentials) {
      sendJson(response, 401, { error: 'Unable to authorize. Check your credentials and administrator access.' })
      return
    }

    const sessionId = randomBytes(32).toString('hex')
    const ttl = body.remember ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS
    sessions.set(sessionId, { ...credentials, expiresAt: Date.now() + ttl })
    response.setHeader('Set-Cookie', cookieHeader(
      sessionId,
      body.remember ? Math.floor(ttl / 1000) : undefined
    ))
    sendJson(response, 200, { ok: true })
    return
  }

  if (method === 'GET' && pathname === '/api/admin/session') {
    const session = await getValidSession(request, response, sessions, authProvider)
    sendJson(response, 200, session
      ? { authenticated: true, email: session.email }
      : { authenticated: false })
    return
  }

  if (method === 'POST' && pathname === '/api/admin/logout') {
    requireSameOrigin(request)
    const sessionId = getSessionId(request)
    const session = sessionId ? sessions.get(sessionId) : undefined
    if (sessionId) {
      sessions.delete(sessionId)
    }
    response.setHeader('Set-Cookie', expiredCookieHeader())

    if (session) {
      try {
        await authProvider.signOut(session)
      } catch (error) {
        console.error('[admin-auth] Supabase sign-out failed after local session revocation.', error)
      }
    }

    sendJson(response, 200, { ok: true })
    return
  }

  // ============================================================
  // ASTRONAUT AUTHENTICATION ENDPOINTS (NFC-based)
  // ============================================================

  if (method === 'POST' && pathname === '/api/astronaut/verify-nfc') {
    requireSameOrigin(request)

    if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      throw new HttpError(415, 'Request must use JSON.')
    }

    const body = await readJsonBody(request)
    if (!body || typeof body !== 'object') {
      throw new HttpError(400, 'Request body must be a JSON object.')
    }

    const bodyObj = body as Record<string, unknown>
    const nfcCardId = typeof bodyObj.nfcCardId === 'string' ? bodyObj.nfcCardId.trim().toUpperCase() : ''
    if (!nfcCardId) {
      throw new HttpError(400, 'NFC card ID is required.')
    }

    // Verify NFC card and get astronaut profile with session
    const result = await astronautAuthProvider.verifyNfcCard(nfcCardId)
    if (!result) {
      sendJson(response, 401, { error: 'Unregistered NFC card. Access denied.' })
      return
    }

    // Extract astronaut profile and session credentials from VerifyNfcResult
    const { astronautProfile, astronautId, nfcCardId: cardId, accessToken, refreshToken } = result

    // Create astronaut session
    const sessionId = randomBytes(32).toString('hex')
    const ttl = SESSION_TTL_MS
    astronautSessions.set(sessionId, { astronautId, nfcCardId: cardId, accessToken, refreshToken, expiresAt: Date.now() + ttl })
    response.setHeader('Set-Cookie', astronautCookieHeader(sessionId, Math.floor(ttl / 1000)))

    sendJson(response, 200, {
      ok: true,
      astronaut: astronautProfile
    })
    return
  }

  if (method === 'GET' && pathname === '/api/astronaut/session') {
    const session = await getValidAstronautSession(request, response, astronautSessions, astronautAuthProvider)
    if (!session) {
      sendJson(response, 200, { authenticated: false })
      return
    }

    // Get astronaut profile for the session
    const result = await astronautAuthProvider.verifyNfcCard(session.nfcCardId)
    if (!result) {
      sendJson(response, 200, { authenticated: false })
      return
    }

    sendJson(response, 200, {
      authenticated: true,
      astronaut: result.astronautProfile
    })
    return
  }

  if (method === 'POST' && pathname === '/api/astronaut/logout') {
    requireSameOrigin(request)
    const sessionId = getAstronautSessionId(request)
    const session = sessionId ? astronautSessions.get(sessionId) : undefined
    if (sessionId) {
      astronautSessions.delete(sessionId)
    }
    response.setHeader('Set-Cookie', expiredAstronautCookieHeader())

    if (session) {
      try {
        await astronautAuthProvider.signOut(session)
      } catch (error) {
        console.error('[astronaut-auth] Sign-out failed after local session revocation.', error)
      }
    }

    sendJson(response, 200, { ok: true })
    return
  }

  if (method === 'GET' && pathname === '/api/astronaut/profile') {
    const session = await getValidAstronautSession(request, response, astronautSessions, astronautAuthProvider)
    if (!session) {
      sendJson(response, 401, { error: 'Not authenticated.' })
      return
    }

    const result = await astronautAuthProvider.verifyNfcCard(session.nfcCardId)
    if (!result) {
      sendJson(response, 401, { error: 'Astronaut not found.' })
      return
    }

    sendJson(response, 200, {
      ok: true,
      astronaut: result.astronautProfile
    })
    return
  }

  // PET AI Medical Assistant chat endpoint
  if (method === 'POST' && pathname === '/api/pet-ai/chat') {
    let session = await getValidAstronautSession(request, response, astronautSessions, astronautAuthProvider)

    // Demo mode fallback: if no valid session, try to get demo astronaut
    if (!session) {
      const demoResult = await astronautAuthProvider.getDemoAstronaut()
      if (demoResult) {
        session = {
          astronautId: demoResult.astronautProfile.id,
          nfcCardId: demoResult.astronautProfile.nfcCardId,
          accessToken: 'demo_token',
          refreshToken: 'demo_refresh',
          expiresAt: Date.now() + SESSION_TTL_MS
        }
      }
    }

    if (!session) {
      sendJson(response, 401, { error: 'Not authenticated.' })
      return
    }

    await handlePetAiChat(request, response, astronautAuthProvider, session, astronautSessions)
    return
  }

  const assetPath = method === 'GET'
    ? resolvePublicAsset(projectRoot, pathname)
    : null
  if (assetPath) {
    await sendFile(response, assetPath)
    return
  }

  if (pathname.startsWith('/api/')) {
    throw new HttpError(404, 'API endpoint was not found.')
  }
  throw new HttpError(404, 'Page or asset was not found.')
}

export function createAdminServer(
  authProvider: AdminAuthProvider,
  astronautAuthProvider: AstronautAuthProvider,
  projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
): Server {
  const sessions = new Map<string, StoredSession>()
  const astronautSessions = new Map<string, StoredAstronautSession>()
  const rateLimits = new Map<string, LoginRateLimit>()

  return createServer((request, response) => {
    void handleRequest(request, response, projectRoot, authProvider, astronautAuthProvider, sessions, astronautSessions, rateLimits)
      .catch((error: unknown) => {
        if (response.headersSent) {
          response.destroy()
          return
        }

        const status = error instanceof HttpError
          ? error.status
          : error instanceof AuthProviderUnavailable
            ? 503
            : 500
        if (status >= 500) {
          console.error('[auth] Request failed.', error)
        }
        if (request.url?.startsWith('/api/')) {
          sendJson(response, status, {
            error: status === 503
              ? 'Authentication service is unavailable. Try again shortly.'
              : status === 500
                ? 'The request could not be completed.'
                : error instanceof Error ? error.message : 'Request was not accepted.'
          })
          return
        }
        response.statusCode = status
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end(status === 404 ? 'Not found.' : 'Request could not be completed.')
      })
  })
}
