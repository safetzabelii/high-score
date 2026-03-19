import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Sparkles, Gamepad2, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { igdbFetch, type IgdbGame, shapeGame, coverUrl } from "@/lib/igdb/fetch"
import type { GameLogRow, GameRow } from "@/types/database"

export const metadata = {
  title: "Recommendations — HIGH-SCORE",
}

const GAME_FIELDS = `
  fields id, name, slug,
    cover.url,
    first_release_date,
    genres.name, genres.id,
    rating, rating_count,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher;
`.trim()

export default async function RecommendationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?redirectTo=/recommendations")

  // Get user's logged games with genre info from IGDB cache
  const { data: rawLogs } = await (supabase
    .from("game_logs")
    .select("game_id, rating, games(*)")
    .eq("user_id", user.id) as any)

  type LogWithGame = { game_id: number; rating: number | null; games: GameRow }
  const logs = (rawLogs ?? []) as LogWithGame[]
  const loggedGameIds = new Set(logs.map((l) => l.game_id))

  if (logs.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold text-zinc-50">Recommendations</h1>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            Log some games first so we can recommend new ones for you!
          </p>
        </div>
      </div>
    )
  }

  // Get top-rated genres from user's library
  // Collect genre names from highly rated games (3.5+) or all if not enough
  const highRated = logs.filter((l) => l.rating && l.rating >= 3.5)
  const sourceLogs = highRated.length >= 3 ? highRated : logs

  // We need genre IDs. Fetch genres for user's top games from IGDB
  const topGameIds = sourceLogs
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10)
    .map((l) => l.game_id)

  let genreIds: number[] = []
  let genreNames = new Map<number, string>()

  try {
    const igdbGames = await igdbFetch<IgdbGame[]>(
      "games",
      `fields genres.id, genres.name; where id = (${topGameIds.join(",")}); limit 10;`
    )

    // Count genre frequency
    const genreCount = new Map<number, number>()
    for (const g of igdbGames) {
      for (const genre of g.genres ?? []) {
        genreCount.set(genre.id, (genreCount.get(genre.id) ?? 0) + 1)
        genreNames.set(genre.id, genre.name)
      }
    }

    // Top 5 genres by frequency
    genreIds = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
  } catch {
    // Fallback: use popular games if IGDB fails
  }

  // Fetch recommended games from those genres
  let recommendations: IgdbGame[] = []

  if (genreIds.length > 0) {
    const excludeIds = [...loggedGameIds].join(",")
    try {
      recommendations = await igdbFetch<IgdbGame[]>(
        "games",
        `${GAME_FIELDS}
where genres = (${genreIds.join(",")}) & rating_count > 50 & rating > 70 & cover != null & id != (${excludeIds || "0"});
sort rating desc;
limit 24;`
      )
    } catch {
      // Silently fail
    }
  }

  // Deduplicate and shape
  const seen = new Set<number>()
  const shaped = recommendations
    .filter((g) => {
      if (seen.has(g.id) || loggedGameIds.has(g.id)) return false
      seen.add(g.id)
      return true
    })
    .map(shapeGame)

  // Group the top genres for display
  const topGenres = genreIds.slice(0, 5).map((id) => genreNames.get(id) ?? "Unknown")

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        <h1 className="text-2xl font-bold text-zinc-50">Recommendations</h1>
      </div>
      {topGenres.length > 0 && (
        <p className="text-sm text-zinc-500 mb-6">
          Based on your favorite genres:{" "}
          {topGenres.map((g, i) => (
            <span key={g}>
              <span className="text-zinc-300">{g}</span>
              {i < topGenres.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}

      {shaped.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            No recommendations right now. Log more games to improve suggestions!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {shaped.map((game) => (
            <Link
              key={game.id}
              href={`/game/${game.slug}`}
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-800 shadow-md transition-transform group-hover:scale-105">
                {game.cover_url ? (
                  <Image
                    src={game.cover_url}
                    alt={game.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
                    {game.title}
                  </div>
                )}
                {game.rating != null && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                    <Star className="h-2.5 w-2.5 fill-yellow-400" />
                    {game.rating.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="mt-1.5 truncate text-xs text-zinc-300 group-hover:text-zinc-50 transition-colors font-medium">
                {game.title}
              </p>
              <p className="text-[10px] text-zinc-600 truncate">
                {game.developer}
                {game.developer && game.release_year && " · "}
                {game.release_year}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
