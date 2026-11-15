#!/usr/bin/env tsx
/**
 * Migration script to add embedding column and baseline type to health_records
 * Run with: npm run migrate:embeddings
 */

import { getDb, saveDb } from '../src/db/connection.js'

async function migrate() {
  const db = await getDb()
  console.log('[migrate] Starting migration...')

  try {
    // Check if embedding column exists
    const columns = db.exec(`PRAGMA table_info(health_records)`)
    const hasEmbedding = columns[0]?.values?.some((row: any[]) => row[1] === 'embedding')

    if (!hasEmbedding) {
      console.log('[migrate] Adding embedding column to health_records...')
      db.exec(`ALTER TABLE health_records ADD COLUMN embedding TEXT`)
      console.log('[migrate] ✅ Added embedding column')
    } else {
      console.log('[migrate] embedding column already exists')
    }

    // Check if type constraint includes 'baseline'
    const tableInfo = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='health_records'`)
    const createSql = tableInfo[0]?.values?.[0]?.[0] || ''
    console.log('[migrate] Current CREATE TABLE SQL:', createSql)

    if (!createSql.includes("'baseline'")) {
      console.log('[migrate] Recreating health_records table with baseline type support...')

      // SQLite doesn't support modifying CHECK constraints, so recreate the table
      db.exec(`
        CREATE TABLE health_records_new (
          id TEXT PRIMARY KEY,
          astronaut_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('blood', 'vitals', 'radiation', 'baseline')),
          data TEXT NOT NULL,
          recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
          embedding TEXT
        )
      `)

      // Copy data
      db.exec(`INSERT INTO health_records_new SELECT * FROM health_records`)

      // Drop old table and rename
      db.exec(`DROP TABLE health_records`)
      db.exec(`ALTER TABLE health_records_new RENAME TO health_records`)

      console.log('[migrate] ✅ Recreated table with baseline type support')
    } else {
      console.log('[migrate] baseline type already supported')
    }

    // Verify the schema
    const result = db.exec(`PRAGMA table_info(health_records)`)
    console.log('[migrate] Current health_records schema:')
    result[0]?.values?.forEach((row: any[]) => {
      console.log(`  ${row[1]}: ${row[2]} ${row[3] ? 'NOT NULL' : ''} ${row[4] ? 'DEFAULT ' + row[4] : ''}`)
    })

    saveDb()
    console.log('[migrate] ✅ Migration completed successfully')
  } catch (error) {
    console.error('[migrate] ❌ Failed:', error)
    process.exit(1)
  }
}

migrate()