import { createServerClient } from '@supabase/ssr'

// Service role client — bypasses RLS. Use ONLY in server-side code
// that needs to read data without user auth (e.g., OG image generation).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(url, key, {
    cookies: {
      getAll() { return [] },
      setAll() {},
    },
  })
}
