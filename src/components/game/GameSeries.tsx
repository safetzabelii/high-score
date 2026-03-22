"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Gamepad2 } from "lucide-react"

interface SeriesGame {
  id: number
  title: string
  slug: string
  cover_url: string | null
  release_year: number | null
}

interface GameSeriesProps {
  gameId: number
  collectionId: number | null
  franchiseId: number | null
}

export function GameSeries({ gameId, collectionId, franchiseId }: GameSeriesProps) {
  const [games, setGames] = useState<SeriesGame[]>([])
  const [seriesName, setSeriesName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!collectionId && !franchiseId) {
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (collectionId) params.set("collectionId", String(collectionId))
    if (franchiseId) params.set("franchiseId", String(franchiseId))

    fetch(`/api/games/${gameId}/series?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setGames(data.games ?? [])
        setSeriesName(data.seriesName ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId, collectionId, franchiseId])

  if (loading || games.length === 0) return null

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="section-heading">{seriesName ?? "Series"}</h3>
        <span className="text-[11px] text-zinc-500">{games.length} games</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/game/${g.slug}`}
            className="flex-shrink-0 group"
          >
            <div className="relative h-[120px] w-[80px] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover">
              {g.cover_url ? (
                <Image
                  src={g.cover_url}
                  alt={g.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-zinc-700" />
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors w-[80px] truncate">
              {g.title}
            </p>
            {g.release_year && (
              <p className="text-[9px] text-zinc-600 tabular-nums">{g.release_year}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
