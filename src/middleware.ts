import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First pass: update the request cookies so downstream reads are fresh
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild the response so we can attach the updated cookies
          supabaseResponse = NextResponse.next({ request })
          // Second pass: write the cookies onto the response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always use getUser() (not getSession()) in middleware.
  // getUser() re-validates the JWT with Supabase's servers, so it can't be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protected auth pages (logged-in users should not see these) ──────────
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── Protected app pages (guests must log in first) ────────────────────────
  const isProtectedPage =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings')

  if (!user && isProtectedPage) {
    const loginUrl = new URL('/login', request.url)
    // Pass along the attempted URL so we can redirect back after login
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Admin-only pages ──────────────────────────────────────────────────────
  // Requires a `role` claim in the JWT (set via Supabase's custom claims / RLS).
  // Remove this block if you don't need role-based access control yet.
  if (pathname.startsWith('/admin') && user) {
    const role = (user.app_metadata as Record<string, string>)?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Always return the supabaseResponse so cookies are forwarded correctly
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}