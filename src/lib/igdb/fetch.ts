// src/lib/igdb/fetch.ts
// Handles all communication with the IGDB (Twitch) API
// Enhanced with Supabase caching layer for fast game detail loads

let cachedToken: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) throw new Error(`Twitch token error: ${res.status}`)
  const data = await res.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - 60_000 }
  return cachedToken.token
}

export interface IgdbGame {
  id: number
  name: string
  slug: string
  summary?: string
  category?: number
  cover?: { url: string }
  first_release_date?: number
  genres?: { id: number; name: string }[]
  platforms?: { name: string; abbreviation?: string }[]
  rating?: number
  rating_count?: number
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[]
  artworks?: { url: string }[]
  screenshots?: { url: string }[]
  websites?: { url: string; type: number }[]
  external_games?: { external_game_source: number; uid: string; url?: string }[]
  collection?: { id: number; name: string }
  franchises?: { id: number; name: string }[]
  version_parent?: number
  parent_game?: number
  // Relation arrays — present when explicitly requested
  dlcs?: number[]
  expansions?: number[]
  standalone_expansions?: number[]
  remakes?: number[]
  remasters?: number[]
  ports?: number[]
  bundles?: number[]
}

export async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getToken()
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IGDB ${endpoint} error ${res.status}: ${text}`)
  }
  return res.json()
}

function largeCover(url: string | undefined): string | null {
  if (!url) return null

  return 'https:' + url.replace('t_thumb', 't_cover_big')
}

export function coverUrl(url: string | undefined, size: 'thumb' | 'big' | '720p' = 'big'): string | null {
  if (!url) return null
  const sizeMap = { thumb: 't_thumb', big: 't_cover_big', '720p': 't_720p' }
  return 'https:' + url.replace(/t_[a-z0-9_]+/, sizeMap[size])
}


const GAME_FIELDS = `
  fields id, name, slug, summary, category,
    cover.url,
    first_release_date,
    genres.name,
    platforms.name, platforms.abbreviation,
    rating, rating_count,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher,
    artworks.url,
    screenshots.url,
    websites.url, websites.type,
    external_games.external_game_source, external_games.uid, external_games.url,
    collection.name, franchises.name,
    version_parent, parent_game;
`.trim()

// IGDB categories: 0=main, 1=DLC, 2=expansion, 3=bundle, 4=standalone_expansion,
// 5=mod, 6=episode, 7=season, 8=remake, 9=remaster, 10=expanded, 11=port, 12=fork, 13=pack, 14=update
const BASE_CATEGORIES = new Set([0, 8, 9, 10, 11])

export async function searchGames(query: string, limit = 20): Promise<IgdbGame[]> {
  const sanitized = query.replace(/"/g, '').replace(/\*/g, '')

  // Two parallel IGDB queries for best coverage:
  // 1. Full-text search — IGDB's built-in search handles accent folding & fuzzy matching
  //    We over-fetch to get past obscure fan games and reach real titles
  // 2. Full-text search with popularity filter — same search but only games with ratings,
  const [allResults, popularResults] = await Promise.all([
    igdbFetch<IgdbGame[]>(
      'games',
      `${GAME_FIELDS}
search "${sanitized}";
limit 50;`
    ).catch(() => [] as IgdbGame[]),

    igdbFetch<IgdbGame[]>(
      'games',
      `${GAME_FIELDS}
search "${sanitized}";
where rating_count > 5;
limit 50;`
    ).catch(() => [] as IgdbGame[]),
  ])

  // Merge and dedupe by ID, preferring the entry with higher rating_count
  const byId = new Map<number, IgdbGame>()
  for (const g of [...allResults, ...popularResults]) {
    const existing = byId.get(g.id)
    if (!existing || (g.rating_count ?? 0) > (existing.rating_count ?? 0)) {
      byId.set(g.id, g)
    }
  }

  // Filter to base categories and return
  return [...byId.values()]
    .filter((g) => g.category === undefined || BASE_CATEGORIES.has(g.category))
    .slice(0, limit)
}

export async function getGameById(id: number): Promise<IgdbGame | null> {
  const results = await igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where id = ${id};
limit 1;`
  )
  return results[0] ?? null
}

export async function getGameBySlug(slug: string): Promise<IgdbGame | null> {
  const results = await igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where slug = "${slug}";
limit 1;`
  )
  return results[0] ?? null
}

export async function getPopularGames(limit = 20, offset = 0): Promise<IgdbGame[]> {
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where rating_count > 500 & rating > 75 & cover != null;
sort rating_count desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getPopularThisWeek(limit = 20, offset = 0): Promise<IgdbGame[]> {
  // Games released in the last ~12 months with the most player engagement
  // Sorted by rating_count = most actively rated/played games RIGHT NOW
  const now = Math.floor(Date.now() / 1000)
  const twelveMonthsAgo = now - (365 * 24 * 60 * 60)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where first_release_date > ${twelveMonthsAgo} & first_release_date < ${now} & rating_count > 5 & cover != null & parent_game = null & version_parent = null;
sort rating_count desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getFeaturedGames(limit = 5, offset = 0): Promise<IgdbGame[]> {
  // Recent popular games from the last 6 months — not all-time
  const now = Math.floor(Date.now() / 1000)
  const sixMonthsAgo = now - (180 * 24 * 60 * 60)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where first_release_date > ${sixMonthsAgo} & first_release_date < ${now} & rating_count > 20 & cover != null & screenshots != null;
sort rating_count desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getAnticipatedGames(limit = 20, offset = 0): Promise<IgdbGame[]> {
  const now = Math.floor(Date.now() / 1000)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where first_release_date > ${now} & hypes > 2 & cover != null;
sort hypes desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getRecentReleases(limit = 20, offset = 0): Promise<IgdbGame[]> {
  const now = Math.floor(Date.now() / 1000)
  const threeMonthsAgo = now - (90 * 24 * 60 * 60)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where first_release_date > ${threeMonthsAgo} & first_release_date < ${now} & rating_count > 5 & cover != null;
sort rating_count desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getTopRatedGames(limit = 20, offset = 0): Promise<IgdbGame[]> {
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where rating_count > 500 & rating > 85 & cover != null;
sort rating desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getHiddenGems(limit = 20, offset = 0): Promise<IgdbGame[]> {
  // Hidden gems: truly obscure games with high ratings but minimal mainstream attention
  // - rating_count 15-50: enough votes to be credible, too few to be well-known
  // - total_rating 75-95: high quality but caps at 95 to filter vote-stuffed entries
  // - No aggregated_rating_count requirement (that would filter IN mainstream games)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where rating_count > 15 & rating_count < 50 & total_rating > 75 & total_rating < 95 & cover != null & parent_game = null & version_parent = null;
sort total_rating desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getComingSoon(limit = 10, offset = 0): Promise<IgdbGame[]> {
  const now = Math.floor(Date.now() / 1000)
  const oneYearFromNow = now + (365 * 24 * 60 * 60)
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where first_release_date > ${now} & first_release_date < ${oneYearFromNow} & cover != null & hypes > 15;
sort hypes desc;
limit ${limit};
offset ${offset};`
  )
}

export async function getGamesByGenre(genreId: number, limit = 20, offset = 0): Promise<IgdbGame[]> {
  // genres = [genreId] specifies EXACT match, genres = (genreId) specifies "contains".
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where genres = (${genreId}) & rating_count > 50 & rating > 70 & cover != null;
sort rating_count desc;
limit ${limit};
offset ${offset};`
  )
}

// Genre ID mapping for IGDB
export const IGDB_GENRE_IDS: Record<string, number> = {
  rpgs: 12, indies: 32, shooters: 5, adventure: 31,
  strategy: 15, platformers: 8, fighting: 4, racing: 10,
  sports: 14, simulators: 13, puzzle: 9, arcade: 33,
}

// Platform ID mapping for IGDB
export const IGDB_PLATFORM_IDS: Record<string, string> = {
  pc: "6",
  ps5: "167",
  ps4: "48",
  xsx: "169",
  xone: "49",
  switch: "130",
  mobile: "34,39",  // iOS + Android
}

export interface FilterParams {
  genre?: string
  year?: string
  rating?: string
  platform?: string
  sort?: string
  limit?: number
  offset?: number
}

export async function getFilteredGames(filters: FilterParams): Promise<IgdbGame[]> {
  const conditions: string[] = ["cover != null", "rating_count > 5"]
  let sortClause = "sort rating_count desc"

  // Genre filter
  if (filters.genre && filters.genre !== "all" && IGDB_GENRE_IDS[filters.genre]) {
    conditions.push(`genres = (${IGDB_GENRE_IDS[filters.genre]})`)
  }

  // Year filter
  if (filters.year && filters.year !== "all") {
    const now = Math.floor(Date.now() / 1000)
    switch (filters.year) {
      case "2026": conditions.push("first_release_date >= 1767225600 & first_release_date < 1798761600"); break
      case "2025": conditions.push("first_release_date >= 1735689600 & first_release_date < 1767225600"); break
      case "2024": conditions.push("first_release_date >= 1704067200 & first_release_date < 1735689600"); break
      case "2023": conditions.push("first_release_date >= 1672531200 & first_release_date < 1704067200"); break
      case "2020s": conditions.push("first_release_date >= 1577836800 & first_release_date < 1672531200"); break
      case "2010s": conditions.push("first_release_date >= 1262304000 & first_release_date < 1577836800"); break
      case "2000s": conditions.push("first_release_date >= 946684800 & first_release_date < 1262304000"); break
      case "classic": conditions.push(`first_release_date < 946684800`); break
    }
  }

  // Rating filter
  if (filters.rating && filters.rating !== "all") {
    const minRating = parseFloat(filters.rating) * 10 // IGDB uses 0-100 scale
    conditions.push(`rating >= ${minRating}`)
  }

  // Platform filter
  if (filters.platform && filters.platform !== "all" && IGDB_PLATFORM_IDS[filters.platform]) {
    const platformIds = IGDB_PLATFORM_IDS[filters.platform]
    conditions.push(`platforms = (${platformIds})`)
  }

  // Sort
  switch (filters.sort) {
    case "rating": sortClause = "sort rating desc"; break
    case "newest": sortClause = "sort first_release_date desc"; break
    case "name": sortClause = "sort name asc"; break
    case "popular":
    default: sortClause = "sort rating_count desc"; break
  }

  const limit = filters.limit ?? 30
  const offset = filters.offset ?? 0

  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where ${conditions.join(" & ")};
${sortClause};
limit ${limit};
offset ${offset};`
  )
}

// IGDB category labels
export const EDITION_CATEGORIES: Record<number, string> = {
  1:  'DLC',
  2:  'Expansion',
  3:  'Bundle',
  4:  'Standalone Expansion',
  6:  'Episode',
  7:  'Season',
  8:  'Remake',
  9:  'Remaster',
  10: 'Expanded Edition',
  11: 'Port',
  14: 'Update',
}

export interface GameEdition {
  id: number
  name: string
  slug: string
  cover_url: string | null
  release_year: number | null
  category: number
  category_label: string
}

/**
 * Fetch all editions/versions for a game.
 *
 * OPTIMIZED: Parallelizes the parent resolution + child fetch where possible,
 * and caches results via Next.js fetch cache.
 */
export async function getGameVersions(gameId: number): Promise<GameEdition[]> {
  // Step 1: fetch this game with all relation arrays
  const [gameInfo] = await igdbFetch<IgdbGame[]>(
    'games',
    `fields id, category, parent_game, version_parent,
      dlcs, expansions, standalone_expansions,
      remakes, remasters, ports, bundles;
where id = ${gameId};
limit 1;`
  ).catch(() => [] as IgdbGame[])

  if (!gameInfo) return []

  // Step 2: resolve parent — if this game IS the parent, skip the extra fetch
  let parent = gameInfo
  const parentId = gameInfo.parent_game ?? gameInfo.version_parent
  if (parentId && parentId !== gameId) {
    const [resolved] = await igdbFetch<IgdbGame[]>(
      'games',
      `fields id, dlcs, expansions, standalone_expansions,
        remakes, remasters, ports, bundles;
where id = ${parentId};
limit 1;`
    ).catch(() => [] as IgdbGame[])
    if (resolved) parent = resolved
  }

  // Step 3: collect all child IDs
  const childIds = new Set<number>([
    ...(parent.dlcs ?? []),
    ...(parent.expansions ?? []),
    ...(parent.standalone_expansions ?? []),
    ...(parent.remakes ?? []),
    ...(parent.remasters ?? []),
    ...(parent.ports ?? []),
    ...(parent.bundles ?? []),
  ])

  if (childIds.size === 0) return []

  // Step 4: fetch all children in one batch
  const idList = [...childIds].join(',')
  const children = await igdbFetch<IgdbGame[]>(
    'games',
    `fields id, name, slug, cover.url, first_release_date, category;
where id = (${idList});
sort first_release_date asc;
limit 50;`
  ).catch(() => [] as IgdbGame[])

  const SHOW_CATEGORIES = new Set(Object.keys(EDITION_CATEGORIES).map(Number))

  return children
    .filter((g) => g.category === undefined || SHOW_CATEGORIES.has(g.category ?? 0))
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      cover_url: largeCover(g.cover?.url),
      release_year: g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null,
      category: g.category ?? 0,
      category_label: EDITION_CATEGORIES[g.category ?? 0] ?? 'Edition',
    }))
}


export interface ShapedGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
  summary: string | null
  genres: string[]
  platforms: string[]
  rating: number | null
  rating_count: number
  developer: string | null
  publisher: string | null
  artworks: string[]
  screenshots: string[]
  stores: { name: string; url: string; icon: string }[]
  collection: { id: number; name: string } | null
  franchise: { id: number; name: string } | null
}

// Platforms to exclude (discontinued services)
const EXCLUDED_PLATFORMS = new Set(['Stadia', 'Google Stadia'])

// Normalize IGDB platform abbreviations to clean display names
const PLATFORM_NORMALIZE: Record<string, string> = {
  'Series X|S': 'Xbox Series X|S',
  'XONE': 'Xbox One',
  'X360': 'Xbox 360',
  'PS3': 'PS3',
  'PS4': 'PS4',
  'PS5': 'PS5',
  'PSP': 'PSP',
  'Vita': 'PS Vita',
  'Switch': 'Switch',
  'PC': 'PC',
  'Mac': 'Mac',
  'Linux': 'Linux',
  'iOS': 'iOS',
  'Android': 'Android',
  'Wii': 'Wii',
  'WiiU': 'Wii U',
  'N64': 'N64',
  'GBA': 'GBA',
  'NDS': 'Nintendo DS',
  'Switch 2': 'Switch 2',
}

// IGDB website category → store info (for websites field)
// IGDB websites.type → store info (type values from IGDB API)
const WEBSITE_STORE_MAP: Record<number, { name: string; icon: string }> = {
  13: { name: 'Steam', icon: 'steam' },
  16: { name: 'Epic Games', icon: 'epic' },
  17: { name: 'GOG', icon: 'gog' },
  15: { name: 'itch.io', icon: 'itch' },
  22: { name: 'Xbox Store', icon: 'xbox' },
  23: { name: 'PlayStation Store', icon: 'playstation' },
  24: { name: 'Nintendo eShop', icon: 'nintendo' },
}

// IGDB external_games.external_game_source → store info (used as fallback when websites don't have it)
const EXTERNAL_STORE_MAP: Record<number, { name: string; icon: string }> = {
  1:  { name: 'Steam', icon: 'steam' },
  5:  { name: 'GOG', icon: 'gog' },
  11: { name: 'Xbox Store', icon: 'xbox' },
  36: { name: 'PlayStation Store', icon: 'playstation' },
}

export function shapeGame(g: IgdbGame): ShapedGame {
  const developer =
    g.involved_companies?.find((c) => c.developer)?.company.name ?? null

  const publisher =
    g.involved_companies?.find((c) => c.publisher)?.company.name ?? null

  const rawPlatforms = g.platforms?.map((x) => {
    const abbr = x.abbreviation ?? x.name
    return PLATFORM_NORMALIZE[abbr] ?? abbr
  }) ?? []

  // Filter out discontinued platforms
  const platforms = rawPlatforms.filter(p => !EXCLUDED_PLATFORMS.has(p))

  // Extract store links from websites + external_games
  const stores: { name: string; url: string; icon: string }[] = []
  const seenStores = new Set<string>()

  // 1. From websites (has direct URLs — preferred source)
  for (const w of g.websites ?? []) {
    const info = WEBSITE_STORE_MAP[w.type]
    if (info && !seenStores.has(info.name)) {
      seenStores.add(info.name)
      stores.push({ name: info.name, url: w.url, icon: info.icon })
    }
  }

  // 2. From external_games (fallback — has URLs for stores not in websites)
  for (const ext of g.external_games ?? []) {
    const info = EXTERNAL_STORE_MAP[ext.external_game_source]
    if (info && !seenStores.has(info.name) && ext.url) {
      seenStores.add(info.name)
      stores.push({ name: info.name, url: ext.url, icon: info.icon })
    }
  }

  return {
    id: g.id,
    title: g.name,
    slug: g.slug,
    cover_url: largeCover(g.cover?.url),
    release_year: g.first_release_date
      ? new Date(g.first_release_date * 1000).getFullYear()
      : null,
    summary: g.summary ?? null,
    genres: g.genres?.map((x) => x.name) ?? [],
    platforms,
    rating: g.rating ? Math.round(g.rating) / 10 : null,  // 0-10 scale
    rating_count: g.rating_count ?? 0,
    developer,
    publisher,
    artworks: g.artworks?.map((a) => 'https:' + a.url.replace(/t_[a-z0-9_]+/, 't_720p')) ?? [],
    screenshots: g.screenshots?.map((s) => 'https:' + s.url.replace(/t_[a-z0-9_]+/, 't_720p')) ?? [],
    stores,
    collection: g.collection ? { id: g.collection.id, name: g.collection.name } : null,
    franchise: g.franchises?.[0] ? { id: g.franchises[0].id, name: g.franchises[0].name } : null,
  }
}

export interface SeriesGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
}

export async function getSeriesGames(collectionId: number | null, franchiseId: number | null, excludeId: number): Promise<{ games: SeriesGame[]; seriesName: string | null }> {
  // Prefer collection (more specific), fall back to franchise
  const id = collectionId ?? franchiseId
  if (!id) return { games: [], seriesName: null }

  const endpoint = collectionId ? 'collections' : 'franchises'

  // First get the collection/franchise name and game IDs
  const result = await igdbFetch<{ id: number; name: string; games: number[] }[]>(
    endpoint,
    `fields name, games;
where id = ${id};
limit 1;`
  )

  if (!result[0] || !result[0].games?.length) return { games: [], seriesName: null }

  const seriesName = result[0].name
  const gameIds = result[0].games.filter(gid => gid !== excludeId).slice(0, 20)

  if (gameIds.length === 0) return { games: [], seriesName }

  // Fetch the actual game data
  const games = await igdbFetch<IgdbGame[]>(
    'games',
    `fields id, name, slug, cover.url, first_release_date;
where id = (${gameIds.join(',')}) & cover != null;
sort first_release_date asc;
limit 20;`
  )

  return {
    seriesName,
    games: games.map(g => ({
      id: g.id,
      title: g.name,
      slug: g.slug,
      cover_url: largeCover(g.cover?.url),
      release_year: g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null,
    })),
  }
}


// ═══════════════════════════════════════════════════════════════════
// SUPABASE GAME CACHE LAYER
// ═══════════════════════════════════════════════════════════════════
//
// Instead of hitting IGDB on every game detail page load, we store
// the full shaped game data in Supabase's `game_cache` table.
// Cache TTL: 7 days for released games, 1 day for unreleased.
//
// This requires a new `game_cache` table in Supabase — see the
// migration SQL in game-cache-migration.sql.
// ═══════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'

/** The shape we store in the game_cache table's `data` JSONB column */
export interface CachedGameData extends ShapedGame {
  igdb_updated_at: string  // ISO timestamp of when we fetched from IGDB
}

/** Cache TTL constants */
const CACHE_TTL_RELEASED = 7 * 24 * 60 * 60 * 1000   // 7 days
const CACHE_TTL_UNRELEASED = 1 * 24 * 60 * 60 * 1000  // 1 day

/**
 * Get a game by slug — checks Supabase cache first, falls back to IGDB.
 * This is the primary function your game detail page should call.
 */
export async function getCachedGameBySlug(slug: string): Promise<ShapedGame | null> {
  const supabase = await createClient()

  // 1. Check cache
  const { data: cached } = await supabase
    .from('game_cache')
    .select('data, fetched_at')
    .eq('slug', slug)
    .single()

  if (cached) {
    const gameData = cached.data as unknown as CachedGameData
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    const isReleased = gameData.release_year && gameData.release_year <= new Date().getFullYear()
    const ttl = isReleased ? CACHE_TTL_RELEASED : CACHE_TTL_UNRELEASED

    // If cached data predates schema additions (stores, collection/franchise), fetch fresh
    if (!gameData.stores || !('collection' in gameData)) {
      const fresh = await fetchAndCacheGame(slug, supabase)
      if (fresh) return fresh
      return gameData // fallback to stale if IGDB fails
    }

    if (age < ttl) {
      return gameData // Cache hit — instant response
    }
    // Cache is stale — fall through to IGDB but return stale data immediately
    // and refresh in background (stale-while-revalidate pattern)
    refreshGameCache(slug, supabase).catch(() => {})
    return gameData
  }

  // 2. Cache miss — fetch from IGDB and store
  return fetchAndCacheGame(slug, supabase)
}

/**
 * Get a game by IGDB ID — checks cache first, falls back to IGDB.
 */
export async function getCachedGameById(igdbId: number): Promise<ShapedGame | null> {
  const supabase = await createClient()

  const { data: cached } = await supabase
    .from('game_cache')
    .select('data, fetched_at')
    .eq('igdb_id', igdbId)
    .single()

  if (cached) {
    const gameData = cached.data as unknown as CachedGameData
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    const isReleased = gameData.release_year && gameData.release_year <= new Date().getFullYear()
    const ttl = isReleased ? CACHE_TTL_RELEASED : CACHE_TTL_UNRELEASED

    if (age < ttl) return gameData

    refreshGameCacheById(igdbId, supabase).catch(() => {})
    return gameData
  }

  const raw = await getGameById(igdbId)
  if (!raw) return null
  const shaped = shapeGame(raw)
  await upsertGameCache(shaped, supabase)
  return shaped
}

/** Fetch from IGDB by slug and write to cache */
async function fetchAndCacheGame(
  slug: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ShapedGame | null> {
  const raw = await getGameBySlug(slug)
  if (!raw) return null

  const shaped = shapeGame(raw)
  await upsertGameCache(shaped, supabase)
  return shaped
}

/** Background refresh — doesn't block the response */
async function refreshGameCache(
  slug: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const raw = await getGameBySlug(slug)
  if (raw) await upsertGameCache(shapeGame(raw), supabase)
}

async function refreshGameCacheById(
  igdbId: number,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const raw = await getGameById(igdbId)
  if (raw) await upsertGameCache(shapeGame(raw), supabase)
}

/** Upsert a shaped game into the cache table */
async function upsertGameCache(
  game: ShapedGame,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const cacheData: CachedGameData = {
    ...game,
    igdb_updated_at: new Date().toISOString(),
  }

  await supabase
    .from('game_cache')
    .upsert(
      {
        igdb_id: game.id,
        slug: game.slug,
        title: game.title,
        cover_url: game.cover_url,
        release_year: game.release_year,
        data: cacheData as any,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'igdb_id' }
    )
    .then(({ error }) => {
      if (error) console.error('[game_cache upsert]', error.message)
    })
}

/**
 * Warm the cache for multiple games at once (e.g. from search results
 * or popular games). Fire-and-forget — doesn't block rendering.
 */
export async function warmGameCache(games: ShapedGame[]): Promise<void> {
  if (games.length === 0) return
  const supabase = await createClient()

  const rows = games.map((game) => ({
    igdb_id: game.id,
    slug: game.slug,
    title: game.title,
    cover_url: game.cover_url,
    release_year: game.release_year,
    data: { ...game, igdb_updated_at: new Date().toISOString() } as any,
    fetched_at: new Date().toISOString(),
  }))

  await supabase
    .from('game_cache')
    .upsert(rows, { onConflict: 'igdb_id', ignoreDuplicates: true })
    .then(({ error }) => {
      if (error) console.error('[game_cache bulk warm]', error.message)
    })
}