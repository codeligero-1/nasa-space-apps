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
  type: 'blood' | 'vitals' | 'radiation' | 'baseline' | 'hazard-knowledge'
  data: Record<string, unknown>
  recordedAt: string
}

export interface MissionControlAstronaut {
  id: string
  name: string
  role: string
  mission: string
  healthRecords: HealthRecord[]
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
  listMissionControlAstronauts(): Promise<MissionControlAstronaut[]>
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
    async listMissionControlAstronauts() {
      const { data: astronauts, error: astronautError } = await serviceClient
        .from('astronauts')
        .select('id, name, role, mission')
        .order('name', { ascending: true })
      if (astronautError) {
        throw new Error(`Unable to load astronaut roster: ${astronautError.message}`)
      }

      const { data: records, error: recordError } = await serviceClient
        .from('health_records')
        .select('id, astronaut_id, type, data, recorded_at')
        .order('recorded_at', { ascending: false })
      if (recordError) {
        throw new Error(`Unable to load astronaut health records: ${recordError.message}`)
      }

      return (astronauts || []).map((astronaut) => ({
        id: astronaut.id,
        name: astronaut.name,
        role: astronaut.role,
        mission: astronaut.mission,
        healthRecords: (records || [])
          .filter((record) => record.astronaut_id === astronaut.id)
          .map((record) => ({
            id: record.id,
            astronautId: record.astronaut_id,
            type: record.type,
            data: typeof record.data === 'string' ? JSON.parse(record.data) : record.data,
            recordedAt: record.recorded_at
          }))
      }))
    },

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
        astronautProfile: profile,
        astronautId: profile.id,
        nfcCardId: profile.nfcCardId,
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
    async listMissionControlAstronauts() {
      const result = db.exec('SELECT id, name, role, mission FROM astronauts ORDER BY name')
      const rows = result[0]?.values || []
      const columns = result[0]?.columns || []
      const astronauts = rows.map((row: unknown[]) =>
        Object.fromEntries(columns.map((column: string, index: number) => [column, row[index]]))
      )

      return astronauts.map((astronaut: Record<string, unknown>) => {
        const astronautId = String(astronaut.id).replace(/'/g, "''")
        const healthResult = db.exec(
          `SELECT id, astronaut_id, type, data, recorded_at FROM health_records WHERE astronaut_id = '${astronautId}' ORDER BY recorded_at DESC`
        )
        const recordRows = healthResult[0]?.values || []
        const recordColumns = healthResult[0]?.columns || []
        const healthRecords = recordRows.map((row: unknown[]) => {
          const record = Object.fromEntries(recordColumns.map(
            (column: string, index: number) => [column, row[index]]
          ))
          const recordType = String(record.type) as HealthRecord['type']
          return {
            id: String(record.id),
            astronautId: String(record.astronaut_id),
            type: recordType,
            data: typeof record.data === 'string' ? JSON.parse(record.data) : record.data,
            recordedAt: String(record.recorded_at)
          }
        })

        return {
          id: String(astronaut.id),
          name: String(astronaut.name),
          role: String(astronaut.role),
          mission: String(astronaut.mission),
          healthRecords
        }
      })
    },

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