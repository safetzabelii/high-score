
import { NextResponse, type NextRequest } from 'next/server'
import { algoliaSearch }                  from '../../../../lib/igdb/algolia/client'
import { searchGames, shapeGame }         from '../../../../lib/igdb/fetch'
import { syncGamesToAlgolia }             from '../../../../lib/igdb/algolia/client'

/** Title keywords that indicate non-base-game content */
const DLC_KEYWORDS = /\b(pack|dlc|bundle|season pass|expansion pass|soundtrack|artbook|art book|skin|cosmetic|costume|outfit|map pack|character pack|weapon pack|booster|upgrade|starter pack|founder|deluxe upgrade|vip|premium pass|crew pack)\b/i

/** Filter out entries whose title looks like DLC / pack / cosmetic content */
function filterDlc<T extends { title: string }>(results: T[]): T[] {
  return results.filter((g) => !DLC_KEYWORDS.test(g.title))
}

interface Rankable {
  title: string
  rating_count?: number
  id?: number
  igdb_id?: number
  objectID?: string
}

/** Strip accents for comparison: "Pokémon" → "pokemon" */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Merge results from multiple sources, deduplicate by game ID,
 * filter DLC, collapse franchise variants, and rank by relevance + popularity.
 */
function mergeAndRank<T extends Rankable>(sources: T[][], query: string, limit: number): T[] {
  // Dedupe by game ID — prefer whichever has higher rating_count
  const byId = new Map<string, T>()
  for (const results of sources) {
    for (const game of results) {
      const key = String(game.igdb_id ?? game.id ?? game.objectID ?? game.title)
      const existing = byId.get(key)
      if (!existing || (game.rating_count ?? 0) > (existing.rating_count ?? 0)) {
        byId.set(key, game)
      }
    }
  }

  const all = filterDlc([...byId.values()])

  // Collapse franchise variants: if "Fortnite" exists, remove "Fortnite OG", "Fortnite: Battle Royale", etc.
  function isPrefixOf(shorter: string, longer: string): boolean {
    const a = normalize(shorter)
    const b = normalize(longer)
    if (a === b) return true
    return b.startsWith(a) && (b[a.length] === ' ' || b[a.length] === ':' || b[a.length] === '–' || b[a.length] === '—')
  }

  // Sort by popularity first so the most popular "base" title wins
  const sorted = [...all].sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0))

  const kept: T[] = []
  for (const game of sorted) {
    const dominated = kept.some((k) => isPrefixOf(k.title, game.title))
    if (!dominated) {
      kept.push(game)
    }
  }

  // Final ranking: starts-with-query → contains-query → rest
  // Within each tier, sort by popularity (rating_count) descending
  const q = normalize(query)
  kept.sort((a, b) => {
    const aNorm = normalize(a.title)
    const bNorm = normalize(b.title)
    const aStarts = aNorm.startsWith(q) ? 0 : 1
    const bStarts = bNorm.startsWith(q) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    const aContains = aNorm.includes(q) ? 0 : 1
    const bContains = bNorm.includes(q) ? 0 : 1
    if (aContains !== bContains) return aContains - bContains
    // Same relevance tier — sort by popularity
    return (b.rating_count ?? 0) - (a.rating_count ?? 0)
  })

  return kept.slice(0, limit)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20)
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0)

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters.' },
      { status: 400 }
    )
  }

  // Over-fetch heavily from Algolia to get past exact-match fan games
  // to reach accented real titles (e.g. "Pokemon" fan games → "Pokémon" real games)
  const igdbFetchLimit = (limit + offset) * 3
  const algoliaFetchLimit = 100

  // Always query both sources in parallel for best results
  const [algoliaResults, igdbResults] = await Promise.all([
    algoliaSearch(query, algoliaFetchLimit).catch(() => []),
    searchGames(query, igdbFetchLimit)
      .then((raw) => raw.map(shapeGame))
      .catch(() => []),
  ])

  // Sync IGDB results to Algolia in the background
  if (igdbResults.length > 0) {
    void syncGamesToAlgolia(igdbResults)
  }

  const all = mergeAndRank([algoliaResults, igdbResults] as Rankable[][], query, limit + offset)
  const page = all.slice(offset, offset + limit)

  return NextResponse.json({
    results: page,
    hasMore: page.length === limit,
    source: algoliaResults.length > 0 && igdbResults.length > 0 ? 'merged' : igdbResults.length > 0 ? 'igdb' : 'algolia',
  })
}
