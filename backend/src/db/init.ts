#!/usr/bin/env tsx
/**
 * Initialize database — run schema
 * Usage: npm run db:init
 */

import { getDb, saveDb } from './connection.js'
import { schema } from './schema.js'

async function init() {
  const db = await getDb()
  console.log('[db:init] Running schema...')

  try {
    db.exec(schema)
    saveDb()
    console.log('[db:init] ✅ Schema applied successfully')

    // Verify tables using db.exec (sql.js API)
    const result = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)

    console.log('[db:init] Tables created:')
    if (result.length > 0) {
      result[0].values.forEach((row: any[]) => console.log(`  - ${row[0]}`))
    }

  } catch (e) {
    console.error('[db:init] ❌ Failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  }
}

init()