"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpDown, Calendar, Heart, Clock, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BacklogItem {
  id: string
  game_id: number
  rating: number | null
  created_at: string
  game_title: string
  game_slug: string
  cover_url: string | null
  release_year: number | null
}

type SortKey = "added" | "title" | "year" | "rating"
type SortDir = "asc" | "desc"

interface BacklogManagerProps {
  initialLogs: BacklogItem[]
}

export function BacklogManager({ initialLogs }: BacklogManagerProps) {
  const [sortKey, setSortKey] = useState<SortKey>("added")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    const items = [...initialLogs]
    items.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "added":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "title":
          cmp = a.game_title.localeCompare(b.game_title)
          break
        case "year":
          cmp = (a.release_year ?? 0) - (b.release_year ?? 0)
          break
        case "rating":
          cmp = (a.rating ?? 0) - (b.rating ?? 0)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return items
  }, [initialLogs, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "title" ? "asc" : "desc")
    }
  }

  const sortButtons: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: "added", label: "Date Added", icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "title", label: "Title", icon: <ArrowUpDown className="h-3.5 w-3.5" /> },
    { key: "year", label: "Year", icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: "rating", label: "Rating", icon: <Heart className="h-3.5 w-3.5" /> },
  ]

  return (
    <div>
      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500">Sort by:</span>
        {sortButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => toggleSort(btn.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              sortKey === btn.key
                ? "bg-hs-green/20 text-hs-green border border-hs-green/30"
                : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200"
            )}
          >
            {btn.icon}
            {btn.label}
            {sortKey === btn.key && (
              <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Backlog grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sorted.map((item) => (
          <Link
            key={item.id}
            href={`/game/${item.game_slug}`}
            className="group rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-colors"
          >
            <div className="relative aspect-[3/4] bg-zinc-800">
              {item.cover_url ? (
                <Image
                  src={item.cover_url}
                  alt={item.game_title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-8 w-8 text-zinc-700" />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-tight">
                {item.game_title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                {item.release_year && <span>{item.release_year}</span>}
                {item.rating != null && item.rating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 fill-[#ff0055] text-[#ff0055]" />
                    {item.rating}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
