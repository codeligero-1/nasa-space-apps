#!/usr/bin/env tsx
/**
 * Push SQLite schema + data to Supabase (PostgreSQL)
 *
 * Step 1: Generates PostgreSQL SQL file (run in Supabase Dashboard → SQL Editor)
 * Step 2: Pushes data via REST API (works once tables exist)
 *
 * Usage: npm run push:supabase
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { getDb } from './db/connection.js'
import { schema } from './db/schema.js'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')
config({ path: resolve(__dirname, '..', '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Convert SQLite schema to PostgreSQL-compatible SQL
 * ORDER MATTERS: specific patterns must run BEFORE generic ones
 */
function toPostgres(sql: string): string {
  return sql
    // 1. First: specific timestamp column patterns (BEFORE generic datetime replacement)
    // Schema has: DEFAULT (datetime('now')) -- TWO closing parens
    .replace(/created_at TEXT NOT NULL DEFAULT \(datetime\('now'\)\)/g, 'created_at TIMESTAMPTZ NOT NULL DEFAULT now()')
    .replace(/updated_at TEXT NOT NULL DEFAULT \(datetime\('now'\)\)/g, 'updated_at TIMESTAMPTZ NOT NULL DEFAULT now()')
    .replace(/joined_at TEXT NOT NULL DEFAULT \(datetime\('now'\)\)/g, 'joined_at TIMESTAMPTZ NOT NULL DEFAULT now()')
    .replace(/submitted_at TEXT/g, 'submitted_at TIMESTAMPTZ')

    // 2. Then: generic datetime replacement
    .replace(/datetime\('now'\)/g, "now()")

    // 3. PRAGMA statements (remove)
    .replace(/PRAGMA foreign_keys = ON;/g, '')
    .replace(/PRAGMA journal_mode = WAL;/g, '')
    .replace(/PRAGMA synchronous = NORMAL;/g, '')
    .replace(/PRAGMA busy_timeout = 5000;/g, '')

    // 4. UUID extension for users table
    .replace(/CREATE TABLE IF NOT EXISTS users \(/g,
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS users (`)

    // 5. Primary keys: TEXT -> UUID
    .replace(/id TEXT PRIMARY KEY/g, 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    .replace(/INTEGER PRIMARY KEY/g, 'UUID PRIMARY KEY DEFAULT gen_random_uuid()')

    // 6. Foreign key columns: TEXT -> UUID
    .replace(/team_id TEXT NOT NULL/g, 'team_id UUID NOT NULL')
    .replace(/user_id TEXT NOT NULL/g, 'user_id UUID NOT NULL')
    .replace(/project_id TEXT NOT NULL/g, 'project_id UUID NOT NULL')
    .replace(/criterion_id TEXT NOT NULL/g, 'criterion_id UUID NOT NULL')
    .replace(/judge_id TEXT NOT NULL/g, 'judge_id UUID NOT NULL')
    .replace(/created_by TEXT NOT NULL/g, 'created_by UUID NOT NULL')
    .replace(/project_id TEXT,/g, 'project_id UUID,')  // teams.project_id

    // 7. Other column types
    .replace(/avatar_url TEXT/g, 'avatar_url TEXT')
    .replace(/is_public INTEGER NOT NULL DEFAULT 1/g, 'is_public BOOLEAN NOT NULL DEFAULT true')
    .replace(/score REAL NOT NULL/g, 'score NUMERIC(4,2) NOT NULL')
    .replace(/weight REAL NOT NULL DEFAULT 1.0/g, 'weight NUMERIC(3,2) NOT NULL DEFAULT 1.0')
    .replace(/max_score INTEGER NOT NULL DEFAULT 10/g, 'max_score INTEGER NOT NULL DEFAULT 10')

    // 8. CHECK constraints
    .replace(/status TEXT NOT NULL CHECK \(status IN \('draft', 'submitted', 'reviewing', 'scored', 'winner'\)\) DEFAULT 'draft'/g,
      "status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'reviewing', 'scored', 'winner')) DEFAULT 'draft'")
    .replace(/role TEXT NOT NULL CHECK \(role IN \('team', 'judge', 'admin', 'public'\)\)/g,
      "role TEXT NOT NULL CHECK (role IN ('team', 'judge', 'admin', 'public'))")
    .replace(/role TEXT NOT NULL CHECK \(role IN \('lead', 'member'\)\)/g,
      "role TEXT NOT NULL CHECK (role IN ('lead', 'member'))")
    .replace(/TEXT NOT NULL CHECK/g, 'TEXT NOT NULL CHECK')

    // 9. REFERENCES
    .replace(/REFERENCES users\(id\)/g, 'REFERENCES users(id)')
    .replace(/REFERENCES teams\(id\)/g, 'REFERENCES teams(id)')
    .replace(/REFERENCES projects\(id\)/g, 'REFERENCES projects(id)')
    .replace(/REFERENCES criteria\(id\)/g, 'REFERENCES criteria(id)')

    // 10. Other constraints
    .replace(/ON DELETE CASCADE/g, 'ON DELETE CASCADE')
    .replace(/UNIQUE \(project_id, judge_id, criterion_id\)/g, 'UNIQUE (project_id, judge_id, criterion_id)')
    .replace(/PRIMARY KEY \(team_id, user_id\)/g, 'PRIMARY KEY (team_id, user_id)')
}

async function generateSqlFile() {
  console.log('[push] Converting schema to PostgreSQL...')
  const pgSchema = toPostgres(schema)

  const outputPath = resolve(__dirname, '..', '..', 'supabase-schema.sql')
  writeFileSync(outputPath, pgSchema)
  console.log(`[push] ✅ Schema saved to: ${outputPath}`)
  console.log('[push]   → Run this in Supabase Dashboard → SQL Editor')

  return pgSchema
}

async function pushData() {
  console.log('[push] Reading SQLite data...')
  const sqliteDb = await getDb()

  const tables = [
    'users', 'teams', 'team_members', 'projects',
    'criteria', 'scores', 'comments'
  ]

  let totalRows = 0

  for (const table of tables) {
    console.log(`[push] Syncing ${table}...`)
    const result = sqliteDb.exec(`SELECT * FROM ${table}`)

    if (result.length === 0 || result[0].values.length === 0) {
      console.log(`  No data in ${table}`)
      continue
    }

    const columns = result[0].columns
    const rows = result[0].values.map((row: any[]) => {
      const obj: any = {}
      columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })

    const pgRows = rows.map(row => {
      const converted: any = {}
      for (const [key, value] of Object.entries(row)) {
        if (value === 0 || value === 1) {
          // Boolean columns (is_public)
          if (key === 'is_public') {
            converted[key] = value === 1
          } else {
            converted[key] = value
          }
        } else if (typeof value === 'string' && key.endsWith('_at') && value) {
          // Timestamps - ensure ISO format
          converted[key] = value
        } else {
          converted[key] = value
        }
      }
      return converted
    })

    const batchSize = 100
    for (let i = 0; i < pgRows.length; i += batchSize) {
      const batch = pgRows.slice(i, i + batchSize)
      const { error } = await admin.from(table).upsert(batch, { onConflict: 'id' })
      if (error) {
        console.error(`  ❌ Failed:`, error.message)
        if (error.code === 'PGRST116') {
          console.log(`  ⏭ Table ${table} doesn't exist yet - run the generated SQL first`)
        }
        throw error
      }
    }
    console.log(`  ✅ ${pgRows.length} rows`)
    totalRows += pgRows.length
  }

  console.log(`\n[push] Total rows pushed: ${totalRows}`)
}

async function main() {
  console.log('[push] Starting SQLite → Supabase sync...\n')

  try {
    await generateSqlFile()
    console.log('')
    await pushData()
    console.log('\n[push] ✅ Data push complete!')
    console.log('[push] 📋 Next: Run supabase-schema.sql in Supabase Dashboard → SQL Editor')
  } catch (e) {
    console.error('\n[push] ❌ Failed:', e instanceof Error ? e.message : e)
    if ((e as any).code === 'PGRST116') {
      console.log('[push] Tables don\'t exist yet. Run the generated supabase-schema.sql first.')
    }
    process.exit(1)
  }
}

main()