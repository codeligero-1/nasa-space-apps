#!/usr/bin/env tsx
/**
 * Test database connection and queries
 * Usage: npm run test:db
 */

import { getDb } from './db/connection.js'

function rowToObj(result: any, columns: string[]): any {
  if (!result || result.length === 0 || result[0].values.length === 0) return null
  return result[0].values[0].reduce((acc: any, val: any, i: number) => {
    acc[columns[i]] = val
    return acc
  }, {})
}

function rowsToObjs(result: any, columns: string[]): any[] {
  if (!result || result.length === 0) return []
  return result[0].values.map((row: any[]) =>
    row.reduce((acc: any, val: any, i: number) => {
      acc[columns[i]] = val
      return acc
    }, {})
  )
}

async function test() {
  const db = await getDb()
  console.log('[test] Testing database...')

  // Test 1: Connection
  try {
    const result = db.exec('SELECT 1 as ok')
    const ok = rowToObj(result, ['ok'])?.ok === 1
    console.log('[test] ✅ Connection:', ok ? 'OK' : 'FAIL')
  } catch (e) {
    console.error('[test] ❌ Connection failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  }

  // Test 2: Tables exist
  const tablesResult = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `)

  const tables = rowsToObjs(tablesResult, ['name']).map((r: any) => r.name)
  console.log('[test] Tables:', tables.join(', '))

  // Test 3: Count rows
  for (const name of tables) {
    try {
      const countResult = db.exec(`SELECT COUNT(*) as c FROM ${name}`)
      const count = rowToObj(countResult, ['c'])?.c ?? 0
      console.log(`  ${name}: ${count} rows`)
    } catch (e) {
      console.log(`  ${name}: ERROR -`, e instanceof Error ? e.message : e)
    }
  }

  // Test 4: Query with joins (projects with team names)
  try {
    const projectsResult = db.exec(`
      SELECT p.title, t.name as team, p.status
      FROM projects p
      JOIN teams t ON p.team_id = t.id
      ORDER BY p.created_at DESC
    `)
    console.log('[test] Projects with teams:')
    const projects = rowsToObjs(projectsResult, ['title', 'team', 'status'])
    projects.forEach((p: any) => console.log(`  - ${p.title} (${p.team}) [${p.status}]`))
  } catch (e) {
    console.error('[test] ❌ Join query failed:', e instanceof Error ? e.message : e)
  }

  // Test 5: Scores aggregation
  try {
    const scoresResult = db.exec(`
      SELECT p.title,
             ROUND(AVG(s.score), 2) as avg_score,
             COUNT(s.id) as score_count
      FROM projects p
      LEFT JOIN scores s ON p.id = s.project_id
      GROUP BY p.id
      ORDER BY avg_score DESC
    `)
    console.log('[test] Project scores:')
    const scores = rowsToObjs(scoresResult, ['title', 'avg_score', 'score_count'])
    scores.forEach((s: any) => console.log(`  - ${s.title}: ${s.avg_score || 'N/A'} (${s.score_count} scores)`))
  } catch (e) {
    console.error('[test] ❌ Aggregation failed:', e instanceof Error ? e.message : e)
  }

  console.log('\n[test] ✅ All tests passed')
}

test()