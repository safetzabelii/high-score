

import { NextResponse, type NextRequest } from 'next/server'
import { getGameById, shapeGame }         from '../../../../lib/igdb/fetch'
import { syncGameToAlgolia }              from '../../../../lib/igdb/algolia/client'
import { createClient }                   from '../../../../lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = Number(rawId)
  
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid game ID.' }, { status: 400 })
  }

  try {
    const raw = await getGameById(id)

    if (!raw) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 })
    }

    const game = shapeGame(raw)

    const supabase = await createClient()
    supabase.from('games').upsert({
      id:           game.id,
      title:        game.title,
      slug:         game.slug,
      cover_url:    game.cover_url,
      release_year: game.release_year,
    }, { onConflict: 'id' })

    return NextResponse.json({ game })

  } catch (err) {
    console.error('[/api/games/[id]]', err)
    return NextResponse.json(
      { error: 'Failed to fetch game.' },
      { status: 500 }
    )
  }
}