/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/igdb/auth-backdrop.ts
import { createClient } from '@/lib/supabase/server'
import { igdbFetch } from './fetch'

export interface BackdropGame {
  name: string
  screenshot_url: string
  cover_url: string | null
  year: number | null
}

const BACKDROP_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours

/**
 * Stale-while-revalidate: always returns cached data instantly.
 * If cache is stale, kicks off a background refresh and returns stale data.
 * Only blocks on IGDB if there's zero cached data.
 */
export async function getAuthBackdropGames(): Promise<BackdropGame[]> {
  const supabase = await createClient()

  const { data: cached } = await supabase
    .from('page_cache')
    .select('data, fetched_at')
    .eq('page_key', 'auth_backdrop_v2')
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < BACKDROP_CACHE_TTL) {
      // Fresh cache — return immediately
      return cached.data as unknown as BackdropGame[]
    }
    // Stale cache — return immediately, refresh in background
    refreshBackdrop().catch(() => {})
    return cached.data as unknown as BackdropGame[]
  }

  // No cache at all — must fetch (first-ever load)
  return refreshBackdrop()
}

/** Fetch fresh backdrop data from IGDB and write to cache */
async function refreshBackdrop(): Promise<BackdropGame[]> {
  try {
    const supabase = await createClient()
    const now = Math.floor(Date.now() / 1000)
    const start2025 = Math.floor(new Date('2025-01-01').getTime() / 1000)

    const [recentHits, upcoming] = await Promise.all([
      igdbFetch<any[]>(
        'games',
        `fields name, cover.url, screenshots.url, artworks.url, first_release_date;
where first_release_date > ${start2025} & first_release_date < ${now} & rating_count > 10 & screenshots != null & cover != null;
sort rating_count desc;
limit 10;`
      ).catch(() => []),
      igdbFetch<any[]>(
        'games',
        `fields name, cover.url, screenshots.url, artworks.url, first_release_date;
where first_release_date > ${now} & hypes > 3 & (screenshots != null | artworks != null) & cover != null;
sort hypes desc;
limit 10;`
      ).catch(() => []),
    ])

    // Interleave recent and upcoming for variety
    const all: any[] = []
    const maxLen = Math.max(recentHits.length, upcoming.length)
    for (let i = 0; i < maxLen; i++) {
      if (i < recentHits.length) all.push(recentHits[i])
      if (i < upcoming.length) all.push(upcoming[i])
    }

    const backdrop: BackdropGame[] = []
    for (const g of all) {
      const artUrl = g.artworks?.[0]?.url || g.screenshots?.[0]?.url
      const coverRaw = g.cover?.url
      if (artUrl && g.name) {
        backdrop.push({
          name: g.name,
          screenshot_url: 'https:' + artUrl.replace(/t_[a-z0-9_]+/, 't_1080p'),
          cover_url: coverRaw ? 'https:' + coverRaw.replace(/t_[a-z0-9_]+/, 't_cover_big') : null,
          year: g.first_release_date
            ? new Date(g.first_release_date * 1000).getFullYear()
            : null,
        })
      }
      if (backdrop.length >= 8) break
    }

    // Write to cache (fire-and-forget)
    supabase
      .from('page_cache')
      .upsert(
        { page_key: 'auth_backdrop_v2', data: backdrop as any, fetched_at: new Date().toISOString() },
        { onConflict: 'page_key' }
      )
      .then(({ error }) => {
        if (error) console.error('[auth_backdrop_v2]', error.message)
      })

    return backdrop
  } catch {
    return []
  }
}
