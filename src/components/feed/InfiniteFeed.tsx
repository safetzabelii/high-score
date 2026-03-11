"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { FeedCard } from "@/components/feed/FeedCard"

interface FeedEntry {
  id: string
  rating: number | null
  status: string
  review_text: string | null
  contains_spoilers: boolean
  platforms: string[]
  playtime_hours: number | null
  logged_date: string
  created_at: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  game_id: number
  game_title: string
  cover_url: string | null
  game_slug: string
  likeCount: number
  likedByMe: boolean
  commentCount: number
}

interface InfiniteFeedProps {
  initialEntries: FeedEntry[]
  initialCursor: string | null
  currentUserId: string
}

export function InfiniteFeed({
  initialEntries,
  initialCursor,
  currentUserId,
}: InfiniteFeedProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return
    setLoading(true)

    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`)
      const data = await res.json()
      if (data.entries?.length > 0) {
        setEntries((prev) => [...prev, ...data.entries])
      }
      setCursor(data.nextCursor ?? null)
    } catch {
      // Silently fail — user can scroll to trigger again
    } finally {
      setLoading(false)
    }
  }, [cursor, loading])

  useEffect(() => {
    if (!observerRef.current || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: "400px" }
    )

    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [cursor, loadMore])

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <FeedCard
          key={entry.id}
          entry={entry}
          currentUserId={currentUserId}
        />
      ))}

      {/* Sentinel for infinite scroll */}
      {cursor && (
        <div ref={observerRef} className="flex justify-center py-6">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />}
        </div>
      )}

      {!cursor && entries.length > 0 && (
        <p className="text-center text-sm text-zinc-600 py-4">
          You&apos;re all caught up!
        </p>
      )}
    </div>
  )
}
