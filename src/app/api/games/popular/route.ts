
import { NextResponse, type NextRequest } from 'next/server'
import { getPopularGames, shapeGame }     from '../../../../lib/igdb/fetch'
import { syncGamesToAlgolia }             from '../../../../lib/igdb/algolia/client'

export const revalidate = 3600  // Cache this route for 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 40)

  try {
    const raw    = await getPopularGames(limit)
    const games  = raw.map(shapeGame)

    void syncGamesToAlgolia(games)

    return NextResponse.json({ games })

  } catch (err) {
    console.error('[/api/games/popular]', err)
    return NextResponse.json(
      { error: 'Failed to fetch popular games.' },
      { status: 500 }
    )
  }
}