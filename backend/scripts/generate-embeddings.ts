#!/usr/bin/env tsx
/**
 * Generate embeddings for all health records
 * Run with: npm run generate:embeddings
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { embedHealthRecords } from '../src/rag/embeddings.js'
import { getDb } from '../src/db/connection.js'

async function generateEmbeddings() {
  console.log('[embeddings] Starting embedding generation...')

  const isProduction = process.env.NODE_ENV === 'production'
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let records: any[] = []

  if (isProduction && supabaseUrl && serviceRoleKey) {
    // Production: Fetch from Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('health_records')
      .select('*')

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`)
    }

    records = data || []
    console.log(`[embeddings] Found ${records.length} records without embeddings`)
  } else {
    // Development: Fetch from SQLite
    const db = await getDb()

    const result = db.exec(
      `SELECT * FROM health_records`
    )

    if (result.length && result[0].values.length) {
      const columns = result[0].columns
      records = result[0].values.map((row: any[]) =>
        Object.fromEntries(columns.map((c: string, i: number) => [c, row[i]]))
      )
    }

    console.log(`[embeddings] Found ${records.length} records without embeddings`)
  }

  if (records.length === 0) {
    console.log('[embeddings] No records need embedding generation')
    return
  }

  // Process in batches to avoid rate limits
  const BATCH_SIZE = 20
  let processed = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    try {
      console.log(`[embeddings] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`)

      // Generate embeddings
      const embeddings = await embedHealthRecords(batch.map(r => ({
        id: r.id,
        astronaut_id: r.astronaut_id,
        type: r.type,
        data: typeof r.data === 'string' ? r.data : JSON.stringify(r.data),
        recorded_at: r.recorded_at
      })))

      // Store embeddings
      if (isProduction && supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        for (let j = 0; j < batch.length; j++) {
          const record = batch[j]
          const embedding = embeddings[j]

          await supabase
            .from('health_records')
            .update({ embedding: JSON.stringify(embedding) })
            .eq('id', record.id)
        }
      } else {
        const db = await getDb()
        const stmt = db.prepare(`UPDATE health_records SET embedding = ? WHERE id = ?`)

        for (let j = 0; j < batch.length; j++) {
          stmt.run([JSON.stringify(embeddings[j]), batch[j].id])
        }
        stmt.free()

        // Save SQLite database
        const { saveDb } = await import('../src/db/connection.js')
        saveDb()
      }

      processed += batch.length
      console.log(`[embeddings] Processed ${processed}/${records.length} records`)
    } catch (error) {
      console.error(`[embeddings] Batch failed:`, error)
      throw error
    }

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < records.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('[embeddings] Done!')
}

generateEmbeddings().catch(error => {
  console.error('[embeddings] Failed:', error)
  process.exit(1)
})