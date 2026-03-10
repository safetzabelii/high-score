
import { getIgdbToken } from './token-cache'

const IGDB_BASE = 'https://api.igdb.com/v4'


export interface IgdbGame {
  id: number
  name: string
  slug: string
  cover?: { id: number; url: string }
  first_release_date?: number   
  summary?: string
  genres?: { id: number; name: string }[]
  platforms?: { id: number; name: string; abbreviation?: string }[]
  rating?: number               
  rating_count?: number
  involved_companies?: {
    company: { name: string }
    developer: boolean
    publisher: boolean
  }[]
  artworks?: { url: string }[]
  screenshots?: { url: string }[]
}


export async function igdbFetch<T>(
  endpoint: string,
  body: string
): Promise<T> {
  const token = await getIgdbToken()

  const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method:  'POST',
    headers: {
      'Client-ID':     process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'text/plain',
    },
    body,
    
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`IGDB ${endpoint} failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}


export function largeCover(url: string | undefined): string | null {
  if (!url) return null
  
  return 'https:' + url.replace('t_thumb', 't_cover_big')
}

export function coverUrl(url: string | undefined, size: 'thumb' | 'big' | '720p' = 'big'): string | null {
  if (!url) return null
  const sizeMap = { thumb: 't_thumb', big: 't_cover_big', '720p': 't_720p' }
  return 'https:' + url.replace(/t_[a-z0-9_]+/, sizeMap[size])
}


const GAME_FIELDS = `
  fields id, name, slug, summary,
    cover.url,
    first_release_date,
    genres.name,
    platforms.name, platforms.abbreviation,
    rating, rating_count,
    involved_companies.company.name,
    involved_companies.developer,
    involved_companies.publisher,
    artworks.url,
    screenshots.url;
`.trim()

export async function searchGames(query: string, limit = 10): Promise<IgdbGame[]> {
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
search "${query.replace(/"/g, '')}";
limit ${limit};`
  )
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

export async function getPopularGames(limit = 20): Promise<IgdbGame[]> {
  return igdbFetch<IgdbGame[]>(
    'games',
    `${GAME_FIELDS}
where rating_count > 500 & rating > 75 & cover != null;
sort rating_count desc;
limit ${limit};`
  )
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
  developer: string | null
}

export function shapeGame(g: IgdbGame): ShapedGame {
  const developer =
    g.involved_companies?.find((c) => c.developer)?.company.name ?? null

  return {
    id:           g.id,
    title:        g.name,
    slug:         g.slug,
    cover_url:    largeCover(g.cover?.url),
    release_year: g.first_release_date
      ? new Date(g.first_release_date * 1000).getFullYear()
      : null,
    summary:      g.summary ?? null,
    genres:       g.genres?.map((x) => x.name) ?? [],
    platforms:    g.platforms?.map((x) => x.abbreviation ?? x.name) ?? [],
    rating:       g.rating ? Math.round(g.rating) / 10 : null,  // 0-10 scale
    developer,
  }
}