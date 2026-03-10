"use client"

import { useRef, useEffect } from "react"
import Image from "next/image"
import { Search, Loader2, X } from "lucide-react"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"
import { cn } from "@/lib/utils"

interface GameSearchComboboxProps {
  onSelect: (game: GameSearchResult) => void
  placeholder?: string
}

export function GameSearchCombobox({
  onSelect,
  placeholder = "Search for a game…",
}: GameSearchComboboxProps) {
  const { query, setQuery, results, isLoading, clear } = useGameSearch(350)
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
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
  }, [clear])

  function handleSelect(game: GameSearchResult) {
    clear()
    onSelect(game)
  }

  const showDropdown = query.length >= 2

  return (
    <div className="relative w-full">
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
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
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

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-full left-0 right-0 z-50 mt-1.5",
            "rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50",
            "max-h-80 overflow-y-auto"
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
                    {/* Cover art */}
                    <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                      {game.cover_url ? (
                        <Image
                          src={game.cover_url}
                          alt={game.title}
                          fill
                          className="object-cover"
                          sizes="36px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-600 text-xs">
                          ?
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {game.title}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {[
                          game.release_year,
                          game.platforms?.slice(0, 3).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    {/* Rating badge */}
                    {game.rating && (
                      <span className="flex-shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-indigo-400">
                        {game.rating.toFixed(1)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}