import { NextResponse } from "next/server"
import { getFilteredGames, shapeGame } from "@/lib/igdb/fetch"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const filters = {
    genre: searchParams.get("genre") || undefined,
    year: searchParams.get("year") || undefined,
    rating: searchParams.get("rating") || undefined,
    platform: searchParams.get("platform") || undefined,
    sort: searchParams.get("sort") || undefined,
    limit: parseInt(searchParams.get("limit") || "30", 10),
    offset: parseInt(searchParams.get("offset") || "0", 10),
  }

  try {
    const rawGames = await getFilteredGames(filters)
    const games = rawGames.map(shapeGame)
    return NextResponse.json({ games, hasMore: rawGames.length === filters.limit })
  } catch (error) {
    console.error("Filter API Error:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
