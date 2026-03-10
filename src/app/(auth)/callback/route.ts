import { createClient } from '../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This route is called after a user clicks the confirmation link in their email.
// Supabase appends a `code` query param which we exchange for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Where to send the user after confirming. Defaults to home.
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send them to an error page or back to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}