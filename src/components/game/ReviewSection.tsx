"use client"

import { useState, useMemo } from "react"
import { ReviewCard } from "./ReviewCard"
import { cn } from "@/lib/utils"

type SortMode = "latest" | "top"

interface ReviewData {
  id: string
  user_id: string
  rating: number | null
  review_text: string | null
  platforms: string[]
  playtime_hours: number | null
  logged_date: string
  created_at: string
  contains_spoilers: boolean
  users: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

interface ReviewSectionProps {
  reviews: ReviewData[]
  currentUserId: string | null
  likedSet: Set<string>
  likeCountMap: Map<string, number>
  commentCountMap: Map<string, number>
}

export function ReviewSection({
  reviews,
  currentUserId,
  likedSet,
  likeCountMap,
  commentCountMap,
}: ReviewSectionProps) {
  const [sort, setSort] = useState<SortMode>("latest")

  const sorted = useMemo(() => {
    if (sort === "top") {
      return [...reviews].sort(
        (a, b) => (likeCountMap.get(b.id) ?? 0) - (likeCountMap.get(a.id) ?? 0)
      )
    }
    // "latest" — already sorted by created_at desc from the server
    return reviews
  }, [reviews, sort, likeCountMap])

  return (
    <div>
      {/* Sort tabs */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          {(["latest", "top"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider transition-colors",
                sort === mode
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {mode === "latest" ? "Latest" : "Top Liked"}
            </button>
          ))}
        </div>
      )}

      {/* Reviews */}
      {sorted.map((review) => (
        <ReviewCard
          key={review.id}
          review={review as any}
          currentUserId={currentUserId}
          initialLiked={likedSet.has(review.id)}
          initialLikeCount={likeCountMap.get(review.id) ?? 0}
          initialCommentCount={commentCountMap.get(review.id) ?? 0}
        />
      ))}
    </div>
  )
}
