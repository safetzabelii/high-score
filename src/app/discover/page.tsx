import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles, TrendingUp, CalendarDays, Award, Search } from "lucide-react"
import { DiscoverClient } from "@/components/discover/DiscoverClient"
import { 
  getPopularGames, 
  getAnticipatedGames, 
  getRecentReleases, 
  getTopRatedGames,
  getGamesByGenre,
  getFeaturedGames,
  shapeGame 
} from "@/lib/igdb/fetch"
import { syncGamesToAlgolia } from "@/lib/igdb/algolia/client"

export const metadata = {
  title: "Discover Games — HIGH-SCORE",
}

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/discover")

  const [
    featuredRaw,
    popularRaw,
    anticipatedRaw,
    recentRaw,
    topRatedRaw,
    rpgRaw,
    indieRaw,
    shooterRaw,
    adventureRaw,
    strategyRaw,
    platformRaw,
    fightingRaw,
    racingRaw,
    sportsRaw,
    simulatorRaw,
    puzzleRaw,
    arcadeRaw,
    communityRaw
  ] = await Promise.all([
    getFeaturedGames(5),
    getPopularGames(20),
    getAnticipatedGames(20),
    getRecentReleases(20),
    getTopRatedGames(20),
    getGamesByGenre(12, 20), // RPGs (12)
    getGamesByGenre(32, 20), // Indie (32)
    getGamesByGenre(5, 20),  // Shooter (5)
    getGamesByGenre(31, 20), // Adventure (31)
    getGamesByGenre(15, 20), // Strategy (15)
    getGamesByGenre(8, 20),  // Platform (8)
    getGamesByGenre(4, 20),  // Fighting (4)
    getGamesByGenre(10, 20), // Racing (10)
    getGamesByGenre(14, 20), // Sports (14)
    getGamesByGenre(13, 20), // Simulator (13)
    getGamesByGenre(9, 20),  // Puzzle (9)
    getGamesByGenre(33, 20), // Arcade (33)
    // Community Trending (most recently logged games)
    supabase
      .from("game_logs")
      .select("game_id, games(*)")
      .order("created_at", { ascending: false })
      .limit(30)
  ])

  const featured = featuredRaw.map(shapeGame)
  const popular = popularRaw.map(shapeGame)
  const anticipated = anticipatedRaw.map(shapeGame)
  const recent = recentRaw.map(shapeGame)
  const topRated = topRatedRaw.map(shapeGame)
  const rpgs = rpgRaw.map(shapeGame)
  const indies = indieRaw.map(shapeGame)
  const shooters = shooterRaw.map(shapeGame)
  const adventure = (adventureRaw as any).map(shapeGame)
  const strategy = (strategyRaw as any).map(shapeGame)
  const platformers = (platformRaw as any).map(shapeGame)
  const fighting = (fightingRaw as any).map(shapeGame)
  const racing = (racingRaw as any).map(shapeGame)
  const sports = (sportsRaw as any).map(shapeGame)
  const simulators = (simulatorRaw as any).map(shapeGame)
  const puzzle = (puzzleRaw as any).map(shapeGame)
  const arcade = (arcadeRaw as any).map(shapeGame)

  // Deduplicate community games
  const seenIds = new Set<number>()
  const communityGames: any[] = []
  for (const log of (communityRaw.data ?? [])) {
    if (log.games && !seenIds.has(log.game_id)) {
      seenIds.add(log.game_id)
      communityGames.push(log.games)
      if (communityGames.length >= 20) break
    }
  }

  // Background sync for all fetched games to build up search index
  const allGames = [
    ...featured, 
    ...popular, 
    ...anticipated, 
    ...recent, 
    ...topRated, 
    ...rpgs, 
    ...indies, 
    ...shooters,
    ...adventure,
    ...strategy,
    ...platformers,
    ...fighting,
    ...racing,
    ...sports,
    ...simulators,
    ...puzzle,
    ...arcade,
    ...communityGames
  ]
  
  // Deduplicate before sync
  const uniqueGamesMap = new Map()
  for (const g of allGames) {
    if (!uniqueGamesMap.has(g.id)) {
      uniqueGamesMap.set(g.id, g)
    }
  }
  
  if (uniqueGamesMap.size > 0) {
    syncGamesToAlgolia(Array.from(uniqueGamesMap.values())).catch(console.error)
  }

  return (
    <DiscoverClient categories={{ 
      featured, 
      popular, 
      recent, 
      anticipated, 
      topRated, 
      community: communityGames,
      rpgs, 
      indies, 
      shooters,
      adventure,
      strategy,
      platformers,
      fighting,
      racing,
      sports,
      simulators,
      puzzle,
      arcade
    }} />
  )
}
