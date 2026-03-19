"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Loader2, X, Gamepad2, Heart, User as UserIcon } from "lucide-react"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"
import { useUserSearch } from "@/hooks/useUserSearch"
import { cn } from "@/lib/utils"

type Tab = "games" | "users"

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>("games")
  const gameSearch = useGameSearch(400)
  const userSearch = useUserSearch(400)

  const query = tab === "games" ? gameSearch.query : userSearch.query
  const setQuery = tab === "games" ? gameSearch.setQuery : userSearch.setQuery

  function handleTabSwitch(newTab: Tab) {
    setTab(newTab)
    // Carry query across tabs
    if (newTab === "games" && userSearch.query) {
      gameSearch.setQuery(userSearch.query)
    } else if (newTab === "users" && gameSearch.query) {
      userSearch.setQuery(gameSearch.query)
    }
  }

  function clearAll() {
    gameSearch.clear()
    userSearch.clear()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Search</h1>

      {/* Search input */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "games" ? "Search for games..." : "Search for users..."}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-12 pr-10 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-hs-green/30 focus:border-transparent transition-colors"
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={clearAll}
            className="absolute right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        {(["games", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabSwitch(t)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors capitalize",
              tab === t
                ? "border-hs-green bg-hs-green/10 text-hs-green"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-6">
        {tab === "games" ? (
          <GameResults search={gameSearch} />
        ) : (
          <UserResults search={userSearch} />
        )}
      </div>
    </div>
  )
}

/* ── Game Results ─────────────────────────────────────────── */

function GameResults({ search }: { search: ReturnType<typeof useGameSearch> }) {
  const { results, isLoading, query } = search

  if (query.length < 2) {
    return (
      <div className="py-16 text-center">
        <Gamepad2 className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500">
          Type at least 2 characters to search
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Searching...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">
          No games found for &ldquo;{query}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {results.map((game, i) => (
        <GameCard key={game.objectID ?? game.id ?? i} game={game} />
      ))}
    </div>
  )
}

function GameCard({ game }: { game: GameSearchResult }) {
  return (
    <Link href={`/game/${game.slug}`} className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-800 shadow-md transition-transform group-hover:scale-[1.03]">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-600">
            {game.title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-medium text-white leading-tight line-clamp-2">
              {game.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
              {game.release_year && <span>{game.release_year}</span>}
              {game.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Heart className="h-3 w-3 fill-[#ff0055] text-[#ff0055]" />
                  {game.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
        {game.title}
      </p>
      <p className="text-xs text-zinc-600 truncate">
        {[game.developer, game.release_year].filter(Boolean).join(" · ")}
      </p>
    </Link>
  )
}

/* ── User Results ─────────────────────────────────────────── */

interface UserResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
}

function UserResults({ search }: { search: ReturnType<typeof useUserSearch> }) {
  const { results, isLoading, query } = search

  if (query.length < 2) {
    return (
      <div className="py-16 text-center">
        <UserIcon className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500">
          Type at least 2 characters to search
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Searching...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">
          No users found for &ldquo;{query}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((user: UserResult) => (
        <Link
          key={user.id}
          href={`/profile/${user.username}`}
          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors"
        >
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.display_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserIcon className="h-5 w-5 text-zinc-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {user.display_name}
            </p>
            <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
          </div>
          {user.bio && (
            <p className="hidden sm:block text-xs text-zinc-600 truncate max-w-48">
              {user.bio}
            </p>
          )}
        </Link>
      ))}
    </div>
  )
}
