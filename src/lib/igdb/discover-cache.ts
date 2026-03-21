/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/igdb/discover-cache.ts
// Caches the entire /discover page data in a single Supabase row.
// Instead of 18+ IGDB API calls on every page load, we hit Supabase
// once (~50ms) and only refresh from IGDB every 30 minutes.

import { createClient } from '@/lib/supabase/server'
import {
  getFeaturedGames,
  getPopularGames,
  getRecentReleases,
  getAnticipatedGames,
  getTopRatedGames,
  getGamesByGenre,
  shapeGame,
  type ShapedGame,
} from './fetch'

export interface DiscoverCategories {
  featured: DiscoverGame[]
  popular: DiscoverGame[]
  recent: DiscoverGame[]
  anticipated: DiscoverGame[]
  topRated: DiscoverGame[]
  community: DiscoverGame[]
  rpgs: DiscoverGame[]
  indies: DiscoverGame[]
  shooters: DiscoverGame[]
  adventure: DiscoverGame[]
  strategy: DiscoverGame[]
  platformers: DiscoverGame[]
  fighting: DiscoverGame[]
  racing: DiscoverGame[]
  sports: DiscoverGame[]
  simulators: DiscoverGame[]
  puzzle: DiscoverGame[]
  arcade: DiscoverGame[]
}

export interface DiscoverGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
  rating?: number | null
  developer?: string | null
  summary?: string | null
  genres?: string[]
  screenshot_url?: string | null
}

// Cache TTL: 30 minutes
const DISCOVER_CACHE_TTL = 30 * 60 * 1000

// IGDB genre IDs
const GENRE_IDS: Record<string, number> = {
  rpgs: 12,
  indies: 32,
  shooters: 5,
  adventure: 31,
  strategy: 15,
  platformers: 8,
  fighting: 4,
  racing: 10,
  sports: 14,
  simulators: 13,
  puzzle: 9,
  arcade: 33,
}

function shapeForDiscover(g: ShapedGame, includeMeta = false): DiscoverGame {
  const base: DiscoverGame = {
    id: g.id,
    title: g.title,
    slug: g.slug,
    cover_url: g.cover_url,
    release_year: g.release_year,
    rating: g.rating,
    developer: g.developer,
  }
  if (includeMeta) {
    base.summary = g.summary
    base.genres = g.genres
    // Pick a gameplay screenshot (skip first — often title screen)
    const ss = g.screenshots
    base.screenshot_url = ss?.[2] || ss?.[1] || ss?.[0] || null
  }
  return base
}

/**
 * Get all discover page categories — from cache if fresh, from IGDB if stale.
 * Community games come from Supabase (recent logs) so they're always fetched live.
 */
export async function getDiscoverData(): Promise<DiscoverCategories> {
  const supabase = await createClient()

  // 1. Check cache
  const { data: cached } = await supabase
    .from('page_cache')
    .select('data, fetched_at')
    .eq('page_key', 'discover_v3')
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < DISCOVER_CACHE_TTL) {
      const categories = cached.data as unknown as DiscoverCategories

      // Always refresh community games from Supabase (they change frequently)
      categories.community = await getCommunityGames(supabase)

      return categories
    }

    // Stale — return stale data immediately, refresh in background
    const staleData = cached.data as unknown as DiscoverCategories
    staleData.community = await getCommunityGames(supabase)

    // Background refresh (don't await)
    refreshDiscoverCache(supabase).catch((err) =>
      console.error('[discover cache refresh]', err)
    )

    return staleData
  }

  // 2. Cache miss — fetch everything from IGDB
  return fetchAndCacheDiscover(supabase)
}

/** Fetch community games from Supabase (recent logs, always live) */
async function getCommunityGames(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DiscoverGame[]> {
  const { data: recentLogs } = await (supabase
    .from('game_logs')
    .select('game_id, games(id, title, slug, cover_url, release_year)')
    .order('created_at', { ascending: false })
    .limit(40) as any)

  const seen = new Set<number>()
  const community: DiscoverGame[] = []

  for (const log of (recentLogs ?? []) as any[]) {
    if (log.games && !seen.has(log.game_id)) {
      seen.add(log.game_id)
      community.push({
        id: log.games.id,
        title: log.games.title,
        slug: log.games.slug,
        cover_url: log.games.cover_url,
        release_year: log.games.release_year,
      })
      if (community.length >= 8) break
    }
  }

  return community
}

/** Fetch all IGDB categories and write to cache */
async function fetchAndCacheDiscover(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DiscoverCategories> {
  // Fire all IGDB requests in parallel
  const [
    featuredRaw,
    popularRaw,
    recentRaw,
    anticipatedRaw,
    topRatedRaw,
    rpgsRaw,
    indiesRaw,
    shootersRaw,
    adventureRaw,
    strategyRaw,
    platformersRaw,
    fightingRaw,
    racingRaw,
    sportsRaw,
    simulatorsRaw,
    puzzleRaw,
    arcadeRaw,
  ] = await Promise.all([
    getFeaturedGames(5).catch(() => []),
    getPopularGames(20).catch(() => []),
    getRecentReleases(20).catch(() => []),
    getAnticipatedGames(20).catch(() => []),
    getTopRatedGames(20).catch(() => []),
    getGamesByGenre(GENRE_IDS.rpgs, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.indies, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.shooters, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.adventure, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.strategy, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.platformers, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.fighting, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.racing, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.sports, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.simulators, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.puzzle, 20).catch(() => []),
    getGamesByGenre(GENRE_IDS.arcade, 20).catch(() => []),
  ])

  const community = await getCommunityGames(supabase)

  const categories: DiscoverCategories = {
    featured: featuredRaw.map(shapeGame).map(g => shapeForDiscover(g, true)),
    popular: popularRaw.map(shapeGame).map(shapeForDiscover),
    recent: recentRaw.map(shapeGame).map(shapeForDiscover),
    anticipated: anticipatedRaw.map(shapeGame).map(shapeForDiscover),
    topRated: topRatedRaw.map(shapeGame).map(shapeForDiscover),
    community,
    rpgs: rpgsRaw.map(shapeGame).map(shapeForDiscover),
    indies: indiesRaw.map(shapeGame).map(shapeForDiscover),
    shooters: shootersRaw.map(shapeGame).map(shapeForDiscover),
    adventure: adventureRaw.map(shapeGame).map(shapeForDiscover),
    strategy: strategyRaw.map(shapeGame).map(shapeForDiscover),
    platformers: platformersRaw.map(shapeGame).map(shapeForDiscover),
    fighting: fightingRaw.map(shapeGame).map(shapeForDiscover),
    racing: racingRaw.map(shapeGame).map(shapeForDiscover),
    sports: sportsRaw.map(shapeGame).map(shapeForDiscover),
    simulators: simulatorsRaw.map(shapeGame).map(shapeForDiscover),
    puzzle: puzzleRaw.map(shapeGame).map(shapeForDiscover),
    arcade: arcadeRaw.map(shapeGame).map(shapeForDiscover),
  }

  // Write to cache (don't await — page can return immediately)
  supabase
    .from('page_cache')
    .upsert(
      {
        page_key: 'discover_v3',
        data: categories as any,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'page_key' }
    )
    .then(({ error }) => {
      if (error) console.error('[discover cache write]', error.message)
    })

  return categories
}

/** Background refresh — called when cache is stale */
async function refreshDiscoverCache(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  await fetchAndCacheDiscover(supabase)
}