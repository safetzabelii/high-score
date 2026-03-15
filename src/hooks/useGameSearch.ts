import { useState, useEffect, useRef, useCallback } from 'react'

export interface GameSearchResult {
  objectID?: string   // present if from Algolia
  igdb_id?: number
  id?: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
  platforms: string[]
  genres: string[]
  developer: string | null
  rating: number | null
  rating_count?: number
}

interface UseGameSearchReturn {
  results:      GameSearchResult[]
  isLoading:    boolean
  isLoadingMore: boolean
  isError:      boolean
  hasMore:      boolean
  query:        string
  setQuery:     (q: string) => void
  clear:        () => void
  loadMore:     () => void
}

const PAGE_SIZE = 10

export function useGameSearch(debounceMs = 350): UseGameSearchReturn {
  const [query,         setQuery]         = useState('')
  const [results,       setResults]       = useState<GameSearchResult[]>([])
  const [isLoading,     setIsLoading]     = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isError,       setIsError]       = useState(false)
  const [hasMore,       setHasMore]       = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const offsetRef = useRef(0)

  // Initial search on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsLoading(false)
      setHasMore(false)
      offsetRef.current = 0
      return
    }

    setIsLoading(true)
    setIsError(false)
    offsetRef.current = 0

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=0`,
          { signal: abortRef.current.signal }
        )

        if (!res.ok) throw new Error('Search failed')

        const data = await res.json()
        setResults(data.results ?? [])
        setHasMore(data.hasMore ?? false)
        offsetRef.current = data.results?.length ?? 0
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setIsError(true)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || query.length < 2) return

    setIsLoadingMore(true)
    try {
      const res = await fetch(
        `/api/games/search?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offsetRef.current}`
      )
      if (!res.ok) throw new Error('Load more failed')

      const data = await res.json()
      const newResults = data.results ?? []
      setResults((prev) => [...prev, ...newResults])
      setHasMore(data.hasMore ?? false)
      offsetRef.current += newResults.length
    } catch {
      // silently fail load-more
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, query])

  function clear() {
    setQuery('')
    setResults([])
    setIsError(false)
    setHasMore(false)
    offsetRef.current = 0
  }

  return { results, isLoading, isLoadingMore, isError, hasMore, query, setQuery, clear, loadMore }
}
