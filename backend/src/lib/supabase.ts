import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env')
}

/**
 * Supabase client for browser/client-side use.
 * Uses anon key — respects Row Level Security.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * Create a server-only client with service role key (bypasses RLS).
 * Use ONLY in trusted server contexts (API routes, Edge Functions, scripts).
 */
export function createServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Type-safe database schema (generate with: npx supabase gen types typescript --project-id <ref> --schema public > types/database.ts)
 */
export type Database = {
  public: {
    Tables: {
      // Add your tables here after creating them in Supabase
      // Example:
      // profiles: {
      //   Row: { id: string; username: string; created_at: string }
      //   Insert: { id: string; username: string }
      //   Update: { username?: string }
      // }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']