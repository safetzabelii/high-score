"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Star, ArrowUpDown, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { LogGameModal, type GameSearchResult, type ExistingLog } from "@/components/forms/LogGameModal"
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
  games: GameWithCover | null
}

interface GameLogGridProps {
  logs: LogEntry[]
  activeStatus: GameStatus | null
  username: string
  isOwn: boolean
  totalCount: number
}

type SortKey = "date" | "rating" | "name"

const STATUS_TABS: { value: GameStatus | null; label: string; emoji: string }[] = [
  { value: null,        label: "All",       emoji: "" },
  { value: "played",    label: "Played",    emoji: "✅" },
  { value: "playing",   label: "Playing",   emoji: "🎮" },
  { value: "backlog",   label: "Backlog",   emoji: "📋" },
  { value: "abandoned", label: "Abandoned", emoji: "💀" },
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
    // date (default) — newest first
    return new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime()
  })
}

export function GameLogGrid({ logs, activeStatus, username, isOwn, totalCount }: GameLogGridProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("date")

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editGame, setEditGame] = useState<GameSearchResult | null>(null)
  const [editLog, setEditLog] = useState<ExistingLog | null>(null)

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
    })
    setEditModalOpen(true)
  }

  const sorted = sortLogs(logs, sortKey)

  return (
    <div>
      {/* Filter tabs + sort */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(tab.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                activeStatus === tab.value
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              )}
            >
              {tab.emoji && <span>{tab.emoji}</span>}
              {tab.label}
              {tab.value === null && (
                <span className="ml-1 text-xs text-zinc-600">{totalCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        {logs.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
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

      {/* Grid */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <p className="text-zinc-500">
            {activeStatus
              ? `No games with status "${activeStatus}"`
              : "No games logged yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {sorted.map((log) => {
            const game = log.games
            if (!game) return null

            return (
              <div key={log.id} className="group relative">
                <Link href={`/game/${game.slug}`}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-800 shadow-md transition-transform group-hover:scale-[1.03]">
                    {game.cover_url ? (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-600">
                        {game.title}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-xs font-medium text-white leading-tight truncate">
                          {game.title}
                        </p>
                        {log.rating != null && log.rating > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-indigo-400 text-indigo-400" />
                            <span className="text-xs font-medium text-indigo-300">
                              {log.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Edit button for own profile */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCardClick(log) }}
                    className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
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
