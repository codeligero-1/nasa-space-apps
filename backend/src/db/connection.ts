import initSqlJs, { Database } from 'sql.js'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

/**
 * Database file location — override with DB_PATH env var
 * Default: nasa-space-apps/backend/data/app.db
 */
const dbPath = process.env.DB_PATH ?? resolve(__dirname, '..', 'data', 'app.db')

/**
 * Singleton database connection (sql.js runs in memory, persists to file)
 */
let db: Database | null = null
let sqlJs: any = null

export async function getDb(): Promise<Database> {
  if (!db) {
    // Ensure data directory exists
    const dataDir = resolve(dbPath, '..')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    // Initialize sql.js (loads WASM)
    sqlJs = await initSqlJs({
      locateFile: () => resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    })

    // Load existing database file if it exists
    let fileBuffer: Uint8Array | undefined
    if (existsSync(dbPath)) {
      fileBuffer = readFileSync(dbPath)
    }

    db = new sqlJs.Database(fileBuffer)
    console.log(`[db] Connected to ${dbPath}`)

    // Enable foreign keys
    db!.exec('PRAGMA foreign_keys = ON;')

    // Auto-save on changes (simple approach - save after each write)
    // For production, consider debouncing or explicit save calls
  }
  return db!
}

/**
 * Save database to disk
 */
export function saveDb(): void {
  if (db) {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
    console.log('[db] Saved to disk')
  }
}

/**
 * Close database (saves first)
 */
export function closeDb(): void {
  saveDb()
  if (db) {
    db.close()
    db = null
    console.log('[db] Connection closed')
  }
}

// Graceful shutdown
process.on('SIGINT', closeDb)
process.on('SIGTERM', closeDb)