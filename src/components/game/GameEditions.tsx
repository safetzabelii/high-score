"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Gamepad2 } from "lucide-react"

interface Edition {
  id: number
  name: string
  slug: string
  cover_url: string | null
  release_year: number | null
  category: number
  category_label: string
}

interface GameEditionsProps {
  gameId: number
}

export function GameEditions({ gameId }: GameEditionsProps) {
  const [editions, setEditions] = useState<Edition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/games/${gameId}/versions`)
      .then((res) => res.json())
      .then((data) => setEditions(data.editions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gameId])

  if (loading || editions.length === 0) return null

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="section-heading">DLC &amp; Editions</h3>
        <span className="text-[11px] text-zinc-500">{editions.length}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {editions.map((ed) => (
          <Link
            key={ed.id}
            href={`/game/${ed.slug}`}
            className="flex-shrink-0 group"
          >
            <div className="relative h-[120px] w-[80px] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover">
              {ed.cover_url ? (
                <Image
                  src={ed.cover_url}
                  alt={ed.name}
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
              {ed.name}
            </p>
            <p className="text-[9px] text-zinc-600">{ed.category_label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
