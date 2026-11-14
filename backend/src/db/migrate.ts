#!/usr/bin/env tsx
/**
 * Run pending migrations — for future schema changes
 * Usage: npm run db:migrate
 */

import { getDb, saveDb } from './connection.js'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, readFileSync } from 'fs'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')
const migrationsDir = resolve(__dirname, 'migrations')

async function migrate() {
  const db = await getDb()

  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const appliedResult = db.exec('SELECT id FROM _migrations')
  const applied = new Set(
    appliedResult.length > 0 ? appliedResult[0].values.map((r: any[]) => r[0]) : []
  )

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] ⏭  ${file} (already applied)`)
      continue
    }

    console.log(`[migrate] ▶  ${file}`)
    const sql = readFileSync(resolve(migrationsDir, file), 'utf-8')

    try {
      db.exec('BEGIN TRANSACTION')
      db.exec(sql)
      const stmt = db.prepare('INSERT INTO _migrations (id) VALUES (?)')
      stmt.run([file])
      stmt.free()
      db.exec('COMMIT')
      saveDb()
      console.log(`[migrate] ✅ ${file}`)
    } catch (e) {
      db.exec('ROLLBACK')
      console.error(`[migrate] ❌ ${file}:`, e instanceof Error ? e.message : e)
      process.exit(1)
    }
  }

  console.log('[migrate] Done')
}

migrate()