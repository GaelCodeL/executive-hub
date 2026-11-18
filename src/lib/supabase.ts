import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Publishable project key: safe for browser use. Never put an OpenAI or Supabase secret here.
const supabaseUrl = 'https://sucjioctxiopwvzbjkwj.supabase.co'
const supabaseAnonKey = 'sb_publishable_LmT4U6IBCTQGMiHFUW_ntw_gE2MZB2B'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
