import { useState, useEffect, useRef } from "react"

export interface UserSearchResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
}

interface UseUserSearchReturn {
  results: UserSearchResult[]
  isLoading: boolean
  isError: boolean
  query: string
  setQuery: (q: string) => void
  clear: () => void
}

export function useUserSearch(debounceMs = 350): UseUserSearchReturn {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
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
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&limit=20`,
          { signal: abortRef.current.signal }
        )

        if (!res.ok) throw new Error("Search failed")

        const data = await res.json()
        setResults(data.results ?? [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return
        setIsError(true)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  function clear() {
    setQuery("")
    setResults([])
    setIsError(false)
  }

  return { results, isLoading, isError, query, setQuery, clear }
}
