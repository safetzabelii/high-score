"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import type { GameSearchResult, ExistingLog } from "@/components/forms/LogGameModal"

const LogGameModal = dynamic(() => import("@/components/forms/LogGameModal").then(m => ({ default: m.LogGameModal })), { ssr: false })
import type { GameStatus } from "@/types/database"

interface GameWithCover {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year?: number | null
}

interface LogEntry {
  id: string
  rating: number | null
  status: GameStatus
  review_text: string | null
  platforms: string[]
  playtime_hours: number | null
  contains_spoilers: boolean
  logged_date: string
  playthrough_number?: number
  games: GameWithCover | null
}

interface GameLogGridProps {
  logs: LogEntry[]
  activeStatus: GameStatus | null
  username: string
  isOwn: boolean
  totalCount: number
  statusCounts: Record<string, number>
  userId: string
  hasMore: boolean
  pageSize: number
}

type SortKey = "date" | "rating" | "name"

const STATUS_TABS: { value: GameStatus | null; label: string }[] = [
  { value: null,        label: "All" },
  { value: "played",    label: "Played" },
  { value: "playing",   label: "Playing" },
  { value: "completed", label: "Completed" },
  { value: "backlog",   label: "Backlog" },
  { value: "wishlist",  label: "Wishlist" },
  { value: "abandoned", label: "Shelved" },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date",   label: "Date" },
  { value: "rating", label: "Rating" },
  { value: "name",   label: "Name" },
]

function sortLogs(logs: LogEntry[], sortKey: SortKey): LogEntry[] {
  return [...logs].sort((a, b) => {
    if (sortKey === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0)
    }
    if (sortKey === "name") {
      return (a.games?.title ?? "").localeCompare(b.games?.title ?? "")
    }
    return new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime()
  })
}

export function GameLogGrid({ logs: initialLogs, activeStatus, username, isOwn, totalCount, statusCounts, userId, hasMore: initialHasMore, pageSize }: GameLogGridProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [allLogs, setAllLogs] = useState<LogEntry[]>(initialLogs)
  const [canLoadMore, setCanLoadMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)

  // Sync with server data when props change (e.g. after router.refresh())
  useEffect(() => {
    setAllLogs(initialLogs)
    setCanLoadMore(initialHasMore)
  }, [initialLogs, initialHasMore])

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editGame, setEditGame] = useState<GameSearchResult | null>(null)
  const [editLog, setEditLog] = useState<ExistingLog | null>(null)

  const loadMore = useCallback(async () => {
    if (loadingMore || !canLoadMore) return
    setLoadingMore(true)
    try {
      let query = supabase
        .from("game_logs")
        .select("*, games(*)")
        .eq("user_id", userId)
        .order("logged_date", { ascending: false })
        .range(allLogs.length, allLogs.length + pageSize - 1)

      if (activeStatus) {
        query = query.eq("status", activeStatus)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (query as any)
      if (data && data.length > 0) {
        setAllLogs(prev => [...prev, ...data])
        setCanLoadMore(data.length >= pageSize)
      } else {
        setCanLoadMore(false)
      }
    } catch {
      setCanLoadMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, activeStatus, allLogs.length, pageSize, loadingMore, canLoadMore])

  function handleTabClick(status: GameStatus | null) {
    const base = `/profile/${username}`
    if (status) {
      router.push(`${base}?status=${status}`)
    } else {
      router.push(base)
    }
  }

  function handleCardClick(log: LogEntry) {
    if (!isOwn || !log.games) return

    setEditGame({
      id: log.games.id,
      igdb_id: log.games.id,   // games table PK === IGDB ID
      title: log.games.title,
      slug: log.games.slug,
      cover_url: log.games.cover_url,
      release_year: log.games.release_year ?? null,
    })
    setEditLog({
      id: log.id,
      rating: log.rating,
      status: log.status,
      review_text: log.review_text,
      platforms: log.platforms,
      playtime_hours: log.playtime_hours,
      contains_spoilers: log.contains_spoilers,
      logged_date: log.logged_date,
      playthrough_number: log.playthrough_number ?? 1,
    })
    setEditModalOpen(true)
  }

  const sorted = sortLogs(allLogs, sortKey)

  return (
    <div>
      {/* Section header with sort controls */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Games</h2>

        {/* Sort */}
        {allLogs.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ArrowUpDown className="h-3 w-3" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortKey(opt.value)}
                className={cn(
                  "rounded px-2 py-1 transition-colors",
                  sortKey === opt.value
                    ? "bg-zinc-800 text-zinc-200"
                    : "hover:text-zinc-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex items-center gap-0 overflow-x-auto border-b border-zinc-800/60">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === null ? totalCount : (statusCounts[tab.value] ?? 0)
          const isActive = activeStatus === tab.value

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(tab.value)}
              className={cn(
                "relative px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
                isActive
                  ? "border-hs-green text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600",
                count === 0 && tab.value !== null && !isActive && "text-zinc-700 hover:text-zinc-500"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-1.5 text-xs font-mono tabular-nums",
                  isActive ? "text-zinc-400" : "text-zinc-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid — Letterboxd poster grid style */}
      {allLogs.length === 0 ? (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 py-16 text-center">
          <p className="text-sm text-zinc-500">
            {activeStatus
              ? `No games with status "${activeStatus}"`
              : "No games logged yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
          {sorted.map((log) => {
            const game = log.games
            if (!game) return null

            return (
              <div key={log.id} className="group relative">
                <Link href={`/game/${game.slug}`}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-zinc-800 ring-1 ring-white/5 transition-all group-hover:ring-hs-green/50 group-hover:brightness-110">
                    {game.cover_url ? (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 14vw, 12.5vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
                        {game.title}
                      </div>
                    )}

                    {/* Replay badge */}
                    {(log.playthrough_number ?? 1) > 1 && (
                      <div className="absolute top-1 left-1 z-10 flex h-4 items-center gap-0.5 rounded bg-black/80 border border-amber-400/50 px-1.5 text-[8px] font-bold text-amber-400 shadow-md" title={`Playthrough #${log.playthrough_number}`}>
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 1l4 4-4 4" />
                          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <path d="M7 23l-4-4 4-4" />
                          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        {log.playthrough_number}
                      </div>
                    )}

                    {/* Title on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <p className="text-[9px] font-medium text-white leading-tight line-clamp-2">
                        {game.title}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Heart rating below poster — always visible */}
                {log.rating != null && log.rating > 0 && (
                  <div className="flex items-center gap-[1px] mt-1 justify-center">
                    {Array.from({ length: Math.floor(log.rating) }).map((_, i) => (
                      <svg key={i} viewBox="0 0 24 24" className="h-[10px] w-[10px]">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 8.5 3c1.74 0 3.41.81 4.5 2.09C14.09 3.81 15.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff0055" />
                      </svg>
                    ))}
                    {log.rating % 1 >= 0.5 && (
                      <span className="text-[11px] font-bold leading-none" style={{ color: "#ff0055" }}>½</span>
                    )}
                  </div>
                )}

                {/* Edit button for own profile */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCardClick(log) }}
                    className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {canLoadMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-hs-green" />
                Loading...
              </>
            ) : (
              "Load more games"
            )}
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editGame && (
        <LogGameModal
          open={editModalOpen}
          onClose={() => { setEditModalOpen(false); setEditGame(null); setEditLog(null) }}
          preselectedGame={editGame}
          existingLog={editLog}
        />
      )}
    </div>
  )
}
