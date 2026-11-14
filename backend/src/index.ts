/**
 * NASA Space Apps Backend Entrypoint
 *
 * Runtime switch: SQLite for local dev, Supabase for production
 * Set NODE_ENV=production to use Supabase
 */

const isProduction = process.env.NODE_ENV === 'production'

async function main() {
  console.log('[backend] Starting...')
  console.log(`[backend] Environment: ${isProduction ? 'production (Supabase)' : 'development (SQLite)'}`)

  if (isProduction) {
    // Production: Supabase
    const { supabase, createServiceClient } = await import('./lib/supabase.js')
    console.log('[backend] Supabase client initialized')
    console.log('[backend] URL:', process.env.SUPABASE_URL)

    // Test connection
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[backend] Supabase auth error:', error.message)
    } else {
      console.log('[backend] Supabase auth reachable')
    }

    return { db: supabase, admin: createServiceClient() }
  } else {
    // Development: SQLite
    const { getDb, closeDb } = await import('./db/connection.js')
    const db = await getDb()
    console.log('[backend] SQLite connected')

    // Test query
    const result = db.exec('SELECT 1 as ok')
    console.log('[backend] SQLite test:', result[0]?.values[0][0] === 1 ? 'OK' : 'FAIL')

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('[backend] Shutting down...')
      closeDb()
      process.exit(0)
    })
    process.on('SIGTERM', () => {
      console.log('[backend] Shutting down...')
      closeDb()
      process.exit(0)
    })

    return { db }
  }
}

main().catch(console.error)
