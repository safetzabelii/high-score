import { NextRequest, NextResponse } from "next/server"
import { getSeriesGames } from "@/lib/igdb/fetch"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const collectionId = _req.nextUrl.searchParams.get("collectionId")
  const franchiseId = _req.nextUrl.searchParams.get("franchiseId")

  if (!collectionId && !franchiseId) {
    return NextResponse.json({ games: [], seriesName: null })
  }

  const result = await getSeriesGames(
    collectionId ? Number(collectionId) : null,
    franchiseId ? Number(franchiseId) : null,
    Number(id)
  )

  return NextResponse.json(result)
}
