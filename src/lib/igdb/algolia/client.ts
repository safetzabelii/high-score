// src/lib/algolia/client.ts
// Algolia v5 API — algoliasearch@5.x
// v5 removed initIndex() — all operations go through the client directly.

import { algoliasearch } from 'algoliasearch'
import type { ShapedGame } from '../fetch'

const INDEX_NAME = 'games'

// ── Algolia record shape ──────────────────────────────────────
export interface AlgoliaGame {
  objectID:     string
  igdb_id:      number
  title:        string
  slug:         string
  cover_url:    string | null
  release_year: number | null
  genres:       string[]
  platforms:    string[]
  developer:    string | null
  rating:       number | null
}

export function toAlgoliaRecord(game: ShapedGame): AlgoliaGame {
  return {
    objectID:     String(game.id),
    igdb_id:      game.id,
    title:        game.title,
    slug:         game.slug,
    cover_url:    game.cover_url,
    release_year: game.release_year,
    genres:       game.genres,
    platforms:    game.platforms,
    developer:    game.developer,
    rating:       game.rating,
  }
}

// ── Admin client (server-only) ────────────────────────────────
function getAdminClient() {
  if (!process.env.ALGOLIA_ADMIN_KEY) {
    throw new Error('ALGOLIA_ADMIN_KEY is not set')
  }
  return algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY
  )
}

// ── Search client (read-only) ─────────────────────────────────
function getSearchClient() {
  return algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
  )
}

// ── Sync a single game ────────────────────────────────────────
export async function syncGameToAlgolia(game: ShapedGame): Promise<void> {
  try {
    const client = getAdminClient()
    await client.saveObject({
      indexName: INDEX_NAME,
      body:      toAlgoliaRecord(game),
    })
  } catch (err) {
    console.error('[Algolia] syncGameToAlgolia failed:', err)
  }
}

// ── Bulk sync ─────────────────────────────────────────────────
export async function syncGamesToAlgolia(games: ShapedGame[]): Promise<void> {
  try {
    const client  = getAdminClient()
    const objects = games.map(toAlgoliaRecord)
    await client.saveObjects({
      indexName: INDEX_NAME,
      objects: objects as unknown as Record<string, unknown>[],
    })
    console.log(`[Algolia] synced ${objects.length} games`)
  } catch (err) {
    console.error('[Algolia] syncGamesToAlgolia failed:', err)
  }
}

// ── Search ────────────────────────────────────────────────────
export async function algoliaSearch(
  query: string,
  limit = 10
): Promise<AlgoliaGame[]> {
  try {
    const client = getSearchClient()
    const { results } = await client.search<AlgoliaGame>({
      requests: [
        {
          indexName:   INDEX_NAME,
          query,
          hitsPerPage: limit,
        },
      ],
    })
    const firstResult = results[0]
    if ('hits' in firstResult) {
      return firstResult.hits as AlgoliaGame[]
    }
    return []
  } catch (err) {
    console.error('[Algolia] search failed:', err)
    return []
  }
}