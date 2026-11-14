import assert from 'node:assert/strict'
import test from 'node:test'
import { isActiveAdminAccount } from './admin-auth.js'

test('admin access requires an admin profile, a confirmed email, and an active account', () => {
  const now = Date.now()
  const confirmedAccount = {
    email_confirmed_at: new Date(now - 60_000).toISOString(),
    banned_until: null,
    deleted_at: null
  }

  assert.equal(isActiveAdminAccount(confirmedAccount, 'admin', now), true)
  assert.equal(isActiveAdminAccount(confirmedAccount, 'team', now), false)
  assert.equal(isActiveAdminAccount({ ...confirmedAccount, email_confirmed_at: null }, 'admin', now), false)
  assert.equal(isActiveAdminAccount({
    ...confirmedAccount,
    banned_until: new Date(now + 60_000).toISOString()
  }, 'admin', now), false)
  assert.equal(isActiveAdminAccount({
    ...confirmedAccount,
    deleted_at: new Date(now - 1_000).toISOString()
  }, 'admin', now), false)
})
