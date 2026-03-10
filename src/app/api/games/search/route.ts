
import { NextResponse, type NextRequest } from 'next/server'
import { algoliaSearch }                  from '../../../../lib/igdb/algolia/client'
import { searchGames, shapeGame }         from '../../../../lib/igdb/fetch'
import { syncGamesToAlgolia }             from '../../../../lib/igdb/algolia/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20)

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters.' },
      { status: 400 }
    )
  }

  const algoliaResults = await algoliaSearch(query, limit)

  if (algoliaResults.length >= 3) {
    return NextResponse.json({ results: algoliaResults, source: 'algolia' })
  }

  try {
    const igdbRaw    = await searchGames(query, limit)
    const igdbShaped = igdbRaw.map(shapeGame)

    void syncGamesToAlgolia(igdbShaped)

    return NextResponse.json({ results: igdbShaped, source: 'igdb' })

  } catch (err) {
    console.error('[/api/games/search]', err)
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    )
  }
}