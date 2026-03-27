import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { igdbFetch, searchGames, shapeGame } from "@/lib/igdb/fetch"

const STEAM_API_KEY = process.env.STEAM_API_KEY

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number // minutes
}

/**
 * Resolve a Steam vanity URL to a 64-bit Steam ID.
 */
async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
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
 */
async function batchFindIgdbIds(
  steamAppIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  if (steamAppIds.length === 0) return map

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
 * Fallback: search IGDB by game name — more lenient matching
 */
async function findIgdbByName(name: string): Promise<number | null> {
  try {
    const results = await searchGames(name, 5)
    if (results.length === 0) return null

    const steamName = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()

    // Try exact match first
    for (const r of results) {
      const igdbName = r.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
      if (igdbName === steamName) return r.id
    }

    // Try contains match
    for (const r of results) {
      const igdbName = r.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
      if (igdbName.includes(steamName) || steamName.includes(igdbName)) {
        return r.id
      }
    }

    // Try first-word match for short names (e.g. "INSIDE" → "Inside")
    if (steamName.split(" ").length <= 2 && results[0]) {
      const firstResult = results[0].name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
      // Accept if >80% of words match
      const steamWords = steamName.split(" ")
      const igdbWords = firstResult.split(" ")
      const matching = steamWords.filter(w => igdbWords.includes(w))
      if (matching.length >= steamWords.length * 0.8) {
        return results[0].id
      }
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Batch fetch full game data from IGDB for multiple IDs at once
 */
async function batchFetchGameData(
  igdbIds: number[]
): Promise<Map<number, { id: number; title: string; slug: string; cover_url: string | null; release_year: number | null }>> {
  const map = new Map()
  if (igdbIds.length === 0) return map

  try {
    const idList = igdbIds.join(",")
    const results = await igdbFetch<any[]>(
      "games",
      `fields id, name, slug, cover.url, first_release_date; where id = (${idList}); limit 500;`
    )
    for (const r of results) {
      const coverUrl = r.cover?.url
        ? "https:" + r.cover.url.replace("t_thumb", "t_cover_big")
        : null
      map.set(r.id, {
        id: r.id,
        title: r.name,
        slug: r.slug,
        cover_url: coverUrl,
        release_year: r.first_release_date
          ? new Date(r.first_release_date * 1000).getFullYear()
          : null,
      })
    }
  } catch (err) {
    console.error("[steam-import] batch game fetch failed:", err)
  }

  return map
}

export async function POST(request: Request) {
  if (!STEAM_API_KEY) {
    return NextResponse.json(
      { error: "Steam API key is not configured." },
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

  // Fetch Steam library — ALL games, no limit
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

  // Sort by playtime (most played first) — import ALL games
  const sortedGames = [...steamGames]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)

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
  const failed: string[] = []

  // Phase 1: Batch lookup all Steam App IDs via IGDB external_games (fast)
  const BATCH_SIZE = 50
  const steamToIgdb = new Map<number, number>()

  for (let i = 0; i < sortedGames.length; i += BATCH_SIZE) {
    const batchIds = sortedGames.slice(i, i + BATCH_SIZE).map((g) => g.appid)
    const batchResult = await batchFindIgdbIds(batchIds)
    for (const [steamAppId, igdbId] of batchResult) {
      steamToIgdb.set(steamAppId, igdbId)
    }
    if (i + BATCH_SIZE < sortedGames.length) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  console.log(`[steam-import] Batch lookup matched ${steamToIgdb.size}/${total} games via external_games`)

  // Phase 2: For ALL unmatched games with playtime, try name search as fallback
  // No limit — search all unmatched games that have been played
  const unmatchedWithPlaytime = sortedGames
    .filter((g) => !steamToIgdb.has(g.appid) && g.playtime_forever > 30) // >30min played

  for (const game of unmatchedWithPlaytime) {
    const igdbId = await findIgdbByName(game.name)
    if (igdbId) {
      steamToIgdb.set(game.appid, igdbId)
    } else {
      failed.push(game.name)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`[steam-import] After name fallback: ${steamToIgdb.size}/${total} matched, ${failed.length} unmatched`)

  // Phase 3: Batch fetch game data from IGDB (instead of one-by-one)
  const igdbIdsToFetch = new Set<number>()
  for (const steamGame of sortedGames) {
    const igdbId = steamToIgdb.get(steamGame.appid)
    if (igdbId && !existingGameIds.has(igdbId)) {
      igdbIdsToFetch.add(igdbId)
    }
  }

  const gameDataMap = new Map()
  const idsArray = [...igdbIdsToFetch]
  for (let i = 0; i < idsArray.length; i += BATCH_SIZE) {
    const batch = idsArray.slice(i, i + BATCH_SIZE)
    const batchData = await batchFetchGameData(batch)
    for (const [id, data] of batchData) {
      gameDataMap.set(id, data)
    }
    if (i + BATCH_SIZE < idsArray.length) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  // Phase 4: Bulk upsert games and insert logs
  const today = new Date().toISOString().split("T")[0]

  for (const steamGame of sortedGames) {
    const igdbGameId = steamToIgdb.get(steamGame.appid)
    if (!igdbGameId) continue

    if (existingGameIds.has(igdbGameId)) {
      skipped++
      continue
    }

    const gameData = gameDataMap.get(igdbGameId)
    if (!gameData) { skipped++; continue }

    // Upsert into games table
    const { error: gameError } = await (supabase.from("games") as any).upsert(
      gameData,
      { onConflict: "id" }
    )

    if (gameError) {
      console.error("[steam-import] games upsert:", gameError.message)
      skipped++
      continue
    }

    // Insert game_log — marked as steam import via import_source column
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
      logged_date: today,
      playthrough_number: 1,
      import_source: "steam",
    })

    if (logError) {
      console.error("[steam-import] game_logs insert:", logError.message)
      skipped++
      continue
    }

    existingGameIds.add(gameData.id)
    imported++
  }

  return NextResponse.json({ imported, skipped, failed: failed.slice(0, 20), total })
}
