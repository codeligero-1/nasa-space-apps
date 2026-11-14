import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import type { AddressInfo } from 'node:net'
import type { AdminAuthProvider, AdminSessionCredentials } from './admin-auth.js'
import { createAdminServer } from './server.js'

const approvedCredentials: AdminSessionCredentials = {
  userId: 'approved-admin-id',
  email: 'admin@example.test',
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token'
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
  const server = createAdminServer(provider)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  context.after(async () => {
    server.close()
    await once(server, 'close')
  })

  const address = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${address.port}`

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
  assert.match(await dashboardResponse.text(), /Crew Dashboard/)

  const sessionResponse = await fetch(`${origin}/api/admin/session`, {
    headers: { Cookie: sessionCookie }
  })
  assert.deepEqual(await sessionResponse.json(), {
    authenticated: true,
    email: approvedCredentials.email
  })

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
