import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import type { AdminAuthProvider, AdminSessionCredentials } from './admin-auth.js'
import type { AstronautAuthProvider } from './astronaut-auth.js'
import { createAdminServer } from './server.js'

const approvedCredentials: AdminSessionCredentials = {
  userId: 'approved-admin-id',
  email: 'admin@example.test',
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token'
}

// Mock astronaut auth provider for testing
const mockAstronautAuthProvider: AstronautAuthProvider = {
  async verifyNfcCard() { return null },
  async validateSession() { return null },
  async signOut() { },
  async getDemoAstronaut() { return null },
  async listMissionControlAstronauts() {
    return [
      {
        id: 'astro-1',
        name: 'Alex Vance',
        role: 'Commander',
        mission: 'ARTEMIS-V',
        healthRecords: [{
          id: 'record-1',
          astronautId: 'astro-1',
          type: 'radiation',
          data: { dailyDose: 0.02 },
          recordedAt: '2026-01-02T00:00:00.000Z'
        }]
      },
      {
        id: 'astro-2',
        name: 'A. Reyes',
        role: 'Pilot',
        mission: 'ARTEMIS-V',
        healthRecords: [{
          id: 'record-2',
          astronautId: 'astro-2',
          type: 'vitals',
          data: { heartRate: 66 },
          recordedAt: '2026-01-03T00:00:00.000Z'
        }]
      }
    ]
  }
}

test('admin routes require an authorized session and logout revokes it', async (context) => {
  let signOutCount = 0
  const provider: AdminAuthProvider = {
    async signIn(email, password) {
      return email === approvedCredentials.email && password === 'correct-password'
        ? approvedCredentials
        : null
    },
    async validateSession(session) {
      return session.userId === approvedCredentials.userId ? session : null
    },
    async signOut() {
      signOutCount += 1
    }
  }
  const server = createAdminServer(provider, mockAstronautAuthProvider)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  context.after(async () => {
    server.close()
    await once(server, 'close')
  })

  const address = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${address.port}`

  const deniedRecords = await fetch(`${origin}/api/admin/astronauts`)
  assert.equal(deniedRecords.status, 401)

  const deniedAssistant = await fetch(`${origin}/api/pet-ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Summarize crew health.' })
  })
  assert.equal(deniedAssistant.status, 401)

  const deniedDashboard = await fetch(`${origin}/admin/dashboard`, { redirect: 'manual' })
  assert.equal(deniedDashboard.status, 302)
  assert.equal(deniedDashboard.headers.get('location'), '/admin/login')

  const directStaticDashboard = await fetch(`${origin}/html/admin/dashboard.html`)
  assert.equal(directStaticDashboard.status, 404)

  const crossOriginAttempt = await fetch(`${origin}/api/admin/login`, {
    method: 'POST',
    headers: {
      Origin: 'https://other.example',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: approvedCredentials.email, password: 'correct-password' })
  })
  assert.equal(crossOriginAttempt.status, 403)

  const regularAccountAttempt = await fetch(`${origin}/api/admin/login`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: 'crew@example.test', password: 'correct-password' })
  })
  assert.equal(regularAccountAttempt.status, 401)
  assert.equal(regularAccountAttempt.headers.get('set-cookie'), null)

  const loginResponse = await fetch(`${origin}/api/admin/login`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: approvedCredentials.email,
      password: 'correct-password',
      remember: true
    })
  })
  assert.equal(loginResponse.status, 200)
  const setCookie = loginResponse.headers.get('set-cookie')
  assert.ok(setCookie?.includes('HttpOnly'))
  assert.ok(setCookie?.includes('SameSite=Strict'))
  assert.ok(setCookie?.includes('Max-Age=2592000'))
  const sessionCookie = setCookie?.split(';', 1)[0]
  assert.ok(sessionCookie)

  const dashboardResponse = await fetch(`${origin}/admin/dashboard`, {
    headers: { Cookie: sessionCookie }
  })
  assert.equal(dashboardResponse.status, 200)
  assert.match(await dashboardResponse.text(), /Mainframe overview/)

  const sessionResponse = await fetch(`${origin}/api/admin/session`, {
    headers: { Cookie: sessionCookie }
  })
  assert.deepEqual(await sessionResponse.json(), {
    authenticated: true,
    email: approvedCredentials.email
  })

  const rosterResponse = await fetch(`${origin}/api/admin/astronauts`, {
    headers: { Cookie: sessionCookie }
  })
  assert.equal(rosterResponse.status, 200)
  const roster = await rosterResponse.json() as {
    astronauts: Array<{
      id: string
      healthRecords: Array<{ astronautId: string; id: string }>
      nfcCardId?: string
    }>
  }
  assert.deepEqual(roster.astronauts.map((astronaut) => astronaut.id), ['astro-1', 'astro-2'])
  assert.deepEqual(roster.astronauts.map((astronaut) =>
    astronaut.healthRecords.map((record) => record.astronautId)
  ), [['astro-1'], ['astro-2']])
  assert.ok(roster.astronauts.every((astronaut) => !('nfcCardId' in astronaut)))

  const logoutResponse = await fetch(`${origin}/api/admin/logout`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: sessionCookie
    }
  })
  assert.equal(logoutResponse.status, 200)
  assert.equal(signOutCount, 1)

  const afterLogout = await fetch(`${origin}/admin/dashboard`, {
    headers: { Cookie: sessionCookie },
    redirect: 'manual'
  })
  assert.equal(afterLogout.status, 302)
})
