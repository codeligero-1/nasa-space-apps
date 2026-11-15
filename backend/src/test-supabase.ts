#!/usr/bin/env tsx
/**
 * Test Supabase connection and basic operations
 * Usage: npm run test:supabase
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')
config({ path: resolve(__dirname, '..', '..', '.env') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env')
  console.error('   Current dir:', __dirname)
  console.error('   SUPABASE_URL:', supabaseUrl ? 'set' : 'missing')
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'missing')
  process.exit(1)
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey)
const adminClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

async function test() {
  console.log('[supabase] Testing connection...')
  console.log(`[supabase] URL: ${supabaseUrl}`)

  // Test 1: Basic REST API reachability
  try {
    const { data, error } = await anonClient.from('_test_does_not_exist').select('*').limit(1)
    // Expect error PGRST116 (table not found) = API reachable
    if (error && error.code === 'PGRST116') {
      console.log('[supabase] ✅ REST API reachable')
    } else if (error) {
      console.log('[supabase] ⚠️  REST API error (may be auth):', error.message)
    } else {
      console.log('[supabase] ✅ REST API reachable (unexpected success)')
    }
  } catch (e) {
    console.error('[supabase] ❌ REST API unreachable:', e instanceof Error ? e.message : e)
  }

  // Test 2: Auth endpoint
  try {
    const { data, error } = await anonClient.auth.getSession()
    if (error) throw error
    console.log('[supabase] ✅ Auth endpoint reachable')
    console.log('   Session:', data.session ? 'active' : 'none')
  } catch (e) {
    console.error('[supabase] ❌ Auth failed:', e instanceof Error ? e.message : e)
  }

  // Test 3: Realtime (if admin key)
  if (adminClient) {
    try {
      const channel = adminClient.channel('test-channel')
      const subscription = await new Promise<{ ok: boolean; error?: any }>((resolve) => {
        const timeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 5000)
        channel.subscribe((status) => {
          clearTimeout(timeout)
          resolve({ ok: status === 'SUBSCRIBED', error: status !== 'SUBSCRIBED' ? status : undefined })
        })
      })
      await adminClient.removeChannel(channel)
      if (subscription.ok) {
        console.log('[supabase] ✅ Realtime subscription works')
      } else {
        console.log('[supabase] ⚠️  Realtime:', subscription.error)
      }
    } catch (e) {
      console.error('[supabase] ❌ Realtime failed:', e instanceof Error ? e.message : e)
    }
  } else {
    console.log('[supabase] ⏭  Realtime test skipped (no service role key)')
  }

  // Test 4: Storage (if admin key)
  if (adminClient) {
    try {
      const { data: buckets, error } = await adminClient.storage.listBuckets()
      if (error) throw error
      console.log('[supabase] ✅ Storage accessible')
      console.log('   Buckets:', buckets.map(b => b.name).join(', ') || 'none')
    } catch (e) {
      console.error('[supabase] ❌ Storage failed:', e instanceof Error ? e.message : e)
    }
  } else {
    console.log('[supabase] ⏭  Storage test skipped (no service role key)')
  }

  // Test 5: Check existing tables (if any)
  if (adminClient) {
    try {
      const { data, error } = await adminClient.rpc('get_tables', {})
      if (error && error.code !== 'PGRST202') { // function doesn't exist
        console.log('[supabase] Tables query:', error.message)
      } else if (data) {
        console.log('[supabase] Existing tables:', data.map((t: any) => t.tablename).join(', '))
      }
    } catch {
      // RPC not available, skip
    }
  }

  console.log('\n[supabase] Test complete')
}

test()