import { createClient } from '@supabase/supabase-js'

export interface AstronautProfile {
  id: string
  name: string
  role: string
  mission: string
  nfcCardId: string
  avatarUrl: string | null
  healthRecords: HealthRecord[]
}

export interface HealthRecord {
  id: string
  astronautId: string
  type: 'blood' | 'vitals' | 'radiation'
  data: Record<string, unknown>
  recordedAt: string
}

export interface AstronautSessionCredentials {
  astronautId: string
  nfcCardId: string
  accessToken: string
  refreshToken: string
}

export interface VerifyNfcResult {
  astronautProfile: AstronautProfile
  astronautId: string
  nfcCardId: string
  accessToken: string
  refreshToken: string
}

export interface AstronautAuthProvider {
  verifyNfcCard(nfcCardId: string): Promise<VerifyNfcResult | null>
  validateSession(session: AstronautSessionCredentials): Promise<AstronautSessionCredentials | null>
  signOut(session: AstronautSessionCredentials): Promise<void>
  getDemoAstronaut(): Promise<VerifyNfcResult | null>
}

export function createSupabaseAstronautAuthProvider(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): AstronautAuthProvider {
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

  async function isAuthorizedAstronaut(nfcCardId: string): Promise<AstronautProfile | null> {
    // First check if the NFC card is registered in the astronauts table
    const { data: astronaut, error } = await serviceClient
      .from('astronauts')
      .select('*')
      .eq('nfc_card_id', nfcCardId)
      .maybeSingle()

    if (error || !astronaut) {
      return null
    }

    // Fetch health records for this astronaut
    const { data: healthRecords } = await serviceClient
      .from('health_records')
      .select('*')
      .eq('astronaut_id', astronaut.id)
      .order('recorded_at', { ascending: false })

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
    }
  }

  return {
    async verifyNfcCard(nfcCardId: string) {
      const client = createAnonymousClient()

      // Verify the NFC card exists in our database
      const astronaut = await isAuthorizedAstronaut(nfcCardId)
      if (!astronaut) {
        return null
      }

      // Create a session for this astronaut
      // Note: We use a custom approach since astronauts don't have traditional auth
      // We'll create a pseudo-session using the NFC card ID
      const sessionId = crypto.randomUUID()
      const accessToken = `astro_${sessionId}`
      const refreshToken = `refresh_${sessionId}`

      // Store session in a sessions table or use a different approach
      // For now, we'll return the astronaut profile with session tokens
      return {
        astronautId: astronaut.id,
        nfcCardId: astronaut.nfcCardId,
        accessToken,
        refreshToken
      } as AstronautSessionCredentials & { astronautProfile: AstronautProfile }
    },

    async validateSession(session) {
      const client = createAnonymousClient()

      // Validate by checking if the astronaut still exists with this NFC card
      const astronaut = await isAuthorizedAstronaut(session.nfcCardId)
      if (!astronaut || astronaut.id !== session.astronautId) {
        return null
      }

      // In a real implementation, we'd verify the token signature
      // For now, return the session if the astronaut is valid
      return session
    },

    async signOut(session) {
      // For astronaut sessions, we just invalidate the local session
      // The NFC card itself remains valid for future logins
      const client = createAnonymousClient()
      // No-op for now, but could clear a server-side session store
    },

    async getDemoAstronaut() {
      // For demo mode, get the astronaut with the most health records
      const { data: astronauts } = await serviceClient
        .from('astronauts')
        .select('*, health_records!inner(id)')
        .order('health_records.recorded_at', { ascending: false })
        .limit(1)

      if (!astronauts || astronauts.length === 0) {
        return null
      }

      const astronaut = astronauts[0]

      // Fetch health records for this astronaut
      const { data: healthRecords } = await serviceClient
        .from('health_records')
        .select('*')
        .eq('astronaut_id', astronaut.id)
        .order('recorded_at', { ascending: false })

      const profile: AstronautProfile = {
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
      }

      const sessionId = crypto.randomUUID()
      const accessToken = `astro_demo_${sessionId}`
      const refreshToken = `refresh_demo_${sessionId}`

      return {
        astronautProfile: astronautProfile,
        astronautId: astronautProfile.id,
        nfcCardId: astronautProfile.nfcCardId,
        accessToken,
        refreshToken
      }
    }
  }
}

// SQLite version for local development
export function createSqliteAstronautAuthProvider(
  db: { exec: (sql: string) => any[] }
): AstronautAuthProvider {
  return {
    async verifyNfcCard(nfcCardId: string) {
      // Query SQLite database for astronaut with this NFC card
      const result = db.exec(
        `SELECT * FROM astronauts WHERE nfc_card_id = '${nfcCardId}' LIMIT 1`
      )

      if (!result.length || !result[0].values.length) {
        return null
      }

      const row = result[0].values[0]
      const columns = result[0].columns
      const astronaut = Object.fromEntries(columns.map((c: string, i: number) => [c, row[i]]))

      // Get health records
      const healthResult = db.exec(
        `SELECT * FROM health_records WHERE astronaut_id = '${astronaut.id}' ORDER BY recorded_at DESC`
      )

      const healthRecords = healthResult[0]?.values?.map((row: any[]) => {
        const rec = Object.fromEntries(healthResult[0].columns.map((c: string, i: number) => [c, row[i]]))
        return {
          id: rec.id,
          astronautId: rec.astronaut_id,
          type: rec.type,
          data: typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data,
          recordedAt: rec.recorded_at
        }
      }) || []

      const astronautProfile: AstronautProfile = {
        id: astronaut.id,
        name: astronaut.name,
        role: astronaut.role,
        mission: astronaut.mission,
        nfcCardId: astronaut.nfc_card_id,
        avatarUrl: astronaut.avatar_url,
        healthRecords
      }

      // Create session tokens
      const sessionId = crypto.randomUUID()
      const accessToken = `astro_${sessionId}`
      const refreshToken = `refresh_${sessionId}`

      return {
        astronautId: astronaut.id,
        nfcCardId: astronaut.nfc_card_id,
        accessToken,
        refreshToken,
        astronautProfile
      }
    },

    async validateSession(session) {
      const result = db.exec(
        `SELECT * FROM astronauts WHERE id = '${session.astronautId}' AND nfc_card_id = '${session.nfcCardId}' LIMIT 1`
      )

      if (!result.length || !result[0].values.length) {
        return null
      }

      return session
    },

    async signOut(session) {
      // No-op for SQLite version
    },

    async getDemoAstronaut() {
      // For demo mode, get the astronaut with the most health records
      const result = db.exec(
        `SELECT a.*, COUNT(hr.id) as record_count
         FROM astronauts a
         LEFT JOIN health_records hr ON hr.astronaut_id = a.id
         GROUP BY a.id
         ORDER BY record_count DESC
         LIMIT 1`
      )

      if (!result.length || !result[0].values.length) {
        return null
      }

      const row = result[0].values[0]
      const columns = result[0].columns
      const astronaut = Object.fromEntries(columns.map((c: string, i: number) => [c, row[i]]))

      // Get health records
      const healthResult = db.exec(
        `SELECT * FROM health_records WHERE astronaut_id = '${astronaut.id}' ORDER BY recorded_at DESC`
      )

      const healthRecords = healthResult[0]?.values?.map((row: any[]) => {
        const rec = Object.fromEntries(healthResult[0].columns.map((c: string, i: number) => [c, row[i]]))
        return {
          id: rec.id,
          astronautId: rec.astronaut_id,
          type: rec.type,
          data: typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data,
          recordedAt: rec.recorded_at
        }
      }) || []

      const astronautProfile: AstronautProfile = {
        id: astronaut.id,
        name: astronaut.name,
        role: astronaut.role,
        mission: astronaut.mission,
        nfcCardId: astronaut.nfc_card_id,
        avatarUrl: astronaut.avatar_url,
        healthRecords
      }

      const sessionId = crypto.randomUUID()
      const accessToken = `astro_demo_${sessionId}`
      const refreshToken = `refresh_demo_${sessionId}`

      return {
        astronautProfile: astronautProfile,
        astronautId: astronautProfile.id,
        nfcCardId: astronautProfile.nfcCardId,
        accessToken,
        refreshToken
      }
    }
  }
}