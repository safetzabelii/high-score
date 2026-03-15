import { NextResponse, type NextRequest } from 'next/server'
import { getGameVersions } from '@/lib/igdb/fetch'

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
    const editions = await getGameVersions(id)
    return NextResponse.json({ editions }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err) {
    console.error('[/api/games/[id]/versions] Route Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch editions.' },
      { status: 500 }
    )
  }
}