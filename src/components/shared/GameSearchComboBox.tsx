"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Search, Loader2, X, TrendingUp } from "lucide-react"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"
import { cn } from "@/lib/utils"

interface GameSearchComboboxProps {
  onSelect: (game: GameSearchResult) => void
  placeholder?: string
  /** Render results inline (inside modal scroll) instead of as a floating dropdown */
  inline?: boolean
  /** Show trending/popular game picks when idle */
  showTrending?: boolean
}

export function GameSearchCombobox({
  onSelect,
  placeholder = "Search for a game…",
  inline = false,
  showTrending = false,
}: GameSearchComboboxProps) {
  const { query, setQuery, results, isLoading, isLoadingMore, hasMore, loadMore, clear } = useGameSearch(350)
  const inputRef    = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [trending, setTrending] = useState<GameSearchResult[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)

  // Fetch trending games on mount
  useEffect(() => {
    if (!showTrending) return
    setTrendingLoading(true)
    fetch("/api/games/popular?limit=8")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.games) setTrending(data.games) })
      .catch(() => {})
      .finally(() => setTrendingLoading(false))
  }, [showTrending])

  // Close dropdown on outside click (only for non-inline mode)
  useEffect(() => {
    if (inline) return
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        clear()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [clear, inline])

  // Infinite scroll: load more when near bottom of dropdown
  const handleScroll = useCallback(() => {
    const el = dropdownRef.current
    if (!el || !hasMore || isLoadingMore) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  function handleSelect(game: GameSearchResult) {
    clear()
    onSelect(game)
  }

  const showResults = query.length >= 2
  const showIdle = !showResults && showTrending

  const resultsList = (
    <div
      ref={dropdownRef}
      onScroll={handleScroll}
      className={cn(
        inline
          ? "mt-2 rounded-lg border border-zinc-800 bg-zinc-900/50 max-h-72 overflow-y-auto"
          : "absolute top-full left-0 right-0 z-50 mt-1.5 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 max-h-80 overflow-y-auto"
      )}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching…
        </div>
      ) : results.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          No games found for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <ul className="py-1">
          {results.map((game, i) => (
            <li key={game.objectID ?? game.id ?? i}>
              <button
                type="button"
                onClick={() => handleSelect(game)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5",
                  "text-left hover:bg-zinc-800 transition-colors"
                )}
              >
                <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {game.cover_url ? (
                    <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="36px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-600 text-xs">?</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{game.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {[game.release_year, game.platforms?.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {game.rating && (
                  <span className="flex-shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-hs-green">
                    {game.rating.toFixed(1)}
                  </span>
                )}
              </button>
            </li>
          ))}
          {isLoadingMore && (
            <li className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading more…
            </li>
          )}
        </ul>
      )}
    </div>
  )

  const trendingSection = (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-3">
        <TrendingUp className="h-3.5 w-3.5 text-hs-green" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Popular right now</span>
      </div>
      {trendingLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {trending.map((game) => (
            <button
              key={game.objectID ?? game.id}
              type="button"
              onClick={() => handleSelect(game)}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-zinc-800/60"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-zinc-800 ring-1 ring-white/5 group-hover:ring-hs-green/40 transition-all">
                {game.cover_url ? (
                  <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-600 text-[9px]">?</div>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight text-center line-clamp-2 group-hover:text-zinc-200 transition-colors">
                {game.title}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={cn("w-full", !inline && "relative")}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border border-zinc-700 bg-zinc-900",
            "pl-9 pr-9 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-hs-green/50",
            "transition-colors"
          )}
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {showResults && resultsList}

      {/* Trending picks when idle */}
      {showIdle && trending.length > 0 && trendingSection}
    </div>
  )
}
