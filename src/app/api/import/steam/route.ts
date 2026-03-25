import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { igdbFetch, searchGames, shapeGame } from "@/lib/igdb/fetch"

const STEAM_API_KEY = process.env.STEAM_API_KEY
const MAX_GAMES = 200

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number // minutes
}

/**
 * Resolve a Steam vanity URL to a 64-bit Steam ID.
 */
async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
  // Strip Steam profile URL parts if user pasted a full URL
  const cleaned = vanityUrl
    .replace(/https?:\/\/(www\.)?steamcommunity\.com\/id\//i, "")
    .replace(/https?:\/\/(www\.)?steamcommunity\.com\/profiles\//i, "")
    .replace(/\/$/, "")
    .trim()

  if (/^\d{17}$/.test(cleaned)) return cleaned

  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(cleaned)}`
  )
  if (!res.ok) return null
  const data = await res.json()
  if (data.response?.success !== 1) return null
  return data.response.steamid as string
}

/**
 * Fetch owned games for a Steam ID.
 */
async function fetchSteamGames(steamId: string): Promise<SteamGame[] | null> {
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`
  )
  if (!res.ok) return null
  const data = await res.json()
  if (!data.response || !data.response.games) return null
  return data.response.games as SteamGame[]
}

/**
 * Batch-lookup IGDB game IDs by multiple Steam App IDs at once.
 * Queries up to 50 Steam IDs in a single IGDB request.
 */
async function batchFindIgdbIds(
  steamAppIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>() // steamAppId → igdbGameId
  if (steamAppIds.length === 0) return map

  // IGDB allows querying multiple UIDs with the `|` operator
  const uidList = steamAppIds.map((id) => `"${id}"`).join(",")

  try {
    const results = await igdbFetch<{ game: number; uid: string }[]>(
      "external_games",
      `fields game, uid; where category = 1 & uid = (${uidList}); limit 500;`
    )
    for (const r of results) {
      const steamId = parseInt(r.uid, 10)
      if (!isNaN(steamId) && r.game) {
        map.set(steamId, r.game)
      }
    }
  } catch (err) {
    console.error("[steam-import] batch IGDB lookup failed:", err)
  }

  return map
}

/**
 * Fallback: search IGDB by game name (for games without external_games entries)
 */
async function findIgdbByName(
  name: string
): Promise<number | null> {
  try {
    const results = await searchGames(name, 1)
    if (results.length > 0) {
      // Only accept if the name is a close enough match
      const igdbName = results[0].name.toLowerCase()
      const steamName = name.toLowerCase()
      if (
        igdbName === steamName ||
        igdbName.includes(steamName) ||
        steamName.includes(igdbName)
      ) {
        return results[0].id
      }
    }
  } catch {
    // ignore
  }
  return null
}

export async function POST(request: Request) {
  if (!STEAM_API_KEY) {
    return NextResponse.json(
      { error: "Steam API key is not configured. Please set the STEAM_API_KEY environment variable." },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let steamId: string
  try {
    const body = await request.json()
    steamId = body.steamId?.trim()
    if (!steamId) {
      return NextResponse.json({ error: "steamId is required" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Resolve vanity URL / profile URL if needed
  if (!/^\d{17}$/.test(steamId)) {
    const resolved = await resolveVanityUrl(steamId)
    if (!resolved) {
      return NextResponse.json(
        { error: "Could not resolve Steam ID. Try pasting your full Steam profile URL or 17-digit Steam ID." },
        { status: 400 }
      )
    }
    steamId = resolved
  }

  // Fetch Steam library
  const steamGames = await fetchSteamGames(steamId)
  if (!steamGames) {
    return NextResponse.json(
      { error: "Could not fetch Steam library. Make sure your profile is public and Game Details are set to public in Steam privacy settings." },
      { status: 400 }
    )
  }

  if (steamGames.length === 0) {
    return NextResponse.json(
      { error: "No games found in this Steam library." },
      { status: 400 }
    )
  }

  // Sort by playtime (most played first) and limit
  const sortedGames = [...steamGames]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, MAX_GAMES)

  const total = sortedGames.length

  // Fetch existing game_logs to skip already-logged games
  const { data: existingLogs } = await (supabase
    .from("game_logs")
    .select("game_id")
    .eq("user_id", user.id) as any)

  const existingGameIds = new Set<number>(
    (existingLogs ?? []).map((log: { game_id: number }) => log.game_id)
  )

  let imported = 0
  let skipped = 0

  // Phase 1: Batch lookup all Steam App IDs via IGDB external_games (fast)
  const BATCH_SIZE = 50
  const steamToIgdb = new Map<number, number>()

  for (let i = 0; i < sortedGames.length; i += BATCH_SIZE) {
    const batchIds = sortedGames.slice(i, i + BATCH_SIZE).map((g) => g.appid)
    const batchResult = await batchFindIgdbIds(batchIds)
    for (const [steamAppId, igdbId] of batchResult) {
      steamToIgdb.set(steamAppId, igdbId)
    }
    // Respect IGDB rate limits (4 req/s)
    if (i + BATCH_SIZE < sortedGames.length) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  console.log(`[steam-import] Batch lookup matched ${steamToIgdb.size}/${total} games via external_games`)

  // Phase 2: For top unmatched games (by playtime), try name search as fallback
  const unmatchedWithPlaytime = sortedGames
    .filter((g) => !steamToIgdb.has(g.appid) && g.playtime_forever > 60) // only if >1hr played
    .slice(0, 30) // limit fallback searches

  for (const game of unmatchedWithPlaytime) {
    const igdbId = await findIgdbByName(game.name)
    if (igdbId) {
      steamToIgdb.set(game.appid, igdbId)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`[steam-import] After name fallback: ${steamToIgdb.size}/${total} matched`)

  // Phase 3: Import matched games
  for (const steamGame of sortedGames) {
    const igdbGameId = steamToIgdb.get(steamGame.appid)
    if (!igdbGameId) continue

    if (existingGameIds.has(igdbGameId)) {
      skipped++
      continue
    }

    // Fetch full game data from IGDB
    let gameData
    try {
      const shaped = shapeGame(
        (await igdbFetch<any[]>(
          "games",
          `fields id, name, slug, cover.url, first_release_date, genres.name, platforms.name, platforms.abbreviation, rating, rating_count, involved_companies.company.name, involved_companies.developer, involved_companies.publisher; where id = ${igdbGameId}; limit 1;`
        ))[0]
      )
      if (!shaped) { skipped++; continue }
      gameData = shaped
    } catch {
      skipped++
      continue
    }

    // Upsert into games table
    const { error: gameError } = await (supabase.from("games") as any).upsert(
      {
        id: gameData.id,
        title: gameData.title,
        slug: gameData.slug,
        cover_url: gameData.cover_url,
        release_year: gameData.release_year,
      },
      { onConflict: "id" }
    )

    if (gameError) {
      console.error("[steam-import] games upsert:", gameError.message)
      skipped++
      continue
    }

    // Insert game_log
    const playtimeHours = steamGame.playtime_forever > 0
      ? Math.round(steamGame.playtime_forever / 60)
      : null

    const { error: logError } = await (supabase.from("game_logs") as any).insert({
      user_id: user.id,
      game_id: gameData.id,
      rating: null,
      status: "played",
      review_text: null,
      contains_spoilers: false,
      platforms: ["PC"],
      playtime_hours: playtimeHours,
      logged_date: new Date().toISOString().split("T")[0],
      playthrough_number: 1,
    })

    if (logError) {
      console.error("[steam-import] game_logs insert:", logError.message)
      skipped++
      continue
    }

    existingGameIds.add(gameData.id)
    imported++
  }

  return NextResponse.json({ imported, skipped, total })
}
