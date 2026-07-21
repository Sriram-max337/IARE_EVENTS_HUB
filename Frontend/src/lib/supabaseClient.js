import { createClient } from '@supabase/supabase-js'

// These env vars are unset in this mock build — api.js checks USE_MOCK before
// ever touching this client, so it's safe to import even without a project configured.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
