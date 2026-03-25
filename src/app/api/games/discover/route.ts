import { NextResponse } from "next/server"
import {
  getPopularThisWeek,
  getAnticipatedGames,
  getRecentReleases,
  getTopRatedGames,
  getHiddenGems,
  getComingSoon,
  getGamesByGenre,
  shapeGame
} from "@/lib/igdb/fetch"
import { createClient } from "@/lib/supabase/server"

// Mapping of categories to fetch functions or IDs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  if (!category) {
    return NextResponse.json({ error: "Missing category parameter" }, { status: 400 })
  }

  try {
    let rawGames = []

    switch (category) {
      case "popular":
        rawGames = await getPopularThisWeek(limit, offset)
        break
      case "anticipated":
        rawGames = await getAnticipatedGames(limit, offset)
        break
      case "recent":
        rawGames = await getRecentReleases(limit, offset)
        break
      case "topRated":
        rawGames = await getTopRatedGames(limit, offset)
        break
      case "rpgs":
        rawGames = await getGamesByGenre(12, limit, offset)
        break
      case "indies":
        rawGames = await getGamesByGenre(32, limit, offset)
        break
      case "shooters":
        rawGames = await getGamesByGenre(5, limit, offset)
        break
      case "adventure":
        rawGames = await getGamesByGenre(31, limit, offset)
        break
      case "strategy":
        rawGames = await getGamesByGenre(15, limit, offset)
        break
      case "platformers":
        rawGames = await getGamesByGenre(8, limit, offset)
        break
      case "fighting":
        rawGames = await getGamesByGenre(4, limit, offset)
        break
      case "racing":
        rawGames = await getGamesByGenre(10, limit, offset)
        break
      case "sports":
        rawGames = await getGamesByGenre(14, limit, offset)
        break
      case "simulators":
        rawGames = await getGamesByGenre(13, limit, offset)
        break
      case "puzzle":
        rawGames = await getGamesByGenre(9, limit, offset)
        break
      case "arcade":
        rawGames = await getGamesByGenre(33, limit, offset)
        break
      case "hiddenGems":
        rawGames = await getHiddenGems(limit, offset)
        break
      case "comingSoon":
        rawGames = await getComingSoon(limit, offset)
        break
      case "community": {
        // For community, we fetch from Supabase — over-fetch to get enough unique games
        const supabase = await createClient()
        const fetchSize = (limit + offset) * 3 // over-fetch to account for duplicates
        const { data } = await (supabase
          .from("game_logs")
          .select("game_id, games(id, title, slug, cover_url, release_year)")
          .order("created_at", { ascending: false })
          .limit(fetchSize) as any)

        const seenIds = new Set<number>()
        const allUnique: any[] = []
        for (const log of (data ?? [])) {
          if (log.games && !seenIds.has(log.game_id)) {
            seenIds.add(log.game_id)
            allUnique.push(log.games)
          }
        }
        const communityGames = allUnique.slice(offset, offset + limit)
        return NextResponse.json({ games: communityGames, hasMore: allUnique.length > offset + limit })
      }
      default:
        return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    const games = rawGames.map(shapeGame)
    return NextResponse.json({ games, hasMore: rawGames.length === limit })
  } catch (error) {
    console.error("Discover API Error:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}
