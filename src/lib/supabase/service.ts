import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Use ONLY in server-side code
// that needs to read data without user auth (e.g., OG image generation).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    // Fall back to anon key if service role not configured
    return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  return createClient(url, serviceKey)
}
