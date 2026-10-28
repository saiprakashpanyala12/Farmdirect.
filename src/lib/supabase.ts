import { createClient } from '@supabase/supabase-js'
import { IS_DEMO_MODE, SUPABASE_CONFIGURED, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './constants'

export { IS_DEMO_MODE }

export const supabase = IS_DEMO_MODE || !SUPABASE_CONFIGURED
  ? null
  : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
