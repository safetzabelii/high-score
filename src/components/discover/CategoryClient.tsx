"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Loader2, Heart } from "lucide-react"
import { BaseGame } from "@/components/discover/DiscoverClient"

const categoryTitles: Record<string, string> = {
  popular: "Popular This Week",
  recent: "New Releases",
  anticipated: "Highly Anticipated",
  topRated: "Highest Rated",
  community: "Trending in the Community",
  rpgs: "Top Role-Playing Games",
  indies: "Top Indie Games",
  shooters: "Top Shooters",
  adventure: "Top Adventure Games",
  strategy: "Top Strategy Games",
  platformers: "Top Platformers",
  fighting: "Top Fighting Games",
  racing: "Top Racing Games",
  sports: "Top Sports Games",
  simulators: "Top Simulators",
  puzzle: "Top Puzzle Games",
  arcade: "Arcade Classics",
  hiddenGems: "Hidden Gems",
  comingSoon: "Coming Soon",
}

export function CategoryClient({ 
  category, 
  initialGames, 
  initialHasMore 
}: { 
  category: string; 
  initialGames: BaseGame[];
  initialHasMore: boolean;
}) {
  const [games, setGames] = useState<BaseGame[]>(initialGames)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [offset, setOffset] = useState(initialGames.length)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    try {
      const res = await fetch(`/api/games/discover?category=${category}&limit=30&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        if (data.games && data.games.length > 0) {
          setGames((prev) => [...prev, ...data.games])
          setOffset((prev) => prev + data.games.length)
        }
        setHasMore(data.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Failed to load more games:", error)
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [category, offset, hasMore, isLoading])

  // Auto-load with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: "600px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const title = categoryTitles[category] || "Discover Games"

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link 
          href="/discover" 
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-4 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Discover
        </Link>
        <h1 className="text-3xl font-bold text-zinc-50">{title}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {games.map((game, i) => (
          <GameCard key={`${game.id}-${i}`} game={game} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-12 flex justify-center">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GameCard({ game }: { game: BaseGame }) {
  return (
    <Link href={`/game/${game.slug}`} className="group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 transition-transform poster-hover">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
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
