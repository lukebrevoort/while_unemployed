import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // processing api keys for supabase
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
