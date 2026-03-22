"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
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

export function GameLogGrid({ logs, activeStatus, username, isOwn, totalCount }: GameLogGridProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("date")

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
    })
    setEditModalOpen(true)
  }

  const sorted = sortLogs(logs, sortKey)

  return (
    <div>
      {/* Filter tabs + sort — Letterboxd-style underline tabs */}
      <div className="mb-5 flex items-center justify-between gap-4 flex-wrap border-b border-zinc-800/60">
        <div className="flex items-center gap-0 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(tab.value)}
              className={cn(
                "px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
                activeStatus === tab.value
                  ? "border-hs-green text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              )}
            >
              {tab.label}
              {tab.value === null && totalCount > 0 && (
                <span className="ml-1.5 text-xs text-zinc-600 font-mono tabular-nums">{totalCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        {logs.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 pb-2">
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

      {/* Grid — Letterboxd poster grid style */}
      {logs.length === 0 ? (
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
                      <svg viewBox="0 0 24 24" className="h-[10px] w-[10px]">
                        <clipPath id={`hh-${log.id}`}><rect x="0" y="0" width="12" height="24" /></clipPath>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 8.5 3c1.74 0 3.41.81 4.5 2.09C14.09 3.81 15.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff0055" clipPath={`url(#hh-${log.id})`} />
                      </svg>
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
