"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"

interface GameCoverProps {
  slug: string
  title: string
  coverUrl: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showTitle?: boolean
}

const sizeClasses = {
  sm: "w-[70px]",
  md: "w-[125px]",
  lg: "w-[150px]",
  xl: "w-[230px]",
}

export function GameCover({
  slug,
  title,
  coverUrl,
  size = "md",
  className,
  showTitle = false,
}: GameCoverProps) {
  const router = useRouter()
  const prefetchedRef = useRef(false)

  const handlePrefetch = useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true

    // 1. Tell Next.js to prefetch the page route (JS bundle + RSC payload)
    router.prefetch(`/game/${slug}`)

    // 2. Warm the server-side game cache via a lightweight API call.
    //    This fires the Supabase cache check (or IGDB fetch + cache write)
    //    so that by the time the user clicks, the data is ready.
    fetch(`/api/games/prefetch?slug=${encodeURIComponent(slug)}`, {
      priority: 'low',
    }).catch(() => {})
  }, [router, slug])

  return (
    <Link
      href={`/game/${slug}`}
      className={cn("group relative block flex-shrink-0", sizeClasses[size], className)}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onFocus={handlePrefetch}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-zinc-800 border border-zinc-700/30 poster-hover">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes={size === "sm" ? "70px" : size === "md" ? "125px" : size === "lg" ? "150px" : "230px"}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-600">
            {title}
          </div>
        )}
        {/* Hover overlay with title */}
        {showTitle && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">
              {title}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}