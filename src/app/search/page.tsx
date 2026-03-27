"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, Loader2, X, Gamepad2, Heart, User as UserIcon, Users, Trophy, Flame } from "lucide-react"
import { useGameSearch, type GameSearchResult } from "@/hooks/useGameSearch"
import { useUserSearch } from "@/hooks/useUserSearch"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Tab = "games" | "users"

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "users" ? "users" : "games"
  const initialQuery = searchParams.get("q") ?? ""
  const [tab, setTab] = useState<Tab>(initialTab)
  const gameSearch = useGameSearch(400)
  const userSearch = useUserSearch(400)

  // Apply initial query from URL
  useEffect(() => {
    if (initialQuery) {
      if (tab === "games") gameSearch.setQuery(initialQuery)
      else userSearch.setQuery(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = tab === "games" ? gameSearch.query : userSearch.query
  const setQuery = tab === "games" ? gameSearch.setQuery : userSearch.setQuery

  function handleTabSwitch(newTab: Tab) {
    setTab(newTab)
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

  const isMembers = tab === "users"

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-zinc-800/60">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-500 block mb-1">
              {isMembers ? "Community" : "Explore"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-50 tracking-tight">
              {isMembers ? "Members" : "Search"}
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-1 border border-zinc-800/60">
            {(["games", "users"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTabSwitch(t)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.1em] transition-all",
                  tab === t
                    ? "bg-zinc-800 text-zinc-200 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                {t === "games" ? "Games" : "Members"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-8">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isMembers ? "Search members..." : "Search for games..."}
          className="w-full border-0 border-b-2 border-zinc-800/60 bg-transparent pl-7 pr-8 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={clearAll}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {tab === "games" ? (
        <GameResults search={gameSearch} />
      ) : (
        <MembersSection search={userSearch} />
      )}
    </div>
  )
}

/* ── Members Section ─────────────────────────────────────────── */

interface MemberWithStats {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  game_count: number
}

function MembersSection({ search }: { search: ReturnType<typeof useUserSearch> }) {
  const { results, isLoading, query } = search
  const [allMembers, setAllMembers] = useState<MemberWithStats[]>([])
  const [loadingAll, setLoadingAll] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      setLoadingAll(true)
      const { data: users } = await (supabase
        .from("users")
        .select("id, username, display_name, avatar_url, bio")
        .order("created_at", { ascending: false })
        .limit(50) as any)

      if (users && users.length > 0) {
        // Get game counts
        const { data: counts } = await (supabase
          .from("game_logs")
          .select("user_id")
          .in("user_id", users.map((u: any) => u.id)) as any)

        const countMap: Record<string, number> = {}
        if (counts) {
          for (const row of counts) {
            countMap[row.user_id] = (countMap[row.user_id] || 0) + 1
          }
        }

        setAllMembers(users.map((u: any) => ({
          ...u,
          game_count: countMap[u.id] || 0,
        })))
      }
      setLoadingAll(false)
    }
    fetchMembers()
  }, [])

  const isSearching = query.length >= 2
  const showingSearch = isSearching

  if (showingSearch) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )
    }

    if (results.length === 0) {
      return (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-600">No members found for &ldquo;{query}&rdquo;</p>
        </div>
      )
    }

    return (
      <div>
        <p className="text-[11px] text-zinc-600 mb-4">{results.length} result{results.length !== 1 ? "s" : ""}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((user) => (
            <MemberCard key={user.id} user={user} gameCount={0} />
          ))}
        </div>
      </div>
    )
  }

  // Default view — show all members
  if (loadingAll) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading members...
      </div>
    )
  }

  if (allMembers.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-zinc-800/60 rounded-lg">
        <Users className="mx-auto h-8 w-8 text-zinc-800 mb-3" />
        <p className="text-sm text-zinc-600">No members yet</p>
      </div>
    )
  }

  // Sort: most games first for "top" section
  const topMembers = [...allMembers].sort((a, b) => b.game_count - a.game_count).slice(0, 3)
  const recentMembers = allMembers

  return (
    <div className="space-y-10">
      {/* Top Members highlight */}
      {topMembers.length > 0 && topMembers[0].game_count > 0 && (
        <section>
          <h2 className="section-heading text-zinc-500 mb-4 flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-zinc-600" />
            Most Active
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {topMembers.map((member, i) => (
              <Link
                key={member.id}
                href={`/profile/${member.username}`}
                className="group relative rounded-lg border border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all p-5 text-center"
              >
                {/* Rank indicator */}
                <div className="absolute top-3 left-3 text-[10px] font-bold text-zinc-700 tabular-nums">
                  #{i + 1}
                </div>

                <div className="relative h-16 w-16 mx-auto mb-3 overflow-hidden rounded-full border-2 border-zinc-700/60 group-hover:border-zinc-600 transition-colors bg-zinc-800">
                  {member.avatar_url ? (
                    <Image src={member.avatar_url} alt={member.display_name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserIcon className="h-6 w-6 text-zinc-600" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                  {member.display_name}
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">@{member.username}</p>
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                  <Gamepad2 className="h-3 w-3 text-zinc-600" />
                  <span className="font-bold tabular-nums text-zinc-400">{member.game_count}</span>
                  <span>games</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Members */}
      <section>
        <h2 className="section-heading text-zinc-500 mb-4 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-zinc-600" />
          All Members
          <span className="text-zinc-600 tabular-nums">{recentMembers.length}</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recentMembers.map((member) => (
            <MemberCard key={member.id} user={member} gameCount={member.game_count} />
          ))}
        </div>
      </section>
    </div>
  )
}

function MemberCard({ user, gameCount }: { user: { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null }; gameCount: number }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="group flex items-center gap-3.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 p-3.5 transition-all"
    >
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-800">
        {user.avatar_url ? (
          <Image src={user.avatar_url} alt={user.display_name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserIcon className="h-4 w-4 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 truncate transition-colors">
          {user.display_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-zinc-600">@{user.username}</span>
          {gameCount > 0 && (
            <>
              <span className="text-zinc-800 text-[11px]">&middot;</span>
              <span className="text-[11px] text-zinc-500 tabular-nums">{gameCount} games</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Game Results ─────────────────────────────────────────── */

interface PopularGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
}

function GameResults({ search }: { search: ReturnType<typeof useGameSearch> }) {
  const { results, isLoading, query } = search
  const [popular, setPopular] = useState<PopularGame[]>([])
  const [loadingPopular, setLoadingPopular] = useState(true)

  useEffect(() => {
    async function fetchPopular() {
      try {
        const res = await fetch("/api/games/popular?limit=18")
        if (res.ok) {
          const data = await res.json()
          setPopular(data.games ?? [])
        }
      } catch {}
      setLoadingPopular(false)
    }
    fetchPopular()
  }, [])

  // Searching
  if (query.length >= 2) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )
    }

    if (results.length === 0) {
      return (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-600">No games found for &ldquo;{query}&rdquo;</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {results.map((game, i) => (
          <GameCard key={game.objectID ?? game.id ?? i} game={game} />
        ))}
      </div>
    )
  }

  // Default — show popular games
  return (
    <div>
      <h2 className="section-heading text-zinc-500 mb-4 flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 text-zinc-600" />
        Popular Right Now
      </h2>
      {loadingPopular ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : popular.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-600">No popular games available</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {popular.map((game) => (
            <GameCard key={game.id} game={game as any} />
          ))}
        </div>
      )}
    </div>
  )
}

function GameCard({ game }: { game: GameSearchResult }) {
  return (
    <Link href={`/game/${game.slug}`} className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
            {game.title}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors truncate leading-tight">
        {game.title}
      </p>
      <p className="text-[10px] text-zinc-600 truncate">
        {[game.release_year, game.developer].filter(Boolean).join(" · ")}
      </p>
    </Link>
  )
}
