#!/usr/bin/env tsx
/**
 * Sync preflight baselines from frontend demo data to database
 * Run with: npm run sync:baselines
 */

import { createClient } from '@supabase/supabase-js'
import { getDb, saveDb } from '../src/db/connection.js'
import { randomUUID } from 'crypto'

// Import the demo health data
// We'll recreate the baseline data here since it's in a JS file
const BASELINE_RECORDS = [
  {
    id: 'baseline-1',
    type: 'vitals',
    data: {
      heartRate: 62,
      bloodPressure: '110/70',
      spo2: 99,
      temperature: 36.6,
      respiratoryRate: 12
    },
    recordedAt: '2024-01-01T00:00:00.000Z' // T-365d
  },
  {
    id: 'baseline-2',
    type: 'blood',
    data: {
      hemoglobin: 14.5,
      wbc: 6.5,
      rbc: 5.0,
      platelets: 250,
      hematocrit: 43,
      glucose: 90
    },
    recordedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'baseline-3',
    type: 'radiation',
    data: {
      cumulativeDose: 0,
      doseRate: 0,
      gammaH2ax: 0.2,
      dicentrics: 0,
      micronuclei: 0.5,
      dnaRepair: 98
    },
    recordedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'baseline-4',
    type: 'vitals',
    data: {
      heartRate: 64,
      bloodPressure: '112/72',
      spo2: 99,
      temperature: 36.7,
      respiratoryRate: 13
    },
    recordedAt: '2025-01-01T00:00:00.000Z' // T-30d
  },
  {
    id: 'baseline-5',
    type: 'blood',
    data: {
      hemoglobin: 14.3,
      wbc: 6.7,
      rbc: 4.9,
      platelets: 248,
      hematocrit: 42,
      glucose: 89
    },
    recordedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'baseline-6',
    type: 'radiation',
    data: {
      cumulativeDose: 0,
      doseRate: 0,
      gammaH2ax: 0.3,
      dicentrics: 0,
      micronuclei: 0.6,
      dnaRepair: 97
    },
    recordedAt: '2025-01-01T00:00:00.000Z'
  }
]

// Test astronaut IDs from seed data
const TEST_ASTRONAUTS = [
  'astronaut-1', // Cmdr. A. Reyes
  'astronaut-2', // Pilot M. Chen
  'astronaut-3', // Dr. S. Okonkwo
  'astronaut-4'  // Eng. K. Tanaka
]

async function syncBaselines() {
  console.log('[sync-baselines] Starting baseline sync...')

  const isProduction = process.env.NODE_ENV === 'production'
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let synced = 0

  for (const astronautId of TEST_ASTRONAUTS) {
    console.log(`[sync-baselines] Syncing baselines for astronaut ${astronautId}...`)

    for (const baseline of BASELINE_RECORDS) {
      const recordId = `${baseline.id}-${astronautId}`

      if (isProduction && supabaseUrl && serviceRoleKey) {
        // Production: Supabase
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        const { error } = await supabase
          .from('health_records')
          .upsert({
            id: recordId,
            astronaut_id: astronautId,
            type: 'baseline',
            data: baseline.data,
            recorded_at: baseline.recordedAt
          }, { onConflict: 'id' })

        if (error) {
          console.error(`[sync-baselines] Failed to sync ${recordId}:`, error)
        } else {
          synced++
        }
      } else {
        // Development: SQLite
        const db = await getDb()

        const stmt = db.prepare(`
          INSERT OR REPLACE INTO health_records (id, astronaut_id, type, data, recorded_at)
          VALUES (?, ?, ?, ?, ?)
        `)

        stmt.run([
          recordId,
          astronautId,
          'baseline',
          JSON.stringify(baseline.data),
          baseline.recordedAt
        ])
        stmt.free()

        synced++
      }
    }
  }

  if (!isProduction) {
    saveDb()
  }

  console.log(`[sync-baselines] Done! Synced ${synced} baseline records`)
}

syncBaselines().catch(error => {
  console.error('[sync-baselines] Failed:', error)
  process.exit(1)
})