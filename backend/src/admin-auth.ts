import { createClient } from '@supabase/supabase-js'

export interface AdminSessionCredentials {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
}

export interface AdminAuthProvider {
  signIn(email: string, password: string): Promise<AdminSessionCredentials | null>
  validateSession(session: AdminSessionCredentials): Promise<AdminSessionCredentials | null>
  signOut(session: AdminSessionCredentials): Promise<void>
}

export class AuthProviderUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthProviderUnavailable'
  }
}

interface AdminAccount {
  email_confirmed_at?: string | null
  banned_until?: string | null
  deleted_at?: string | null
}

export function isActiveAdminAccount(account: AdminAccount, profileRole: unknown, now = Date.now()): boolean {
  const banExpiry = account.banned_until ? Date.parse(account.banned_until) : null
  const isNotBanned = banExpiry === null || (Number.isFinite(banExpiry) && banExpiry <= now)

  return profileRole === 'admin'
    && Boolean(account.email_confirmed_at)
    && !account.deleted_at
    && isNotBanned
}

function isProviderFailure(error: { status?: number | null }): boolean {
  return error.status == null || error.status >= 500
}

function asCredentials(session: {
  access_token: string
  refresh_token: string
  user: { id: string; email?: string | null }
}): AdminSessionCredentials | null {
  if (!session.user.id || !session.user.email) {
    return null
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token
  }
}

export function createSupabaseAdminAuthProvider(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): AdminAuthProvider {
  const createAnonymousClient = () => createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  async function isAuthorizedAdmin(userId: string): Promise<boolean> {
    const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(userId)
    if (authError) {
      if (authError.status === 404) {
        return false
      }
      throw new AuthProviderUnavailable('Unable to verify the administrator account.')
    }

    const account = authData.user as typeof authData.user & AdminAccount
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      throw new AuthProviderUnavailable('Unable to verify the administrator role.')
    }

    return isActiveAdminAccount(account, profile?.role)
  }

  return {
    async signIn(email, password) {
      const client = createAnonymousClient()
      const { data, error } = await client.auth.signInWithPassword({ email, password })

      if (error) {
        if (isProviderFailure(error)) {
          throw new AuthProviderUnavailable('The authentication service is unavailable.')
        }
        return null
      }

      if (!data.session || !data.user) {
        return null
      }

      const credentials = asCredentials({
        ...data.session,
        user: data.user
      })
      if (!credentials) {
        return null
      }

      if (!await isAuthorizedAdmin(credentials.userId)) {
        const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
        if (signOutError && isProviderFailure(signOutError)) {
          throw new AuthProviderUnavailable('Unable to revoke an unauthorized session.')
        }
        return null
      }

      return credentials
    },

    async validateSession(session) {
      const client = createAnonymousClient()
      let credentials = session
      let user: { id: string; email?: string | null } | null = null

      const { data, error } = await client.auth.getUser(session.accessToken)
      if (error) {
        if (isProviderFailure(error)) {
          throw new AuthProviderUnavailable('The authentication service is unavailable.')
        }

        const { data: refreshed, error: refreshError } = await client.auth.refreshSession({
          refresh_token: session.refreshToken
        })
        if (refreshError) {
          if (isProviderFailure(refreshError)) {
            throw new AuthProviderUnavailable('The authentication service is unavailable.')
          }
          return null
        }
        if (!refreshed.session || !refreshed.user) {
          return null
        }

        const updatedCredentials = asCredentials({
          ...refreshed.session,
          user: refreshed.user
        })
        if (!updatedCredentials) {
          return null
        }
        credentials = updatedCredentials
        user = refreshed.user
      } else {
        user = data.user
      }

      if (!user || user.id !== session.userId || !await isAuthorizedAdmin(user.id)) {
        return null
      }

      return {
        ...credentials,
        email: user.email || credentials.email
      }
    },

    async signOut(session) {
      const client = createAnonymousClient()
      const { error: sessionError } = await client.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken
      })

      if (sessionError) {
        if (isProviderFailure(sessionError)) {
          throw new AuthProviderUnavailable('Unable to revoke the administrator session.')
        }
        return
      }

      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error && isProviderFailure(error)) {
        throw new AuthProviderUnavailable('Unable to revoke the administrator session.')
      }
    }
  }
}
