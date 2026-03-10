import { useState, useEffect, useRef } from 'react'

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
}

interface UseGameSearchReturn {
  results:    GameSearchResult[]
  isLoading:  boolean
  isError:    boolean
  query:      string
  setQuery:   (q: string) => void
  clear:      () => void
}

export function useGameSearch(debounceMs = 350): UseGameSearchReturn {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<GameSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError,   setIsError]   = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setIsError(false)

    const timer = setTimeout(async () => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: abortRef.current.signal }
        )

        if (!res.ok) throw new Error('Search failed')

        const data = await res.json()
        setResults(data.results ?? [])
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

  function clear() {
    setQuery('')
    setResults([])
    setIsError(false)
  }

  return { results, isLoading, isError, query, setQuery, clear }
}