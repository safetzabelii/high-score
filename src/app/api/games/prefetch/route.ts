
import { NextResponse, type NextRequest } from 'next/server'
import { getCachedGameBySlug } from '@/lib/igdb/fetch'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    // This call checks Supabase cache first, then IGDB if needed.
    // The game data gets written to cache as a side effect, so the
    // actual game detail page server component will find it cached.
    const game = await getCachedGameBySlug(slug)

    return NextResponse.json(
      { ok: true, cached: !!game },
      {
        status: 200,
        headers: {
          // Cache this response at the CDN edge for 1 hour
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch {
    // Prefetch failures are silent — the game page will still work,
    // it'll just be slower (fetching from IGDB directly)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}